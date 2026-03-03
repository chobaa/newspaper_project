package com.newspaper.api_server.dto;

import java.util.List;

public record ArticleSaveRequest(
        String title,
        String category,
        String content,
        String writer,
        List<String> imageUrls
) {}
