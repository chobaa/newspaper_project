package com.newspaper.api_server.config;

import com.newspaper.api_server.support.AdminTokenService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.assertj.core.api.Assertions.assertThat;

class AdminAuthInterceptorTest {

    private AdminTokenService tokenService;
    private AdminAuthInterceptor interceptor;
    private String validToken;

    @BeforeEach
    void setUp() {
        tokenService = new AdminTokenService("test-secret", 12);
        interceptor = new AdminAuthInterceptor(tokenService);
        validToken = tokenService.issue("admin");
    }

    private boolean handle(String method, String path, String authorization) throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest(method, path);
        request.setRequestURI(path);
        if (authorization != null) request.addHeader(HttpHeaders.AUTHORIZATION, authorization);
        return interceptor.preHandle(request, new MockHttpServletResponse(), new Object());
    }

    // ===== 토큰 없이 통과해야 하는 것들 =====

    @Test
    void allowsPublicReads() throws Exception {
        assertThat(handle("GET", "/api/articles/summary", null)).isTrue();
        assertThat(handle("GET", "/api/articles/12", null)).isTrue();
        assertThat(handle("GET", "/api/articles/12/related", null)).isTrue();
        assertThat(handle("GET", "/api/articles/home-sections", null)).isTrue();
        assertThat(handle("GET", "/api/articles/slider", null)).isTrue();
        assertThat(handle("GET", "/api/public/images/abc.jpg", null)).isTrue();
        assertThat(handle("GET", "/api/brand-settings/primary", null)).isTrue();
        assertThat(handle("GET", "/api/health", null)).isTrue();
    }

    @Test
    void allowsLoginAndPreflight() throws Exception {
        assertThat(handle("POST", "/api/admin/login", null)).isTrue();
        assertThat(handle("OPTIONS", "/api/articles", null)).isTrue();
        assertThat(handle("OPTIONS", "/api/admin/brand-settings", null)).isTrue();
    }

    // ===== 토큰이 필요한 것들 =====

    @Test
    void blocksArticleWritesWithoutToken() throws Exception {
        assertThat(handle("POST", "/api/articles", null)).isFalse();
        assertThat(handle("PUT", "/api/articles/12", null)).isFalse();
        assertThat(handle("DELETE", "/api/articles/12", null)).isFalse();
    }

    @Test
    void blocksAdminReadsWithoutToken() throws Exception {
        // 관리자 설정은 GET 이어도 공개되면 안 됩니다.
        assertThat(handle("GET", "/api/admin/brand-assets", null)).isFalse();
        assertThat(handle("GET", "/api/admin/anything", null)).isFalse();
        assertThat(handle("PUT", "/api/admin/brand-settings", null)).isFalse();
    }

    @Test
    void blocksImageEndpointsWithoutToken() throws Exception {
        assertThat(handle("POST", "/api/images", null)).isFalse();
        assertThat(handle("POST", "/api/images/cleanup", null)).isFalse();
    }

    @Test
    void allowsProtectedEndpointsWithValidToken() throws Exception {
        assertThat(handle("POST", "/api/articles", "Bearer " + validToken)).isTrue();
        assertThat(handle("DELETE", "/api/articles/12", "Bearer " + validToken)).isTrue();
        assertThat(handle("PUT", "/api/admin/brand-settings", "Bearer " + validToken)).isTrue();
        assertThat(handle("POST", "/api/images", "Bearer " + validToken)).isTrue();
    }

    @Test
    void rejectsInvalidOrMalformedAuthorizationHeaders() throws Exception {
        assertThat(handle("POST", "/api/articles", "Bearer nonsense")).isFalse();
        assertThat(handle("POST", "/api/articles", validToken)).isFalse();          // Bearer 접두사 없음
        assertThat(handle("POST", "/api/articles", "Basic " + validToken)).isFalse();
        assertThat(handle("POST", "/api/articles", "Bearer ")).isFalse();
    }

    @Test
    void writesUnauthorizedResponse() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/articles");
        request.setRequestURI("/api/articles");
        MockHttpServletResponse response = new MockHttpServletResponse();

        boolean allowed = interceptor.preHandle(request, response, new Object());

        assertThat(allowed).isFalse();
        assertThat(response.getStatus()).isEqualTo(HttpStatus.UNAUTHORIZED.value());
        assertThat(response.getContentType()).contains("application/json");
        assertThat(response.getContentAsString()).contains("관리자 인증이 필요합니다");
    }
}
