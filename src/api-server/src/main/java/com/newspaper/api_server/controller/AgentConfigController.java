package com.newspaper.api_server.controller;

import com.newspaper.api_server.dto.AgentConfigDto;
import com.newspaper.api_server.service.AgentConfigService;
import com.newspaper.api_server.service.AgentLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class AgentConfigController {

    private final AgentConfigService agentConfigService;
    private final AgentLogService agentLogService;

    @GetMapping("/api/admin/agent-config")
    public AgentConfigDto getAll() {
        return new AgentConfigDto(
                agentConfigService.getAllowedSenderItems(),
                agentConfigService.getModificationKeywordItems()
        );
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

    @GetMapping("/api/admin/agent-config/logs")
    public List<String> getLogs() {
        return agentLogService.getRecentLogs();
    }

    @DeleteMapping("/api/admin/agent-config/logs")
    public void clearLogs() {
        agentLogService.clear();
    }
}
