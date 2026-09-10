package com.newspaper.api_server.controller;

import com.newspaper.api_server.dto.ArticlePageResponse;
import com.newspaper.api_server.dto.ArticleResponse;
import com.newspaper.api_server.dto.ArticleHomeResponse;
import com.newspaper.api_server.dto.ArticleSaveRequest;
import com.newspaper.api_server.dto.ArticleSliderResponse;
import com.newspaper.api_server.dto.ArticleSummaryResponse;
import com.newspaper.api_server.dto.HomeSectionsResponse;
import com.newspaper.api_server.service.ArticleService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.List;

@RestController
@RequiredArgsConstructor
public class ArticleApiController {

    private final ArticleService articleService;

    // 기사 저장 (JSON)
    @PostMapping("/api/articles")
    public Long save(@RequestBody ArticleSaveRequest request) {
        return articleService.saveArticle(request);
    }

    // 전체 기사 목록 조회
    @GetMapping("/api/articles")
    public List<ArticleResponse> findAll() {
        return articleService.getArticles();
    }

    // 홈페이지용 요약 기사 목록 조회 (페이로드 축소: content 앞부분만)
    @GetMapping("/api/articles/home")
    public List<ArticleHomeResponse> findHome(@RequestParam(defaultValue = "80") int limit) {
        return articleService.getHomeArticles(limit);
    }

    // 홈 화면 위젯용: 헤드라인 + 카테고리별 기사 (카테고리마다 항상 perCategory 건)
    @GetMapping("/api/articles/home-sections")
    public HomeSectionsResponse findHomeSections(
            @RequestParam(required = false) String categories,
            @RequestParam(defaultValue = "3") int perCategory,
            @RequestParam(defaultValue = "5") int headlines) {
        return articleService.getHomeSections(splitCategories(categories), perCategory, headlines);
    }

    // 카테고리 목록 / 검색 결과용: 서버 페이지네이션 + 요약 응답
    @GetMapping("/api/articles/summary")
    public ArticlePageResponse findSummaries(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "titleAndContent") String searchType,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size) {
        return articleService.getArticleSummaries(category, keyword, searchType, page, size);
    }

    // 사이드바 슬라이더용 (많이 본 뉴스 / 실시간 급상승)
    @GetMapping("/api/articles/slider")
    public ArticleSliderResponse findSlider(@RequestParam(defaultValue = "5") int limit) {
        return articleService.getSliderArticles(limit);
    }

    // 상세 페이지 추천 뉴스 (같은 카테고리 최신순)
    @GetMapping("/api/articles/{id}/related")
    public List<ArticleSummaryResponse> findRelated(
            @PathVariable Long id,
            @RequestParam(defaultValue = "3") int limit) {
        return articleService.getRelatedArticles(id, limit);
    }

    // 기사 조회 (조회수 증가)
    @GetMapping("/api/articles/{id}")
    public ArticleResponse findById(@PathVariable Long id) {
        return articleService.getArticle(id);
    }

    // 기사 수정
    @PutMapping("/api/articles/{id}")
    public void update(@PathVariable Long id, @RequestBody ArticleSaveRequest request) {
        articleService.updateArticle(id, request);
    }

    // 기사 삭제
    @DeleteMapping("/api/articles/{id}")
    public void delete(@PathVariable Long id) {
        articleService.deleteArticle(id);
    }

    private List<String> splitCategories(String categories) {
        if (categories == null || categories.isBlank()) return List.of();
        return Arrays.stream(categories.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();
    }
}
