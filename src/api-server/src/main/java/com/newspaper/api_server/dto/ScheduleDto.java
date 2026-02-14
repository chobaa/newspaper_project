package com.newspaper.api_server.dto;

import java.time.LocalDateTime;
import java.util.List;

public class ScheduleDto {

        public record ScheduleConfigResponse(
                        Long id,
                        Integer manualFetchCount,
                        Boolean autoScheduleEnabled,
                        Integer autoFetchCount,
                        Integer autoIntervalHours,
                        LocalDateTime lastFetchedMailDate,
                        String defaultWriter) {
        }

        public record ScheduleConfigUpdateRequest(
                        Integer manualFetchCount,
                        Boolean autoScheduleEnabled,
                        Integer autoFetchCount,
                        Integer autoIntervalHours,
                        String defaultWriter) {
        }

        public record MailProcessLogResponse(
                        Long id,
                        String subject,
                        String senderEmail,
                        LocalDateTime receivedDate,
                        LocalDateTime processedDate,
                        Boolean success,
                        String errorMessage,
                        Long articleId,
                        List<String> attachments,
                        String hwpFileName,
                        List<String> imageFileNames) {
        }

        public record FetchResultResponse(
                        Integer totalProcessed,
                        Integer successCount,
                        Integer failureCount,
                        List<MailProcessLogResponse> logs) {
        }
}
