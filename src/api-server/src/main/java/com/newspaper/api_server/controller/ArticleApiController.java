package com.newspaper.api_server.controller;

import com.newspaper.api_server.dto.ArticleSaveRequest;
import com.newspaper.api_server.service.ArticleService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType; // 이 import가 있어야 합니다!
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestPart; // 이것도 필수!
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@RestController
@RequiredArgsConstructor
public class ArticleApiController {

    private final ArticleService articleService;

    @PostMapping(value = "/api/articles", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Long save(
            @RequestPart("request") ArticleSaveRequest request,
            @RequestPart(value = "files", required = false) List<MultipartFile> files
    ) throws IOException {
        return articleService.saveArticle(request, files);
    }
}