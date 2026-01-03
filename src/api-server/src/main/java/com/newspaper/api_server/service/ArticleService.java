package com.newspaper.api_server.service;

import com.newspaper.api_server.domain.Article;
import com.newspaper.api_server.domain.Image;
import com.newspaper.api_server.dto.ArticleSaveRequest;
import com.newspaper.api_server.repository.ArticleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ArticleService {

    private final ArticleRepository articleRepository;
    private final S3Client s3Client; // 아까 만든 S3 도구 주입

    @Value("${cloud.aws.s3.bucket:newspaper-bucket}") // 버킷 이름 (없으면 기본값 사용)
    private String bucketName;

    @Transactional
    public Long saveArticle(ArticleSaveRequest request, List<MultipartFile> files) throws IOException {
        // 1. 기사(텍스트) 먼저 생성
        Article article = new Article(
                request.title(),
                request.content(),
                request.writer()
        );

        // 2. 파일이 있다면 S3에 업로드하고 Image 엔티티 만들기
        if (files != null && !files.isEmpty()) {
            for (MultipartFile file : files) {
                if (file.isEmpty()) continue;

                // 2-1. 파일명 중복 방지를 위해 UUID 붙이기 (ex: uuid-originalName.jpg)
                String fileName = UUID.randomUUID() + "-" + file.getOriginalFilename();

                // 2-2. S3(MinIO)로 전송
                s3Client.putObject(
                        PutObjectRequest.builder()
                                .bucket(bucketName)
                                .key(fileName)
                                .contentType(file.getContentType())
                                .build(),
                        RequestBody.fromInputStream(file.getInputStream(), file.getSize())
                );

                // 2-3. 업로드된 URL 만들기
                // (주의: 실제 운영에선 CloudFront 등을 쓰지만, 지금은 MinIO 주소 그대로 사용)
                String fileUrl = "http://localhost:9000/" + bucketName + "/" + fileName;

                // 2-4. 기사에 이미지 추가 (Article.java에 만든 images 리스트에 추가)
                Image image = new Image(fileUrl, file.getOriginalFilename(), article);
                article.getImages().add(image);
            }
        }

        // 3. 기사 저장 (Cascade 설정 덕분에 이미지들도 같이 저장됨)
        Article savedArticle = articleRepository.save(article);

        return savedArticle.getId();
    }
}