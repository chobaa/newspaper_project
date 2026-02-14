package com.newspaper.api_server.service;

import com.newspaper.api_server.domain.MailProcessLog;
import com.newspaper.api_server.dto.ArticleSaveRequest;
import com.newspaper.api_server.dto.ScheduleDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.utils.IoUtils;

import jakarta.mail.*;
import jakarta.mail.Flags.Flag;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeUtility;
import jakarta.mail.search.*;

import java.io.InputStream;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.*;

/**
 * Service to fetch emails and create articles using Gemini AI.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class MailFetcherService {

    @Value("${spring.mail.host}")
    private String host;

    @Value("${spring.mail.port}")
    private int port;

    @Value("${spring.mail.username}")
    private String username;

    @Value("${spring.mail.password}")
    private String password;

    private final HwpParsingService hwpParsingService;
    private final ImageService imageService;
    private final ArticleService articleService;
    private final AgentConfigService agentConfigService;
    private final AgentLogService agentLogService;
    private final ScheduleService scheduleService;
    private final GeminiService geminiService;

    public ScheduleDto.FetchResultResponse fetchAndCreateArticles() {
        ScheduleDto.ScheduleConfigResponse config = scheduleService.getScheduleConfig();
        return fetchAndCreateArticles(config.manualFetchCount(), false);
    }

    public ScheduleDto.FetchResultResponse fetchAndCreateArticlesAuto() {
        ScheduleDto.ScheduleConfigResponse config = scheduleService.getScheduleConfig();
        if (!config.autoScheduleEnabled()) {
            return new ScheduleDto.FetchResultResponse(0, 0, 0, Collections.emptyList());
        }
        return fetchAndCreateArticles(config.autoFetchCount(), true);
    }

    private ScheduleDto.FetchResultResponse fetchAndCreateArticles(int maxCount, boolean isAuto) {
        String mode = isAuto ? "AUTO" : "MANUAL";
        log.info("Starting mail fetch. Mode: {}, MaxCount: {}", mode, maxCount);
        agentLogService.append("Fetch started [" + mode + "]");

        List<ScheduleDto.MailProcessLogResponse> processLogs = new ArrayList<>();
        int successCount = 0;
        int failureCount = 0;
        LocalDateTime latestMailDate = null;

        Properties props = new Properties();
        props.put("mail.store.protocol", "imaps");
        props.put("mail.imaps.host", host);
        props.put("mail.imaps.port", String.valueOf(port));
        props.put("mail.imaps.ssl.enable", "true");

        try (Store store = Session.getInstance(props).getStore("imaps")) {
            store.connect(host, username, password);
            Folder inbox = store.getFolder("INBOX");
            inbox.open(Folder.READ_WRITE);

            SearchTerm searchTerm = new SubjectTerm("[보도자료]");
            ScheduleDto.ScheduleConfigResponse config = scheduleService.getScheduleConfig();
            if (config.lastFetchedMailDate() != null) {
                Date lastDate = Date.from(config.lastFetchedMailDate().atZone(ZoneId.systemDefault()).toInstant());
                searchTerm = new AndTerm(searchTerm, new ReceivedDateTerm(ComparisonTerm.GT, lastDate));
            }

            Message[] messages = inbox.search(searchTerm);
            Arrays.sort(messages, Comparator.comparing(m -> {
                try {
                    return m.getReceivedDate();
                } catch (Exception e) {
                    return new Date(0);
                }
            }));

            int processCount = Math.min(messages.length, maxCount);
            for (int i = 0; i < processCount; i++) {
                Message msg = messages[i];
                MailProcessResult result = handleMessageWithLog(msg);
                processLogs.add(result.logResponse);
                if (result.success) {
                    successCount++;
                    msg.setFlag(Flag.SEEN, true);
                } else {
                    failureCount++;
                }
                if (result.receivedDate != null
                        && (latestMailDate == null || result.receivedDate.isAfter(latestMailDate))) {
                    latestMailDate = result.receivedDate;
                }
            }
            inbox.close(true);
            if (latestMailDate != null)
                scheduleService.updateLastFetchedMailDate(latestMailDate);
        } catch (Exception e) {
            log.error("IMAP error", e);
            agentLogService.append("IMAP Error: " + e.getMessage());
        }

        return new ScheduleDto.FetchResultResponse(processLogs.size(), successCount, failureCount, processLogs);
    }

    private MailProcessResult handleMessageWithLog(Message message) {
        String subject = safeSubject(message);
        String senderEmail = null;
        LocalDateTime receivedDate = null;
        Long articleId = null;
        String errorMessage = null;
        boolean success = false;
        MailProcessLog processLog = null;

        try {
            senderEmail = extractSenderEmail(message);
            Date rcvDate = message.getReceivedDate();
            receivedDate = (rcvDate != null) ? LocalDateTime.ofInstant(rcvDate.toInstant(), ZoneId.systemDefault())
                    : LocalDateTime.now();
            processLog = scheduleService.saveMailProcessLog(subject, senderEmail, receivedDate, false, null, null);
            articleId = handleMessage(message, processLog);
            success = (articleId != null);
        } catch (Exception e) {
            log.error("Process error: {}", subject, e);
            errorMessage = e.getMessage();
        }

        if (processLog != null) {
            processLog.setSuccess(success);
            processLog.setErrorMessage(errorMessage);
            processLog.setArticleId(articleId);
            scheduleService.saveExistingLog(processLog);

            ScheduleDto.MailProcessLogResponse logRes = new ScheduleDto.MailProcessLogResponse(
                    processLog.getId(), subject, senderEmail, receivedDate, LocalDateTime.now(),
                    success, errorMessage, articleId,
                    processLog.getAttachments(), processLog.getHwpFileName(), processLog.getImageFileNames());

            return new MailProcessResult(success, receivedDate, logRes);
        } else {
            // Fallback if processLog failed to create
            ScheduleDto.MailProcessLogResponse logRes = new ScheduleDto.MailProcessLogResponse(
                    null, subject, senderEmail, receivedDate, LocalDateTime.now(),
                    success, errorMessage, articleId,
                    Collections.emptyList(), null, Collections.emptyList());
            return new MailProcessResult(success, receivedDate, logRes);
        }
    }

    private Long handleMessage(Message message, MailProcessLog processLog) throws Exception {
        String subject = message.getSubject();

        // Use agentConfigService for filtering
        List<String> allowedSenders = agentConfigService.getAllowedSenderEmails();
        String senderEmail = extractSenderEmail(message);
        if (!allowedSenders.isEmpty()) {
            if (senderEmail == null || allowedSenders.stream().noneMatch(s -> s.equalsIgnoreCase(senderEmail))) {
                return null;
            }
        }

        String mailBodyText = extractMailBodyText(message);
        String extractedText = null;
        List<String> imageUrls = new ArrayList<>();

        Object content = message.getContent();
        if (content instanceof Multipart) {
            List<BodyPart> parts = new ArrayList<>();
            collectAttachmentParts(message, parts);
            for (BodyPart part : parts) {
                String fileName = decodeFileName(part.getFileName());
                if (fileName != null && processLog != null)
                    processLog.addAttachment(fileName);
                try (InputStream is = part.getInputStream()) {
                    String lower = (fileName != null) ? fileName.toLowerCase() : "";
                    if (lower.endsWith(".hwp") || lower.endsWith(".hwpx")) {
                        extractedText = hwpParsingService.extractText(is);
                        if (processLog != null)
                            processLog.setHwpFileName(fileName);
                    } else if (isImageAttachment(part)) {
                        String url = imageService.uploadImage(IoUtils.toByteArray(is), fileName, part.getContentType());
                        imageUrls.add(url);
                        if (processLog != null)
                            processLog.addImageFileName(fileName);
                    }
                }
            }
        } else if (content instanceof String s) {
            mailBodyText = s;
        }

        if ((extractedText == null || extractedText.isBlank()) && (mailBodyText == null || mailBodyText.isBlank()))
            return null;

        // Get default writer from config
        ScheduleDto.ScheduleConfigResponse config = scheduleService.getScheduleConfig();
        String reporterName = (config.defaultWriter() != null) ? config.defaultWriter() : "AI Reporter";

        // Gemini AI is MANDATORY now
        if (geminiService.isAvailable()) {
            GeminiService.ArticleResult ai = geminiService.generateArticle(subject, mailBodyText, extractedText,
                    imageUrls, "400px");
            if (ai != null) {
                return articleService.saveArticle(
                        new ArticleSaveRequest(ai.title(), ai.category(), ai.content(), reporterName, imageUrls));
            } else {
                throw new RuntimeException("Gemini failed to generate article result");
            }
        } else {
            throw new RuntimeException("Gemini AI is not available (Check API Key)");
        }
    }

    private String extractMailBodyText(Part part) throws Exception {
        Object content = part.getContent();
        if (content instanceof String s) {
            String ct = part.getContentType().toLowerCase();
            if (ct.contains("text/html"))
                return s.replaceAll("<[^>]+>", " ").replaceAll("&nbsp;", " ").replaceAll("\\s+", " ").trim();
            return s;
        } else if (content instanceof Multipart mp) {
            String p = null;
            String h = null;
            for (int i = 0; i < mp.getCount(); i++) {
                BodyPart bp = mp.getBodyPart(i);
                if (Part.ATTACHMENT.equalsIgnoreCase(bp.getDisposition()))
                    continue;
                String r = extractMailBodyText(bp);
                if (bp.getContentType().toLowerCase().contains("text/plain"))
                    p = r;
                else
                    h = r;
            }
            return (p != null) ? p : h;
        }
        return null;
    }

    private void collectAttachmentParts(Part part, List<BodyPart> res) throws Exception {
        if (part.getContent() instanceof Multipart mp) {
            for (int i = 0; i < mp.getCount(); i++) {
                BodyPart bp = mp.getBodyPart(i);
                if (Part.ATTACHMENT.equalsIgnoreCase(bp.getDisposition()) || bp.getFileName() != null)
                    res.add(bp);
                if (bp.getContent() instanceof Multipart)
                    collectAttachmentParts(bp, res);
            }
        }
    }

    private String decodeFileName(String f) {
        try {
            return (f != null) ? MimeUtility.decodeText(f) : null;
        } catch (Exception e) {
            return f;
        }
    }

    private String extractSenderEmail(Message m) throws Exception {
        Address[] from = m.getFrom();
        if (from == null || from.length == 0)
            return null;
        return (from[0] instanceof InternetAddress ia) ? ia.getAddress() : from[0].toString();
    }

    private boolean isImageAttachment(BodyPart p) throws Exception {
        String ct = p.getContentType();
        if (ct != null && ct.toLowerCase().startsWith("image/"))
            return true;
        String f = (p.getFileName() != null) ? p.getFileName().toLowerCase() : "";
        return f.endsWith(".jpg") || f.endsWith(".jpeg") || f.endsWith(".png") || f.endsWith(".gif")
                || f.endsWith(".webp");
    }

    private String safeSubject(Message m) {
        try {
            return m.getSubject();
        } catch (Exception e) {
            return "No Subject";
        }
    }

    private record MailProcessResult(boolean success, LocalDateTime receivedDate,
            ScheduleDto.MailProcessLogResponse logResponse) {
    }
}
