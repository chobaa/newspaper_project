package com.newspaper.api_server.controller;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ImageControllerTest {

    @Test
    void unquote_stripsQuotesAndWeakValidator() {
        assertThat(ImageController.unquote("\"abc123\"")).isEqualTo("abc123");
        assertThat(ImageController.unquote("W/\"abc123\"")).isEqualTo("abc123");
        assertThat(ImageController.unquote("abc123")).isEqualTo("abc123");
        assertThat(ImageController.unquote("  \"abc123\"  ")).isEqualTo("abc123");
    }

    @Test
    void unquote_returnsNullForEmptyValues() {
        assertThat(ImageController.unquote(null)).isNull();
        assertThat(ImageController.unquote("")).isNull();
        assertThat(ImageController.unquote("\"\"")).isNull();
    }

    @Test
    void matchesETag_acceptsQuotedAndWeakForms() {
        assertThat(ImageController.matchesETag("\"abc123\"", "abc123")).isTrue();
        assertThat(ImageController.matchesETag("W/\"abc123\"", "abc123")).isTrue();
        assertThat(ImageController.matchesETag("*", "abc123")).isTrue();
    }

    @Test
    void matchesETag_handlesMultipleCandidates() {
        assertThat(ImageController.matchesETag("\"other\", \"abc123\"", "abc123")).isTrue();
        assertThat(ImageController.matchesETag("\"other\", \"nope\"", "abc123")).isFalse();
    }

    @Test
    void matchesETag_isFalseWhenHeaderIsMissing() {
        assertThat(ImageController.matchesETag(null, "abc123")).isFalse();
        assertThat(ImageController.matchesETag("   ", "abc123")).isFalse();
    }
}
