package com.newspaper.api_server.dto;

import java.util.List;

/** 서버 페이지네이션 결과 (목록 + 전체 건수) */
public record ArticlePageResponse(
        List<ArticleSummaryResponse> items,
        long total,
        int page,
        int size,
        int totalPages
) {
    public static ArticlePageResponse of(List<ArticleSummaryResponse> items, long total, int page, int size) {
        int totalPages = size > 0 ? (int) Math.max(1, Math.ceil((double) total / size)) : 1;
        return new ArticlePageResponse(items, total, page, size, totalPages);
    }
}
