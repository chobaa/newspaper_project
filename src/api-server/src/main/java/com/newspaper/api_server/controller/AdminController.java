package com.newspaper.api_server.controller;

import com.newspaper.api_server.dto.AgentConfigDto;
import com.newspaper.api_server.dto.ScheduleDto;
import com.newspaper.api_server.service.AgentConfigService;
import com.newspaper.api_server.service.AgentLogService;
import com.newspaper.api_server.service.ImageService;
import com.newspaper.api_server.service.ScheduleService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;

/**
 * 관리자 페이지 컨트롤러
 * - 에이전트 설정 관리
 * - 스케줄 설정 관리
 * - 로그 조회
 * - 관리자용 에셋(배너 이미지 등) 업로드/삭제
 */
@RestController
@RequiredArgsConstructor
public class AdminController {

    private final AgentConfigService agentConfigService;
    private final AgentLogService agentLogService;
    private final ScheduleService scheduleService;
    private final ImageService imageService;

    // ========== 에이전트 설정 ==========

    @GetMapping("/api/admin/agent-config")
    public AgentConfigDto getAll() {
        return new AgentConfigDto(
                agentConfigService.getAllowedSenderItems(),
                agentConfigService.getModificationKeywordItems());
    }

    @PostMapping("/api/admin/agent-config/senders")
    public Map<String, Long> addSender(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        if (email == null || email.isBlank()) {
            throw new IllegalArgumentException("email은 필수입니다.");
        }
        Long id = agentConfigService.addAllowedSender(email);
        return Map.of("id", id);
    }

    @DeleteMapping("/api/admin/agent-config/senders/{id}")
    public void removeSender(@PathVariable Long id) {
        agentConfigService.removeAllowedSender(id);
    }

    @PostMapping("/api/admin/agent-config/modification-keywords")
    public Map<String, Long> addModificationKeyword(@RequestBody Map<String, String> body) {
        String keyword = body.get("keyword");
        if (keyword == null || keyword.isBlank()) {
            throw new IllegalArgumentException("keyword는 필수입니다.");
        }
        Long id = agentConfigService.addModificationKeyword(keyword);
        return Map.of("id", id);
    }

    @DeleteMapping("/api/admin/agent-config/modification-keywords/{id}")
    public void removeModificationKeyword(@PathVariable Long id) {
        agentConfigService.removeModificationKeyword(id);
    }

    // ========== 에이전트 로그 ==========

    @GetMapping("/api/admin/agent-config/logs")
    public List<String> getLogs() {
        return agentLogService.getRecentLogs();
    }

    @DeleteMapping("/api/admin/agent-config/logs")
    public void clearLogs() {
        agentLogService.clear();
    }

    // ========== 스케줄 설정 ==========

    @GetMapping("/api/admin/schedule-config")
    public ScheduleDto.ScheduleConfigResponse getScheduleConfig() {
        return scheduleService.getScheduleConfig();
    }

    @PutMapping("/api/admin/schedule-config")
    public ScheduleDto.ScheduleConfigResponse updateScheduleConfig(
            @RequestBody ScheduleDto.ScheduleConfigUpdateRequest request) {
        return scheduleService.updateScheduleConfig(request);
    }

    @GetMapping("/api/admin/mail-process-logs")
    public List<ScheduleDto.MailProcessLogResponse> getMailProcessLogs(
            @RequestParam(defaultValue = "50") int limit) {
        return scheduleService.getRecentMailProcessLogs(limit);
    }

    @DeleteMapping("/api/admin/mail-process-logs")
    public void clearMailProcessLogs() {
        scheduleService.clearMailProcessLogs();
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
}