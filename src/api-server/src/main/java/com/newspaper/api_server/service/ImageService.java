package com.newspaper.api_server.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
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
	 * - 웹 컨트롤러와 내부 에이전트에서 모두 재사용 가능
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

		// 업로드된 이미지의 URL 반환
		return "http://localhost:9000/" + bucketName + "/" + fileName;
	}

	// 기존 MultipartFile 업로드는 공통 로직을 감싸는 형태로 유지
	public String uploadImage(MultipartFile file) throws IOException {
		return uploadImage(file.getBytes(), file.getOriginalFilename(), file.getContentType());
	}
}