package com.newspaper.api_server.controller;

import com.newspaper.api_server.service.BrandSettingsService;
import com.newspaper.api_server.service.ImageService;
import com.newspaper.api_server.support.AdminTokenService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Map;

/**
 * 관리자 페이지 컨트롤러
 * - 관리자 로그인 (토큰 발급)
 * - 관리자용 에셋(배너 이미지 등) 업로드/삭제
 * - 고아 이미지 정리
 * - 브랜드 설정
 */
@RestController
@RequiredArgsConstructor
public class AdminController {

    private final ImageService imageService;
    private final BrandSettingsService brandSettingsService;
    private final AdminTokenService adminTokenService;

    @Value("${admin.username:admin}")
    private String adminUsername;

    @Value("${admin.password:8593}")
    private String adminPassword;

    // ========== 관리자 로그인 ==========

    /**
     * 로그인에 성공하면 관리자 토큰을 발급합니다.
     * 이후 쓰기·관리자 API 는 {@code Authorization: Bearer <token>} 헤더를 요구합니다.
     */
    @PostMapping("/api/admin/login")
    public Map<String, String> adminLogin(@RequestBody Map<String, String> body) {
        String id = body.get("id");
        String password = body.get("password");

        // 계정 정보는 환경변수(.env)로 관리합니다. equals 대신 상수 시간 비교를 사용합니다.
        if (constantTimeEquals(adminUsername, id) && constantTimeEquals(adminPassword, password)) {
            return Map.of("result", "OK", "token", adminTokenService.issue(adminUsername));
        }
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "invalid credentials");
    }

    private static boolean constantTimeEquals(String expected, String actual) {
        if (expected == null || actual == null) return false;
        return MessageDigest.isEqual(
                expected.getBytes(StandardCharsets.UTF_8),
                actual.getBytes(StandardCharsets.UTF_8));
    }

    // ========== 관리자 에셋(배너/로고 이미지) 업로드/삭제 ==========

    @PostMapping(
            value = "/api/admin/brand-assets",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    public Map<String, String> uploadBrandAsset(@RequestParam("file") MultipartFile file) throws IOException {
        String url = imageService.uploadImage(file);
        return Map.of("url", url);
    }

    @DeleteMapping("/api/admin/brand-assets")
    public void deleteBrandAsset(@RequestParam("url") String url) {
        imageService.deleteImageByUrl(url);
    }

    // ========== 이미지 정리 (고아 객체 청소) ==========

    /**
     * DB(기사 이미지 + 브랜드 설정)에서 사용되지 않는 S3/MinIO 객체를 일괄 삭제한다.
     * 관리자 탭에서 수동으로 실행하는 용도.
     */
    @PostMapping("/api/admin/cleanup-orphan-images")
    public Map<String, Integer> cleanupOrphanImages() {
        int deleted = imageService.cleanupOrphanObjects();
        return Map.of("deleted", deleted);
    }

    // ========== 브랜드 설정 (로고/배너) ==========

    @PutMapping("/api/admin/brand-settings")
    public Map<String, Object> updateBrandSettings(@RequestBody Map<String, Object> body) {
        String brandId = (String) body.get("brandId");
        if (brandId == null || brandId.isBlank()) {
            throw new IllegalArgumentException("brandId는 필수입니다.");
        }
        return brandSettingsService.updateSettings(brandId, body);
    }
}
