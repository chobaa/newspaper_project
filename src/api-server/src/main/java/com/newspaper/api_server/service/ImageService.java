package com.newspaper.api_server.service;

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

    @Value("${cloud.aws.s3.bucket:newspaper-bucket}")
    private String bucketName;

    /**
     * 공통 업로드 로직 (MultipartFile 이 아닌 byte[] 기반)
     * - 웹 컨트롤러와 메일 에이전트에서 모두 사용 가능
     */
    public String uploadImage(byte[] bytes, String originalFilename, String contentType) {
        String safeOriginalName = (originalFilename != null) ? originalFilename : "image";
        String fileName = UUID.randomUUID() + "-" + safeOriginalName;

        s3Client.putObject(
                PutObjectRequest.builder()
                        .bucket(bucketName)
                        .key(fileName)
                        .contentType(contentType)
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
}