package com.newspaper.api_server.controller;

import com.newspaper.api_server.dto.ArticleHomeResponse;
import com.newspaper.api_server.config.AdminAuthInterceptor;
import com.newspaper.api_server.service.ArticleService;
import com.newspaper.api_server.support.AdminTokenService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ArticleApiController.class)
// WebConfig 가 인터셉터를 요구하므로 함께 올립니다. 공개 조회가 인증에 걸리지 않는지도 같이 검증됩니다.
@Import(AdminAuthInterceptor.class)
class ArticleApiControllerHomeTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ArticleService articleService;

    @MockBean
    private AdminTokenService adminTokenService;

    @Test
    void findHome_returnsHomeArticles() throws Exception {
        ArticleHomeResponse article = new ArticleHomeResponse(
                1L,
                "테스트 기사",
                "성남시정",
                "<p>요약</p>",
                "기자",
                LocalDateTime.of(2026, 7, 21, 12, 0),
                10L
        );
        when(articleService.getHomeArticles(eq(5))).thenReturn(List.of(article));

        mockMvc.perform(get("/api/articles/home").param("limit", "5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(1))
                .andExpect(jsonPath("$[0].title").value("테스트 기사"))
                .andExpect(jsonPath("$[0].category").value("성남시정"))
                .andExpect(jsonPath("$[0].viewCount").value(10));
    }

    @Test
    void findHome_usesDefaultLimit() throws Exception {
        when(articleService.getHomeArticles(eq(80))).thenReturn(List.of());

        mockMvc.perform(get("/api/articles/home"))
                .andExpect(status().isOk());
    }
}
