package com.newspaper.api_server.config;

import com.newspaper.api_server.support.AdminTokenService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

/**
 * 쓰기·관리자 API 에 관리자 토큰을 요구합니다.
 *
 * <p>기준은 아래와 같습니다.</p>
 * <ul>
 *   <li>preflight(OPTIONS) 와 로그인 요청은 통과</li>
 *   <li>{@code /api/admin/**}, {@code /api/agent/**}, {@code /api/images/**} 는 메서드와 무관하게 토큰 필요
 *       (관리자 설정 조회처럼 GET 이어도 공개되면 안 되는 것들이 있음)</li>
 *   <li>그 외 조회(GET/HEAD)는 공개</li>
 *   <li>나머지 쓰기 요청(POST/PUT/DELETE 등)은 토큰 필요</li>
 * </ul>
 */
@Component
@RequiredArgsConstructor
public class AdminAuthInterceptor implements HandlerInterceptor {

    private static final String BEARER_PREFIX = "Bearer ";
    private static final String LOGIN_PATH = "/api/admin/login";
    private static final String[] ALWAYS_PROTECTED_PREFIXES = {
            "/api/admin/", "/api/agent/", "/api/images"
    };

    private final AdminTokenService adminTokenService;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler)
            throws IOException {

        if (!requiresToken(request)) return true;

        String token = extractToken(request.getHeader(HttpHeaders.AUTHORIZATION));
        if (adminTokenService.isValid(token)) return true;

        writeUnauthorized(response);
        return false;
    }

    private boolean requiresToken(HttpServletRequest request) {
        if (HttpMethod.OPTIONS.matches(request.getMethod())) return false;

        String path = request.getRequestURI();
        if (LOGIN_PATH.equals(path)) return false;

        for (String prefix : ALWAYS_PROTECTED_PREFIXES) {
            if (path.startsWith(prefix)) return true;
        }

        return !HttpMethod.GET.matches(request.getMethod())
                && !HttpMethod.HEAD.matches(request.getMethod());
    }

    private String extractToken(String authorizationHeader) {
        if (authorizationHeader == null) return null;
        if (!authorizationHeader.startsWith(BEARER_PREFIX)) return null;
        return authorizationHeader.substring(BEARER_PREFIX.length()).trim();
    }

    private void writeUnauthorized(HttpServletResponse response) throws IOException {
        response.setStatus(HttpStatus.UNAUTHORIZED.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.getWriter().write("{\"error\":\"관리자 인증이 필요합니다. 다시 로그인해 주세요.\"}");
    }
}
