package com.newspaper.api_server.dto;

import com.newspaper.api_server.domain.Article;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class ArticleHomeResponseTest {

    @Test
    void from_truncatesLongContent() {
        String longContent = "x".repeat(9000);
        Article article = new Article("제목", "성남시정", longContent, "기자");

        ArticleHomeResponse response = ArticleHomeResponse.from(article);

        assertEquals(8000, response.content().length());
        assertEquals("제목", response.title());
        assertEquals("성남시정", response.category());
    }

    @Test
    void from_keepsShortContent() {
        Article article = new Article("제목", "성남시정", "짧은 본문", "기자");

        ArticleHomeResponse response = ArticleHomeResponse.from(article);

        assertEquals("짧은 본문", response.content());
    }

    @Test
    void from_handlesNullContent() {
        Article article = new Article("제목", "성남시정", null, "기자");

        ArticleHomeResponse response = ArticleHomeResponse.from(article);

        assertNull(response.content());
    }
}
