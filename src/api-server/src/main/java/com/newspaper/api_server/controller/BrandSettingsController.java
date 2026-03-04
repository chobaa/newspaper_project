package com.newspaper.api_server.controller;

import com.newspaper.api_server.service.BrandSettingsService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * 브랜드 설정 API (공개)
 * - GET /api/brand-settings/{brandId}: 프론트엔드에서 로고/배너 설정 로드
 */
@RestController
@RequiredArgsConstructor
public class BrandSettingsController {

    private final BrandSettingsService brandSettingsService;

    @GetMapping("/api/brand-settings/{brandId}")
    public Map<String, Object> getBrandSettings(@PathVariable String brandId) {
        return brandSettingsService.getSettings(brandId);
    }
}
