package com.newspaper.api_server.service;

import com.newspaper.api_server.domain.Article;
import com.newspaper.api_server.dto.ArticleSliderResponse;
import com.newspaper.api_server.dto.HomeSectionsResponse;
import com.newspaper.api_server.repository.ArticleRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ArticleServiceSummaryTest {

    @Mock
    private ArticleRepository articleRepository;

    @Mock
    private ImageService imageService;

    @InjectMocks
    private ArticleService articleService;

    private Article article(String title, String category, String content) {
        return new Article(title, category, content, "기자");
    }

    @Test
    void getHomeSections_queriesEachCategorySeparately() {
        when(articleRepository.findAllByOrderByIdDesc(any(Pageable.class)))
                .thenReturn(List.of(article("헤드라인", "성남시정", "<p>본문</p>")));
        when(articleRepository.findByCategoryOrderByIdDesc(eq("성남시정"), any(Pageable.class)))
                .thenReturn(List.of(article("시정1", "성남시정", "<img src=\"http://cdn/a.jpg\">")));
        when(articleRepository.findByCategoryOrderByIdDesc(eq("교육/문화"), any(Pageable.class)))
                .thenReturn(List.of());

        HomeSectionsResponse response =
                articleService.getHomeSections(List.of("성남시정", "교육/문화"), 3, 5);

        assertThat(response.headlines()).hasSize(1);
        assertThat(response.sections()).hasSize(2);
        assertThat(response.sections().get(0).category()).isEqualTo("성남시정");
        assertThat(response.sections().get(0).articles().get(0).thumbnailUrl()).isEqualTo("http://cdn/a.jpg");
        assertThat(response.sections().get(1).articles()).isEmpty();
    }

    @Test
    void getHomeSections_clampsPerCategoryAndHeadlineCount() {
        when(articleRepository.findAllByOrderByIdDesc(any(Pageable.class))).thenReturn(List.of());
        when(articleRepository.findByCategoryOrderByIdDesc(eq("성남시정"), any(Pageable.class))).thenReturn(List.of());

        articleService.getHomeSections(List.of("성남시정"), 0, 999);

        verify(articleRepository).findByCategoryOrderByIdDesc(eq("성남시정"),
                eq(org.springframework.data.domain.PageRequest.of(0, 1)));
        verify(articleRepository).findAllByOrderByIdDesc(
                eq(org.springframework.data.domain.PageRequest.of(0, 10)));
    }

    @Test
    void getHomeSections_ignoresNullCategories() {
        when(articleRepository.findAllByOrderByIdDesc(any(Pageable.class))).thenReturn(List.of());

        HomeSectionsResponse response = articleService.getHomeSections(null, 3, 5);

        assertThat(response.sections()).isEmpty();
    }

    @Test
    void getRelatedArticles_returnsEmptyWhenArticleMissing() {
        when(articleRepository.findById(99L)).thenReturn(java.util.Optional.empty());

        assertThat(articleService.getRelatedArticles(99L, 3)).isEmpty();
    }

    @Test
    void getRelatedArticles_excludesCurrentArticle() {
        Article current = article("현재 기사", "성남시정", "<p>본문</p>");
        when(articleRepository.findById(1L)).thenReturn(java.util.Optional.of(current));
        when(articleRepository.findByCategoryAndIdNotOrderByIdDesc(eq("성남시정"), eq(1L), any(Pageable.class)))
                .thenReturn(List.of(article("추천 기사", "성남시정", "<p>추천 본문</p>")));

        assertThat(articleService.getRelatedArticles(1L, 3))
                .extracting(a -> a.title())
                .containsExactly("추천 기사");
    }

    @Test
    void getSliderArticles_keepsOnlyArticlesWithRealImages() {
        when(articleRepository.findByRegDateGreaterThanEqualOrderByViewcountDesc(any(LocalDateTime.class), any(Pageable.class)))
                .thenReturn(List.of(
                        article("사진 기사", "성남시정", "<img src=\"http://cdn/a.jpg\">"),
                        article("영상 기사", "동영상뉴스", "<iframe src=\"https://www.youtube.com/embed/abcdef1\"></iframe>"),
                        article("사진 없음", "성남시정", "<p>텍스트</p>")));

        ArticleSliderResponse response = articleService.getSliderArticles(5);

        assertThat(response.popular()).extracting(a -> a.title()).containsExactly("사진 기사");
        assertThat(response.realtime()).extracting(a -> a.title()).containsExactly("사진 기사");
    }

    @Test
    void getSliderArticles_fallsBackToAllTimeWhenNoRecentArticles() {
        when(articleRepository.findByRegDateGreaterThanEqualOrderByViewcountDesc(any(LocalDateTime.class), any(Pageable.class)))
                .thenReturn(List.of());
        when(articleRepository.findAllByOrderByViewcountDesc(any(Pageable.class)))
                .thenReturn(List.of(article("오래된 인기 기사", "성남시정", "<img src=\"http://cdn/old.jpg\">")));

        ArticleSliderResponse response = articleService.getSliderArticles(5);

        assertThat(response.popular()).extracting(a -> a.title()).containsExactly("오래된 인기 기사");
        assertThat(response.realtime()).extracting(a -> a.title()).containsExactly("오래된 인기 기사");
    }
}
