package com.newspaper.api_server.dto;

import com.newspaper.api_server.domain.Article;
import com.newspaper.api_server.domain.Image;
import java.time.LocalDateTime;
import java.util.List;

public record ArticleResponse(
        Long id,
        String title,
        String category,
        String content,
        String writer,
        LocalDateTime regDate,
        Long viewCount, // 조회수
        List<String> imageUrls // 이미지 주소들
) {
    public static ArticleResponse from(Article article) {
        List<String> urls = article.getImages().stream()
                .map(Image::getUrl)
                .toList();

        return new ArticleResponse(
                article.getId(),
                article.getTitle(),
                article.getCategory(),
                article.getContent(),
                article.getWriter(),
                article.getRegDate(),
                article.getViewcount(),
                urls
        );
    }
}