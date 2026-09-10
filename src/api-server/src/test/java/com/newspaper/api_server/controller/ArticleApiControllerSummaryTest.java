package com.newspaper.api_server.controller;

import com.newspaper.api_server.dto.ArticlePageResponse;
import com.newspaper.api_server.dto.ArticleSliderResponse;
import com.newspaper.api_server.dto.ArticleSummaryResponse;
import com.newspaper.api_server.dto.HomeSectionsResponse;
import com.newspaper.api_server.service.ArticleService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ArticleApiController.class)
class ArticleApiControllerSummaryTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ArticleService articleService;

    private ArticleSummaryResponse summary(long id, String title, String category) {
        return new ArticleSummaryResponse(
                id, title, category, "기자",
                LocalDateTime.of(2026, 9, 10, 12, 0), 7L,
                "요약문", "http://cdn.test/" + id + ".jpg", false);
    }

    @Test
    void homeSections_returnsHeadlinesAndSections() throws Exception {
        when(articleService.getHomeSections(eq(List.of("성남시정", "성남시의회")), eq(3), eq(5)))
                .thenReturn(new HomeSectionsResponse(
                        List.of(summary(10L, "헤드라인", "성남시정")),
                        List.of(
                                new HomeSectionsResponse.CategorySection("성남시정", List.of(summary(10L, "시정 기사", "성남시정"))),
                                new HomeSectionsResponse.CategorySection("성남시의회", List.of()))));

        mockMvc.perform(get("/api/articles/home-sections")
                        .param("categories", "성남시정,성남시의회")
                        .param("perCategory", "3")
                        .param("headlines", "5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.headlines[0].title").value("헤드라인"))
                .andExpect(jsonPath("$.headlines[0].thumbnailUrl").value("http://cdn.test/10.jpg"))
                .andExpect(jsonPath("$.sections[0].category").value("성남시정"))
                .andExpect(jsonPath("$.sections[0].articles[0].summary").value("요약문"))
                .andExpect(jsonPath("$.sections[1].articles").isEmpty());
    }

    @Test
    void homeSections_trimsCategoryNamesAndDropsBlanks() throws Exception {
        when(articleService.getHomeSections(eq(List.of("성남시정", "교육/문화")), eq(3), eq(5)))
                .thenReturn(new HomeSectionsResponse(List.of(), List.of()));

        mockMvc.perform(get("/api/articles/home-sections").param("categories", " 성남시정 , ,교육/문화"))
                .andExpect(status().isOk());

        verify(articleService).getHomeSections(eq(List.of("성남시정", "교육/문화")), eq(3), eq(5));
    }

    @Test
    void summaries_returnPagedResult() throws Exception {
        when(articleService.getArticleSummaries(eq("성남시의회"), eq(null), eq("titleAndContent"), eq(2), eq(10)))
                .thenReturn(ArticlePageResponse.of(List.of(summary(1L, "시의회 기사", "성남시의회")), 25L, 2, 10));

        mockMvc.perform(get("/api/articles/summary")
                        .param("category", "성남시의회")
                        .param("page", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].id").value(1))
                .andExpect(jsonPath("$.total").value(25))
                .andExpect(jsonPath("$.page").value(2))
                .andExpect(jsonPath("$.totalPages").value(3));
    }

    @Test
    void related_returnsSameCategoryArticles() throws Exception {
        when(articleService.getRelatedArticles(eq(5L), eq(3)))
                .thenReturn(List.of(summary(4L, "추천 기사", "성남시정")));

        mockMvc.perform(get("/api/articles/5/related"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(4))
                .andExpect(jsonPath("$[0].title").value("추천 기사"));
    }

    @Test
    void slider_returnsPopularAndRealtime() throws Exception {
        when(articleService.getSliderArticles(eq(5)))
                .thenReturn(new ArticleSliderResponse(
                        List.of(summary(1L, "많이 본", "성남시정")),
                        List.of(summary(2L, "급상승", "성남시정"))));

        mockMvc.perform(get("/api/articles/slider"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.popular[0].title").value("많이 본"))
                .andExpect(jsonPath("$.realtime[0].title").value("급상승"));
    }
}
