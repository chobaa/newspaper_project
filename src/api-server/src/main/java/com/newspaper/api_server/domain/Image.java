package com.newspaper.api_server.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@NoArgsConstructor
public class Image {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(length = 512)
    private String url; // MinIO 공개 URL 또는 /api/public/images/... 형태

    @Column(length = 256)
    private String originalFileName; // 사용자가 올린 원래 파일명 (예: photo.jpg)

    @ManyToOne(fetch = FetchType.LAZY) // 필요할 때만 기사 정보를 가져온다 (성능 최적화)
    @JoinColumn(name = "article_id") // DB 테이블에 'article_id'라는 컬럼(FK)을 만들어라
    private Article article;

    public Image(String url, String originalFileName, Article article) {
        this.url = url;
        this.originalFileName = originalFileName;
        this.article = article;
    }
}