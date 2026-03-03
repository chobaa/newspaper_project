package com.newspaper.api_server.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Getter
@NoArgsConstructor
public class Article {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id; // PK

    @Column(nullable = false)
    private String title; // 제목

    private String category; // 카테고리 (정치, 경제 등)

    @Lob
    @Column(columnDefinition = "LONGTEXT")
    private String content; // 본문

    private String writer; // 기자명

    private LocalDateTime regDate = LocalDateTime.now(); // 작성된 시간

    private Long viewcount = 0L;

    // 기사 하나에 사진 여러 개가 가능하도록 구성 (1 : N)
    // orphanRemoval = true 로 이미지 목록을 교체하면 기존 이미지는 자동 삭제
    @OneToMany(mappedBy = "article", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Image> images = new ArrayList<>();

    public Article(String title, String category, String content, String writer) {
        this.title = title;
        this.category = category;
        this.content = content;
        this.writer = writer;
    }

    public void addImage(Image image) {
        this.images.add(image);
    }

    public void clearImages() {
        this.images.clear();
    }

    public void increaseViewCount() {
        this.viewcount++;
    }

    public void updateContent(String newContent) {
        this.content = newContent;
    }

    public void updateBasic(String title, String category, String content, String writer) {
        this.title = title;
        this.category = category;
        this.content = content;
        this.writer = writer;
    }
}