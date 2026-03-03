package com.newspaper.api_server.service;

import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * 에이전트 실행 로그를 메모리에 저장. 관리자 페이지에서 조회용.
 */
@Service
public class AgentLogService {

    private static final int MAX_LINES = 200;
    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("HH:mm:ss");

    private final List<String> lines = new CopyOnWriteArrayList<>();

    public void append(String message) {
        String timestamp = LocalDateTime.now().format(FMT);
        lines.add("[" + timestamp + "] " + message);
        while (lines.size() > MAX_LINES) {
            lines.remove(0);
        }
    }

    public List<String> getRecentLogs() {
        List<String> copy = new ArrayList<>(lines);
        Collections.reverse(copy); // 최신순 정렬
        return copy;
    }

    public void clear() {
        lines.clear();
    }
}