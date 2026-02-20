package com.newspaper.api_server.scheduler;

import com.newspaper.api_server.dto.ScheduleDto;
import com.newspaper.api_server.service.MailFetcherService;
import com.newspaper.api_server.service.ScheduleService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * AI 에이전트 스케줄러.
 * - 자동 스케줄 설정에 따라 주기적으로 메일을 가져옴
 * - 수동 실행은 POST /api/agent/fetch 호출
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class AgentScheduler {

    private final MailFetcherService mailFetcherService;
    private final ScheduleService scheduleService;

    /**
     * 자동 스케줄 실행 (1시간마다 체크, 설정에 따라 실행)
     * 실제 간격은 설정에서 관리
     */
    @Scheduled(fixedRate = 3600000) // 1시간마다 체크
    public void autoFetch() {
        try {
            ScheduleDto.ScheduleConfigResponse config = scheduleService.getScheduleConfig();

            if (!config.autoScheduleEnabled()) {
                return;
            }

            log.info("자동 스케줄 실행 시작");
            ScheduleDto.FetchResultResponse result = mailFetcherService.fetchAndCreateArticlesAuto();
            log.info("자동 스케줄 실행 완료: 성공 {}, 실패 {}",
                    result.successCount(), result.failureCount());
        } catch (Exception e) {
            log.error("자동 스케줄 실행 중 오류 발생", e);
        }
    }
}
