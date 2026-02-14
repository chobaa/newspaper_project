package com.newspaper.api_server.controller;

import com.newspaper.api_server.dto.ArticleResponse;
import com.newspaper.api_server.dto.ArticleSaveRequest;
import com.newspaper.api_server.service.ArticleService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

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

    // 기사 조회 (조회수 증가)
    @GetMapping("/api/articles/{id}")
    public ArticleResponse findById(@PathVariable Long id) {
        return articleService.getArticle(id);
    }

    // 기사 삭제
    @DeleteMapping("/api/articles/{id}")
    public void delete(@PathVariable Long id) {
        articleService.deleteArticle(id);
    }
}