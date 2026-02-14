package com.newspaper.api_server.controller;

import com.newspaper.api_server.service.MailFetcherService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * AI 기자 에이전트를 수동으로 실행하기 위한 컨트롤러.
 * - /api/agent/fetch 호출 시 즉시 메일을 확인하고 기사를 생성한다.
 */
@RestController
@RequiredArgsConstructor
public class AgentController {

    private final MailFetcherService mailFetcherService;

    @PostMapping("/api/agent/fetch")
    public Map<String, Integer> fetchNow() {
        int created = mailFetcherService.fetchAndCreateArticles();
        return Map.of("created", created);
    }
}

