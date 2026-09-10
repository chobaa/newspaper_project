package com.newspaper.api_server.dto;

import java.util.List;

/**
 * 홈 화면 1회 요청용 응답.
 * 헤드라인과 카테고리별 위젯 기사를 함께 담아, 카테고리마다 항상 정해진 건수가 채워지도록 합니다.
 */
public record HomeSectionsResponse(
        List<ArticleSummaryResponse> headlines,
        List<CategorySection> sections
) {
    public record CategorySection(String category, List<ArticleSummaryResponse> articles) {
    }
}
