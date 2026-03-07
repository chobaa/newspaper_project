package com.newspaper.api_server.controller;

import com.newspaper.api_server.service.ImageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class ImageApiController {

    private final ImageService imageService;

    @PostMapping("/api/images")
    public ResponseEntity<?> upload(@RequestParam(value = "file", required = false) MultipartFile file) {
        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "파일이 없거나 비어 있습니다."));
        }
        try {
            String url = imageService.uploadImage(file);
            return ResponseEntity.ok().contentType(MediaType.TEXT_PLAIN).body(url);
        } catch (Exception e) {
            String message = e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName();
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of("error", "이미지 저장 실패", "detail", message));
        }
    }
}