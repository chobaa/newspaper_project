package com.newspaper.api_server.scheduler;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * AI 에이전트 스케줄러.
 * - 자동 실행 비활성화. 수동으로 POST /api/agent/fetch 호출하여 실행.
 */
@Component
@Slf4j
public class AgentScheduler {
    // 자동 스케줄링 비활성화. 관리자 페이지에서 "지금 가져오기" 버튼으로 수동 실행.
}

