package com.newspaper.api_server.dto;

// 프론트엔드에서 보낼 JSON 데이터 모양 정의
public record ArticleSaveRequest(
        String title,
        String content,
        String writer
) {}