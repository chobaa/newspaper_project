package com.newspaper.api_server.controller;

import com.newspaper.api_server.service.ImageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
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

    /**
     * 프론트에서 작성 중이던 기사를 취소할 때,
     * 이미 업로드된 이미지(URL 기준)를 정리하기 위한 엔드포인트.
     * - 다른 기사에서 재사용하지 않는, "이번 작성 세션에서만" 올린 이미지들을 대상으로 사용해야 한다.
     */
    @PostMapping("/api/images/cleanup")
    public ResponseEntity<?> cleanup(@RequestBody Map<String, List<String>> body) {
        List<String> urls = body != null ? body.get("urls") : null;
        if (urls == null || urls.isEmpty()) {
            return ResponseEntity.ok().build();
        }
        for (String url : urls) {
            try {
                imageService.deleteImageByUrl(url);
            } catch (Exception ignored) {
                // 일부 삭제 실패는 전체 요청을 실패로 돌리지 않고 무시
            }
        }
        return ResponseEntity.ok().build();
    }
}