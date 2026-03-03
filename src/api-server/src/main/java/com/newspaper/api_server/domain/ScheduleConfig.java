package com.newspaper.api_server.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * 스케줄 설정을 저장하는 엔티티
 */
@Entity
@Getter
@Setter
@NoArgsConstructor
public class ScheduleConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 수동 스케줄 최근 n개 가져오기
    @Column(nullable = false)
    private Integer manualFetchCount = 10;

    // 자동 스케줄 활성화 여부
    @Column(nullable = false)
    private Boolean autoScheduleEnabled = false;

    // 자동 스케줄 최근 n개 가져오기
    @Column(nullable = false)
    private Integer autoFetchCount = 5;

    // 자동 스케줄 n시간 간격
    @Column(nullable = false)
    private Integer autoIntervalHours = 1;

    // 마지막으로 처리한 메일의 수신 시간 (이후 메일만 가져오기)
    private LocalDateTime lastFetchedMailDate;

    // 기본 기자명
    @Column(nullable = false)
    private String defaultWriter = "AI Reporter";

    public ScheduleConfig(Integer manualFetchCount, Boolean autoScheduleEnabled,
            Integer autoFetchCount, Integer autoIntervalHours, String defaultWriter) {
        this.manualFetchCount = manualFetchCount;
        this.autoScheduleEnabled = autoScheduleEnabled;
        this.autoFetchCount = autoFetchCount;
        this.autoIntervalHours = autoIntervalHours;
        this.defaultWriter = (defaultWriter != null) ? defaultWriter : "AI Reporter";
    }
}