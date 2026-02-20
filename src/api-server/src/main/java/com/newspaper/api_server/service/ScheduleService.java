package com.newspaper.api_server.service;

import com.newspaper.api_server.domain.MailProcessLog;
import com.newspaper.api_server.domain.ScheduleConfig;
import com.newspaper.api_server.dto.ScheduleDto;
import com.newspaper.api_server.repository.MailProcessLogRepository;
import com.newspaper.api_server.repository.ScheduleConfigRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ScheduleService {

    private final ScheduleConfigRepository scheduleConfigRepository;
    private final MailProcessLogRepository mailProcessLogRepository;

    @Transactional
    public ScheduleDto.ScheduleConfigResponse getScheduleConfig() {
        ScheduleConfig config = scheduleConfigRepository.findAll().stream()
                .findFirst()
                .orElseGet(() -> scheduleConfigRepository.save(new ScheduleConfig(10, false, 5, 1, "AI Reporter")));

        return new ScheduleDto.ScheduleConfigResponse(
                config.getId(),
                config.getManualFetchCount(),
                config.getAutoScheduleEnabled(),
                config.getAutoFetchCount(),
                config.getAutoIntervalHours(),
                config.getLastFetchedMailDate(),
                config.getDefaultWriter());
    }

    @Transactional
    public ScheduleDto.ScheduleConfigResponse updateScheduleConfig(ScheduleDto.ScheduleConfigUpdateRequest request) {
        ScheduleConfig config = scheduleConfigRepository.findAll().stream()
                .findFirst()
                .orElseGet(() -> new ScheduleConfig(10, false, 5, 1, "AI Reporter"));

        if (request.manualFetchCount() != null)
            config.setManualFetchCount(request.manualFetchCount());
        if (request.autoScheduleEnabled() != null)
            config.setAutoScheduleEnabled(request.autoScheduleEnabled());
        if (request.autoFetchCount() != null)
            config.setAutoFetchCount(request.autoFetchCount());
        if (request.autoIntervalHours() != null)
            config.setAutoIntervalHours(request.autoIntervalHours());
        if (request.defaultWriter() != null)
            config.setDefaultWriter(request.defaultWriter());

        config = scheduleConfigRepository.save(config);
        return new ScheduleDto.ScheduleConfigResponse(
                config.getId(), config.getManualFetchCount(), config.getAutoScheduleEnabled(),
                config.getAutoFetchCount(), config.getAutoIntervalHours(), config.getLastFetchedMailDate(),
                config.getDefaultWriter());
    }

    @Transactional
    public void updateLastFetchedMailDate(LocalDateTime date) {
        ScheduleConfig config = scheduleConfigRepository.findAll().stream().findFirst()
                .orElseGet(() -> new ScheduleConfig(10, false, 5, 1, "AI Reporter"));
        config.setLastFetchedMailDate(date);
        scheduleConfigRepository.save(config);
    }

    @Transactional
    public MailProcessLog saveMailProcessLog(String subject, String senderEmail, LocalDateTime receivedDate,
            Boolean success, String errorMessage, Long articleId) {
        MailProcessLog logItem = new MailProcessLog(subject, senderEmail, receivedDate, success, errorMessage,
                articleId);
        return mailProcessLogRepository.save(logItem);
    }

    @Transactional
    public void saveExistingLog(MailProcessLog logItem) {
        mailProcessLogRepository.save(logItem);
    }

    @Transactional(readOnly = true)
    public List<ScheduleDto.MailProcessLogResponse> getRecentMailProcessLogs(int limit) {
        List<MailProcessLog> logs = mailProcessLogRepository
                .findAllByOrderByProcessedDateDesc(PageRequest.of(0, limit));
        return logs.stream()
                .map(l -> new ScheduleDto.MailProcessLogResponse(
                        l.getId(), l.getSubject(), l.getSenderEmail(), l.getReceivedDate(), l.getProcessedDate(),
                        l.getSuccess(), l.getErrorMessage(), l.getArticleId(),
                        l.getAttachments(), l.getHwpFileName(), l.getImageFileNames()))
                .collect(Collectors.toList());
    }

    @Transactional
    public void clearMailProcessLogs() {
        mailProcessLogRepository.deleteAll();
    }

    @Transactional(readOnly = true)
    public MailProcessLog findMailProcessLog(Long id) {
        return mailProcessLogRepository.findById(id).orElse(null);
    }

    @Transactional
    public void updateMailProcessLogArticle(Long logId, Long articleId) {
        mailProcessLogRepository.findById(logId).ifPresent(l -> {
            l.setArticleId(articleId);
            l.setSuccess(true);
            mailProcessLogRepository.save(l);
        });
    }
}
