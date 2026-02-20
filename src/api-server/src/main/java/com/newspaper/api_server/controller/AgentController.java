package com.newspaper.api_server.controller;

import com.newspaper.api_server.domain.MailProcessLog;
import com.newspaper.api_server.dto.ArticleSaveRequest;
import com.newspaper.api_server.dto.ScheduleDto;
import com.newspaper.api_server.service.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequiredArgsConstructor
@Slf4j
public class AgentController {

    private final MailFetcherService mailFetcherService;
    private final GeminiService geminiService;
    private final ScheduleService scheduleService;
    private final ArticleService articleService;

    @PostMapping("/api/agent/fetch")
    public ScheduleDto.FetchResultResponse fetchNow() {
        return mailFetcherService.fetchAndCreateArticles();
    }

    /**
     * AI summary endpoint - accepts imageMaxWidth from frontend display settings
     */
    @PostMapping("/api/agent/ai-summary/{logId}")
    public ResponseEntity<?> aiSummary(
            @PathVariable Long logId,
            @RequestParam(required = false, defaultValue = "400px") String imageMaxWidth) {

        if (!geminiService.isAvailable()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Gemini API is not configured. Add GEMINI_API_KEY to .env"));
        }

        MailProcessLog processLog = scheduleService.findMailProcessLog(logId);
        if (processLog == null) {
            return ResponseEntity.notFound().build();
        }

        try {
            GeminiService.ArticleResult result = geminiService.generateArticle(
                    processLog.getSubject(),
                    null,
                    null,
                    processLog.getImageFileNames(),
                    imageMaxWidth);

            if (result == null) {
                return ResponseEntity.internalServerError()
                        .body(Map.of("error", "Gemini failed to generate article"));
            }

            ScheduleDto.ScheduleConfigResponse config = scheduleService.getScheduleConfig();
            String reporterName = (config.defaultWriter() != null) ? config.defaultWriter() : "AI Reporter";

            ArticleSaveRequest request = new ArticleSaveRequest(
                    result.title(),
                    result.category(),
                    result.content(),
                    reporterName,
                    processLog.getImageFileNames());

            Long articleId = articleService.saveArticle(request);
            scheduleService.updateMailProcessLogArticle(logId, articleId);

            log.info("AI summary article created. logId={}, articleId={}, title={}", logId, articleId, result.title());

            return ResponseEntity.ok(Map.of(
                    "articleId", articleId,
                    "title", result.title(),
                    "category", result.category()));

        } catch (Exception e) {
            log.error("AI summary failed. logId={}", logId, e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "AI article generation error: " + e.getMessage()));
        }
    }
}
