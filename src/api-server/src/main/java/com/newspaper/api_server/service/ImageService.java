package com.newspaper.api_server.service;

import com.newspaper.api_server.domain.BrandSettings;
import com.newspaper.api_server.domain.Image;
import com.newspaper.api_server.repository.BrandSettingsRepository;
import com.newspaper.api_server.repository.ImageRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.io.IOException;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ImageService {

    private final S3Client s3Client;
    private final ImageRepository imageRepository;
    private final BrandSettingsRepository brandSettingsRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${cloud.aws.s3.bucket:newspaper-bucket}")
    private String bucketName;

    /**
     * 공통 업로드 로직 (MultipartFile 이 아닌 byte[] 기반)
     * - 웹 컨트롤러와 메일 에이전트에서 모두 사용 가능
     */
    public String uploadImage(byte[] bytes, String originalFilename, String contentType) {
        String safeName = "image";
        if (originalFilename != null && !originalFilename.isBlank()) {
            int dot = originalFilename.lastIndexOf('.');
            if (dot >= 0 && dot < originalFilename.length() - 1) {
                // 확장자만 소문자로 추출 (jpg, png 등)
                String ext = originalFilename.substring(dot + 1).toLowerCase();
                // 알파벳/숫자만 허용, 아니면 jpg로 강제
                if (!ext.matches("[a-z0-9]+")) {
                    ext = "jpg";
                }
                safeName = "image." + ext;
            }
        }
        String fileName = UUID.randomUUID() + "-" + safeName;

        s3Client.putObject(
                PutObjectRequest.builder()
                        .bucket(bucketName)
                        .key(fileName)
                        .contentType(contentType != null ? contentType : "image/jpeg")
                        .build(),
                RequestBody.fromBytes(bytes)
        );

        // 업로드된 이미지를 백엔드가 프록시해서 제공하는 공개 URL
        // (프론트엔드는 /api/public/images/{fileName} 경로로 이미지를 조회)
        return "/api/public/images/" + fileName;
    }

    // 기존 MultipartFile 업로드는 공통 로직을 감싸는 형태로 유지
    public String uploadImage(MultipartFile file) throws IOException {
        return uploadImage(file.getBytes(), file.getOriginalFilename(), file.getContentType());
    }

    /**
     * 업로드된 이미지 URL을 받아 S3/MinIO에서 삭제
     */
    public void deleteImageByUrl(String url) {
        if (url == null || url.isBlank()) {
            return;
        }
        // URL 마지막 구분자 뒤를 key 로 사용 (예: http://..../bucket/key)
        String key = url.substring(url.lastIndexOf('/') + 1);
        s3Client.deleteObject(DeleteObjectRequest.builder()
                .bucket(bucketName)
                .key(key)
                .build());
    }

    /**
     * DB에 등록되지 않은 이미지 객체들을 버킷에서 일괄 정리한다.
     * - 기사 이미지(Image 엔티티의 url)
     * - 브랜드 설정(로고/배너)의 이미지 URL
     * 두 곳에서 사용 중인 키를 모두 수집한 뒤, 나머지를 삭제 대상으로 본다.
     *
     * @return 삭제된 객체 수
     */
    public int cleanupOrphanObjects() {
        java.util.Set<String> usedKeys = new java.util.HashSet<>();

        // 1) 기사 이미지 테이블에서 사용 중인 키 수집
        for (Image img : imageRepository.findAll()) {
            addKeyFromUrl(img.getUrl(), usedKeys);
        }

        // 2) 브랜드 설정에서 사용 중인 키 수집 (로고/배너)
        for (BrandSettings s : brandSettingsRepository.findAll()) {
            addKeyFromUrl(s.getLogoImageUrl(), usedKeys);
            addKeysFromBannerField(s.getSidebarTopImageUrl(), usedKeys);
            addKeysFromBannerField(s.getSidebarLongImageUrl(), usedKeys);
            addKeysFromBannerField(s.getBottomBannerImageUrl(), usedKeys);
        }

        int deletedTotal = 0;
        String continuationToken = null;

        do {
            var reqBuilder = software.amazon.awssdk.services.s3.model.ListObjectsV2Request.builder()
                    .bucket(bucketName)
                    .maxKeys(1000);
            if (continuationToken != null) {
                reqBuilder.continuationToken(continuationToken);
            }

            var res = s3Client.listObjectsV2(reqBuilder.build());

            java.util.List<software.amazon.awssdk.services.s3.model.ObjectIdentifier> toDelete =
                    new java.util.ArrayList<>();

            res.contents().forEach(o -> {
                String key = o.key();
                if (!usedKeys.contains(key)) {
                    toDelete.add(software.amazon.awssdk.services.s3.model.ObjectIdentifier.builder()
                            .key(key)
                            .build());
                }
            });

            if (!toDelete.isEmpty()) {
                var delReq = software.amazon.awssdk.services.s3.model.DeleteObjectsRequest.builder()
                        .bucket(bucketName)
                        .delete(software.amazon.awssdk.services.s3.model.Delete.builder()
                                .objects(toDelete)
                                .build())
                        .build();
                var delRes = s3Client.deleteObjects(delReq);
                deletedTotal += delRes.deleted().size();
            }

            continuationToken = res.isTruncated() ? res.nextContinuationToken() : null;
        } while (continuationToken != null);

        return deletedTotal;
    }

    private static void addKeyFromUrl(String url, java.util.Set<String> out) {
        if (url == null) return;
        String trimmed = url.trim();
        if (trimmed.isEmpty()) return;
        // JSON 문자열이 들어오면 여기로 오면 안 됨 (배너 필드는 addKeysFromBannerField 사용)
        if (trimmed.startsWith("[") || trimmed.startsWith("{")) return;
        // '/api/public/images/{key}' 또는 전체 URL 중 마지막 '/' 뒤를 key 로 사용
        int idx = trimmed.lastIndexOf('/');
        String key = (idx >= 0 && idx < trimmed.length() - 1) ? trimmed.substring(idx + 1) : trimmed;
        out.add(key);
    }

    /**
     * 배너 필드는 "단일 URL 문자열" 또는 "[{imageUrl, ...}, ...]" 형태의 JSON 문자열일 수 있다.
     * JSON이면 imageUrl 값들을 모두 추출해 usedKeys에 반영한다.
     */
    private void addKeysFromBannerField(String raw, java.util.Set<String> out) {
        if (raw == null) return;
        String trimmed = raw.trim();
        if (trimmed.isEmpty()) return;

        // 단일 URL 문자열인 경우
        if (!(trimmed.startsWith("[") || trimmed.startsWith("{"))) {
            addKeyFromUrl(trimmed, out);
            return;
        }

        // JSON 배열/객체인 경우 imageUrl만 수집
        try {
            JsonNode node = objectMapper.readTree(trimmed);
            if (node == null) return;

            if (node.isArray()) {
                for (JsonNode item : node) {
                    if (item == null || !item.isObject()) continue;
                    JsonNode imageUrl = item.get("imageUrl");
                    if (imageUrl != null && imageUrl.isTextual()) {
                        addKeyFromUrl(imageUrl.asText(), out);
                    }
                }
            } else if (node.isObject()) {
                // 혹시 단일 객체로 저장된 경우도 방어
                JsonNode imageUrl = node.get("imageUrl");
                if (imageUrl != null && imageUrl.isTextual()) {
                    addKeyFromUrl(imageUrl.asText(), out);
                }
            }
        } catch (Exception ignored) {
            // 파싱 실패하면 안전하게 "삭제하지 않도록" 아무 키도 추가하지 않는다.
            // (정리 정확도를 희생하더라도 배너/로고를 잘못 삭제하는 사고를 방지)
        }
    }
}