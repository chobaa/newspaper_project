package com.newspaper.api_server.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.HeadObjectRequest;
import software.amazon.awssdk.services.s3.model.HeadObjectResponse;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;

import java.io.IOException;
import java.time.Duration;

@RestController
@RequiredArgsConstructor
public class ImageController {

    private final S3Client s3Client;

    /**
     * 업로드된 이미지는 UUID 파일명이라 내용이 바뀌지 않습니다.
     * 따라서 브라우저가 오래 캐싱해도 안전합니다(immutable).
     */
    private static final CacheControl IMAGE_CACHE_CONTROL =
            CacheControl.maxAge(Duration.ofDays(365)).cachePublic().immutable();

    @Value("${cloud.aws.s3.bucket:newspaper-bucket}")
    private String bucketName;

    /**
     * 업로드된 이미지를 백엔드가 프록시해서 내려주는 공개 엔드포인트
     * (S3/MinIO 버킷이 public 이 아니어도 동작)
     *
     * <p>ETag 를 먼저 확인해서, 브라우저가 이미 가진 이미지면 304 로 끝냅니다.
     * 이 경우 MinIO 에서 본문을 읽지 않으므로 네트워크와 JVM 힙을 모두 아낍니다.</p>
     */
    @GetMapping("/api/public/images/{fileName}")
    public ResponseEntity<byte[]> getImage(
            @PathVariable("fileName") String fileName,
            @RequestHeader(value = HttpHeaders.IF_NONE_MATCH, required = false) String ifNoneMatch
    ) throws IOException {

        HeadObjectResponse meta;
        try {
            meta = s3Client.headObject(HeadObjectRequest.builder()
                    .bucket(bucketName)
                    .key(fileName)
                    .build());
        } catch (NoSuchKeyException e) {
            return ResponseEntity.notFound().build();
        }

        String eTag = unquote(meta.eTag());

        // 브라우저가 가진 사본이 최신이면 본문 없이 304
        if (eTag != null && matchesETag(ifNoneMatch, eTag)) {
            return ResponseEntity.status(HttpStatus.NOT_MODIFIED)
                    .cacheControl(IMAGE_CACHE_CONTROL)
                    .eTag(eTag)
                    .build();
        }

        GetObjectRequest req = GetObjectRequest.builder()
                .bucket(bucketName)
                .key(fileName)
                .build();

        try (ResponseInputStream<GetObjectResponse> s3obj = s3Client.getObject(req)) {
            byte[] bytes = s3obj.readAllBytes();

            String contentType = meta.contentType();
            if (contentType == null || contentType.isBlank()) {
                contentType = MediaType.IMAGE_JPEG_VALUE;
            }

            ResponseEntity.BodyBuilder builder = ResponseEntity.ok()
                    .cacheControl(IMAGE_CACHE_CONTROL)
                    .contentType(MediaType.parseMediaType(contentType));

            if (eTag != null) builder.eTag(eTag);
            if (meta.lastModified() != null) builder.lastModified(meta.lastModified());

            return builder.body(bytes);
        } catch (NoSuchKeyException e) {
            return ResponseEntity.notFound().build();
        }
    }

    /** If-None-Match 는 여러 개가 콤마로 올 수 있고, W/ 접두사와 따옴표가 붙습니다. */
    static boolean matchesETag(String ifNoneMatch, String eTag) {
        if (ifNoneMatch == null || ifNoneMatch.isBlank()) return false;
        if ("*".equals(ifNoneMatch.trim())) return true;

        for (String candidate : ifNoneMatch.split(",")) {
            String normalized = unquote(candidate.trim());
            if (normalized != null && normalized.equals(eTag)) return true;
        }
        return false;
    }

    /** 따옴표와 약한 검증자(W/) 표기를 벗겨서 값만 남깁니다. */
    static String unquote(String value) {
        if (value == null) return null;
        String result = value.trim();
        if (result.startsWith("W/")) result = result.substring(2);
        if (result.length() >= 2 && result.startsWith("\"") && result.endsWith("\"")) {
            result = result.substring(1, result.length() - 1);
        }
        return result.isEmpty() ? null : result;
    }
}
