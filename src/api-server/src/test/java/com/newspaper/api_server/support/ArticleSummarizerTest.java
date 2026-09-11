package com.newspaper.api_server.support;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ArticleSummarizerTest {

    @Test
    void summarize_stripsTagsAndNbsp() {
        String html = "<p>성남시는&nbsp;오늘</p><p>행사를 열었다.</p>";

        assertThat(ArticleSummarizer.summarize(html)).isEqualTo("성남시는 오늘행사를 열었다.");
    }

    @Test
    void summarize_truncatesLongContent() {
        String html = "<p>" + "가".repeat(500) + "</p>";

        String summary = ArticleSummarizer.summarize(html);

        assertThat(summary).hasSize(ArticleSummarizer.SUMMARY_LENGTH + 3);
        assertThat(summary).endsWith("...");
    }

    @Test
    void summarize_returnsEmptyForNull() {
        assertThat(ArticleSummarizer.summarize(null)).isEmpty();
    }

    @Test
    void thumbnail_usesFirstImageAndDecodesEntities() {
        String html = "<p>본문</p><img src=\"http://cdn.test/a.jpg?w=1&amp;h=2\"><img src=\"http://cdn.test/b.jpg\">";

        ArticleSummarizer.Thumbnail thumbnail = ArticleSummarizer.thumbnail(html);

        assertThat(thumbnail.url()).isEqualTo("http://cdn.test/a.jpg?w=1&h=2");
        assertThat(thumbnail.video()).isFalse();
    }

    @Test
    void thumbnail_fallsBackToYouTubeThumbnail() {
        String html = "<iframe class=\"ql-video\" src=\"https://www.youtube.com/embed/abc123XYZ\"></iframe>";

        ArticleSummarizer.Thumbnail thumbnail = ArticleSummarizer.thumbnail(html);

        assertThat(thumbnail.url()).isEqualTo("https://img.youtube.com/vi/abc123XYZ/hqdefault.jpg");
        assertThat(thumbnail.video()).isTrue();
    }

    @Test
    void thumbnail_supportsShortLinks() {
        assertThat(ArticleSummarizer.thumbnail("<p>https://youtu.be/abc123XYZ</p>").url())
                .isEqualTo("https://img.youtube.com/vi/abc123XYZ/hqdefault.jpg");
    }

    @Test
    void thumbnail_returnsNoneWhenNothingFound() {
        ArticleSummarizer.Thumbnail thumbnail = ArticleSummarizer.thumbnail("<p>사진 없는 기사</p>");

        assertThat(thumbnail.url()).isNull();
        assertThat(thumbnail.video()).isFalse();
    }
}
