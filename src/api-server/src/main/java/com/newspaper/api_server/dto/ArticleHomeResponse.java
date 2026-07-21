package com.newspaper.api_server.dto;

import com.newspaper.api_server.domain.Article;
import java.time.LocalDateTime;

public record ArticleHomeResponse(
        Long id,
        String title,
        String category,
        String content,
        String writer,
        LocalDateTime regDate,
        Long viewCount
) {
    // 홈페이지에서는 본문을 통째로 보내지 않고, 앞부분만 잘라서 페이로드를 줄입니다.
    private static final int MAX_CONTENT_LENGTH = 8000;

    public static ArticleHomeResponse from(Article article) {
        String raw = article.getContent();
        String truncated = raw;
        if (raw != null && raw.length() > MAX_CONTENT_LENGTH) {
            truncated = raw.substring(0, MAX_CONTENT_LENGTH);
        }

        return new ArticleHomeResponse(
                article.getId(),
                article.getTitle(),
                article.getCategory(),
                truncated,
                article.getWriter(),
                article.getRegDate(),
                article.getViewcount()
        );
    }
}

