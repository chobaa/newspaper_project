package com.newspaper.api_server.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;

import java.io.IOException;

@RestController
@RequiredArgsConstructor
public class ImageController {

    private final S3Client s3Client;

    @Value("${cloud.aws.s3.bucket:newspaper-bucket}")
    private String bucketName;

    /**
     * 업로드된 이미지를 백엔드가 프록시해서 내려주는 공개 엔드포인트
     * (S3/MinIO 버킷이 public 이 아니어도 동작)
     */
    @GetMapping("/api/public/images/{fileName}")
    public ResponseEntity<byte[]> getImage(@PathVariable("fileName") String fileName) throws IOException {
        GetObjectRequest req = GetObjectRequest.builder()
                .bucket(bucketName)
                .key(fileName)
                .build();

        try (ResponseInputStream<GetObjectResponse> s3obj = s3Client.getObject(req)) {
            GetObjectResponse meta = s3obj.response();
            byte[] bytes = s3obj.readAllBytes();

            String contentType = meta.contentType();
            if (contentType == null || contentType.isBlank()) {
                contentType = MediaType.IMAGE_JPEG_VALUE;
            }

            return ResponseEntity
                    .ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .body(bytes);
        }
    }
}

