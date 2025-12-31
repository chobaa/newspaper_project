package com.newspaper.api_server.controller;

import com.newspaper.api_server.dto.ArticleSaveRequest;
import com.newspaper.api_server.service.ArticleService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class ArticleApiController {

    private final ArticleService articleService;

    // POST http://localhost:8080/api/articles
    @PostMapping("/api/articles")
    public Long save(@RequestBody ArticleSaveRequest request) {
        return articleService.saveArticle(request);
    }
}