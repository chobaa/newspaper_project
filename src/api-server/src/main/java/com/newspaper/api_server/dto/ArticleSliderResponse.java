package com.newspaper.api_server.dto;

import java.util.List;

/** 사이드바 슬라이더용 (많이 본 뉴스 / 실시간 급상승) */
public record ArticleSliderResponse(
        List<ArticleSummaryResponse> popular,
        List<ArticleSummaryResponse> realtime
) {
}
