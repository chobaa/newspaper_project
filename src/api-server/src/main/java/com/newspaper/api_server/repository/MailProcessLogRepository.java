package com.newspaper.api_server.repository;

import com.newspaper.api_server.domain.MailProcessLog;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MailProcessLogRepository extends JpaRepository<MailProcessLog, Long> {
    List<MailProcessLog> findAllByOrderByProcessedDateDesc(Pageable pageable);
}
