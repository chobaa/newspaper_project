package com.newspaper.api_server.repository;

import com.newspaper.api_server.domain.ScheduleConfig;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ScheduleConfigRepository extends JpaRepository<ScheduleConfig, Long> {
}
