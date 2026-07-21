package com.newspaper.api_server.service;

import com.newspaper.api_server.domain.Article;
import com.newspaper.api_server.dto.ArticleHomeResponse;
import com.newspaper.api_server.repository.ArticleRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ArticleServiceHomeTest {

    @Mock
    private ArticleRepository articleRepository;

    @Mock
    private ImageService imageService;

    @InjectMocks
    private ArticleService articleService;

    @Test
    void getHomeArticles_clampsLimitToMax200() {
        when(articleRepository.findAllByOrderByIdDesc(any(Pageable.class)))
                .thenReturn(List.of(new Article("제목", "성남시정", "본문", "기자")));

        articleService.getHomeArticles(999);

        ArgumentCaptor<Pageable> pageableCaptor = ArgumentCaptor.forClass(Pageable.class);
        verify(articleRepository).findAllByOrderByIdDesc(pageableCaptor.capture());
        assertEquals(200, pageableCaptor.getValue().getPageSize());
    }

    @Test
    void getHomeArticles_clampsLimitToMin1() {
        when(articleRepository.findAllByOrderByIdDesc(any(Pageable.class)))
                .thenReturn(List.of());

        articleService.getHomeArticles(0);

        ArgumentCaptor<Pageable> pageableCaptor = ArgumentCaptor.forClass(Pageable.class);
        verify(articleRepository).findAllByOrderByIdDesc(pageableCaptor.capture());
        assertEquals(1, pageableCaptor.getValue().getPageSize());
    }

    @Test
    void getHomeArticles_returnsMappedResponses() {
        Article article = new Article("홈 기사", "경기도정", "요약 본문", "기자");
        when(articleRepository.findAllByOrderByIdDesc(PageRequest.of(0, 5)))
                .thenReturn(List.of(article));

        List<ArticleHomeResponse> responses = articleService.getHomeArticles(5);

        assertEquals(1, responses.size());
        assertEquals("홈 기사", responses.get(0).title());
        assertEquals("요약 본문", responses.get(0).content());
    }
}
