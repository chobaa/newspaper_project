package com.newspaper.api_server.config;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;

@RestControllerAdvice
public class RestExceptionHandler {

    /** JSON 파싱 실패 시 400 원인 로깅 및 클라이언트에 사유 반환 */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, String>> handleHttpMessageNotReadable(HttpMessageNotReadableException ex) {
        String detail = ex.getMostSpecificCause() != null
                ? ex.getMostSpecificCause().getMessage()
                : ex.getMessage();
        org.slf4j.LoggerFactory.getLogger(RestExceptionHandler.class)
                .warn("요청 본문 파싱 실패 (400): {}", detail);
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(Map.of(
                        "error", "요청 형식이 올바르지 않습니다.",
                        "detail", detail != null ? detail : ""
                ));
    }
}
