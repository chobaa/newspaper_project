package com.newspaper.api_server.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.List;
import java.util.Map;

@Service
@Slf4j
public class GeminiService {

    @Value("${gemini.api-key:}")
    private String apiKey;

    @Value("${gemini.model:gemini-2.0-flash}")
    private String model;

    @Value("${gemini.enabled:true}")
    private boolean enabled;

    private final WebClient webClient;
    private final ObjectMapper objectMapper;

    public GeminiService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        this.webClient = WebClient.builder()
                .baseUrl("https://generativelanguage.googleapis.com")
                .build();
    }

    public boolean isAvailable() {
        return enabled && apiKey != null && !apiKey.isBlank();
    }

    public ArticleResult generateArticle(String mailSubject, String mailBodyText,
            String extractedText, List<String> imageUrls,
            String imageMaxWidth) {
        if (!isAvailable())
            return null;

        String prompt = buildPrompt(mailSubject, mailBodyText, extractedText, imageUrls, imageMaxWidth);
        try {
            String responseBody = callGeminiApi(prompt);
            return parseResponse(responseBody, mailSubject);
        } catch (Exception e) {
            log.error("Gemini API Error", e);
            return null;
        }
    }

    private String buildPrompt(String mailSubject, String mailBodyText, String extractedText, List<String> imageUrls,
            String imgWidth) {
        String width = (imgWidth != null && !imgWidth.isBlank()) ? imgWidth : "400px";
        StringBuilder sb = new StringBuilder();
        sb.append("당신은 전문 신문 편집자입니다. 아래 보도자료를 신문 기사 형식으로 편집해주세요.\n\n");
        sb.append("## 규칙\n");
        sb.append("1. 원문 내용을 최대한 보존하세요. 사실 관계를 변경하지 마세요.\n");
        sb.append("2. 반드시 아래 JSON 형식으로만 응답하세요.\n");
        sb.append("3. 기사 본문은 HTML 형식으로 작성 (<p>, <h3>, <strong>, <ul>, <li>).\n");
        sb.append("4. 이미지가 있으면 본문 맨 앞(첫 번째 p 태그 앞)에 배치하세요.\n");
        sb.append("5. 이미지는 왼쪽 상단(float:left)에 배치하고 max-width를 ").append(width).append("로 지정하세요.\n");
        sb.append("   예: <img src=\"...\" style=\"float:left; max-width:").append(width)
                .append("; margin:0 16px 12px 0;\" />\n\n");

        sb.append("## 응답 JSON 형식\n");
        sb.append("```json\n{\n  \"title\": \"제목\",\n  \"category\": \"카테고리\",\n  \"content\": \"본문HTML\"\n}\n```\n\n");

        sb.append("## 보도자료 정보\n");
        sb.append("제목: ").append(mailSubject).append("\n\n");
        if (mailBodyText != null)
            sb.append("메일본문: ").append(mailBodyText.substring(0, Math.min(mailBodyText.length(), 3000))).append("\n\n");
        if (extractedText != null)
            sb.append("추출본문: ").append(extractedText.substring(0, Math.min(extractedText.length(), 5000)))
                    .append("\n\n");
        if (imageUrls != null && !imageUrls.isEmpty()) {
            sb.append("이미지목록:\n");
            for (String url : imageUrls)
                sb.append("- ").append(url).append("\n");
        }
        return sb.toString();
    }

    private String callGeminiApi(String prompt) {
        String url = "/v1beta/models/" + model + ":generateContent?key=" + apiKey;
        Map<String, Object> body = Map.of(
                "contents", List.of(Map.of("parts", List.of(Map.of("text", prompt)))),
                "generationConfig", Map.of("temperature", 0.2, "responseMimeType", "application/json"));
        return webClient.post().uri(url).contentType(MediaType.APPLICATION_JSON).bodyValue(body)
                .retrieve().bodyToMono(String.class).block();
    }

    private ArticleResult parseResponse(String body, String fallback) {
        try {
            JsonNode root = objectMapper.readTree(body);
            String text = root.path("candidates").get(0).path("content").path("parts").get(0).path("text").asText();
            String jsonText = text.replace("```json", "").replace("```", "").trim();
            JsonNode res = objectMapper.readTree(jsonText);
            return new ArticleResult(res.path("title").asText(fallback), res.path("category").asText("Press"),
                    res.path("content").asText(""));
        } catch (Exception e) {
            log.error("Parse Error", e);
            return null;
        }
    }

    public record ArticleResult(String title, String category, String content) {
    }
}
