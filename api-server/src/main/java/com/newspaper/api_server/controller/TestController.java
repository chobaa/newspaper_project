package com.newspaper.api_server.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class TestController {
    @GetMapping("/hello") // "누가 /hello 라고 접속하면 이 함수 실행해"
    public String hello() {
        return "안녕하세요! 신문사 서버가 정상 작동 중입니다. 📰";
    }
}