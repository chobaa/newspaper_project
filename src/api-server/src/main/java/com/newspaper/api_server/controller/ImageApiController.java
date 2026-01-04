package com.newspaper.api_server.controller;

import com.newspaper.api_server.service.ImageService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@RestController
@RequiredArgsConstructor
public class ImageApiController {

    private final ImageService imageService;

    // 드래그 앤 드롭 시 호출: 파일 -> URL 변환
    @PostMapping("/api/images")
    public String upload(@RequestParam("file") MultipartFile file) throws IOException {
        return imageService.uploadImage(file);
    }
}