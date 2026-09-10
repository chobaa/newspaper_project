package com.newspaper.api_server.dto;

import com.newspaper.api_server.domain.Article;
import com.newspaper.api_server.support.ArticleSummarizer;

import java.time.LocalDateTime;

/**
 * 목록/위젯용 경량 DTO.
 * 본문(content)은 포함하지 않고, 카드에 필요한 요약문과 썸네일만 담습니다.
 */
public record ArticleSummaryResponse(
        Long id,
        String title,
        String category,
        String writer,
        LocalDateTime regDate,
        Long viewCount,
        String summary,
        String thumbnailUrl,
        boolean videoThumbnail
) {
    public static ArticleSummaryResponse from(Article article) {
        ArticleSummarizer.Thumbnail thumbnail = ArticleSummarizer.thumbnail(article.getContent());

        return new ArticleSummaryResponse(
                article.getId(),
                article.getTitle(),
                article.getCategory(),
                article.getWriter(),
                article.getRegDate(),
                article.getViewcount(),
                ArticleSummarizer.summarize(article.getContent()),
                thumbnail.url(),
                thumbnail.video()
        );
    }
}
