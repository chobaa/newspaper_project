package com.newspaper.api_server.service;

import com.newspaper.api_server.dto.ArticleSaveRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.utils.IoUtils;

import jakarta.mail.*;
import jakarta.mail.Flags.Flag;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.search.AndTerm;
import jakarta.mail.search.FlagTerm;
import jakarta.mail.search.SubjectTerm;
import jakarta.mail.search.SearchTerm;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Properties;

/**
 * 네이버 IMAP에서 [보도자료] 메일을 읽어와
 * - HWP 본문 파싱
 * - 이미지 업로드(MinIO)
 * - Article 엔티티 자동 생성
 * 까지 처리하는 AI 기자 에이전트의 핵심 서비스.
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

    /**
     * 네이버 메일에서 [보도자료] + 읽지 않은 메일을 찾아
     * 기사로 변환하고 저장한다.
     *
     * @return 생성된 기사 개수
     */
    public int fetchAndCreateArticles() {
        agentLogService.append("메일 가져오기 시작");
        int createdCount = 0;

        Properties props = new Properties();
        props.put("mail.store.protocol", "imaps");
        props.put("mail.imaps.host", host);
        props.put("mail.imaps.port", String.valueOf(port));
        props.put("mail.imaps.ssl.enable", "true");

        Session session = Session.getInstance(props);

        try (Store store = session.getStore("imaps")) {
            store.connect(host, username, password);

            Folder inbox = store.getFolder("INBOX");
            inbox.open(Folder.READ_WRITE);

            // 읽지 않은 + 제목에 [보도자료]가 포함된 메일만 검색
            FlagTerm unseen = new FlagTerm(new Flags(Flag.SEEN), false);
            SubjectTerm subjectTerm = new SubjectTerm("[보도자료]");
            SearchTerm searchTerm = new AndTerm(unseen, subjectTerm);

            Message[] messages = inbox.search(searchTerm);

            log.info("AI Reporter: 발견된 대상 메일 수 = {}", messages.length);
            agentLogService.append("발견된 대상 메일 수 = " + messages.length);

            for (Message message : messages) {
                try {
                    createdCount += handleMessage(message);
                    // 처리 완료 후 읽은 메일로 표시
                    message.setFlag(Flag.SEEN, true);
                } catch (Exception e) {
                    log.error("메일 처리 중 오류가 발생했습니다. subject={}", safeSubject(message), e);
                    agentLogService.append("메일 처리 오류: " + safeSubject(message) + " - " + e.getMessage());
                }
            }

            inbox.close(true);
            store.close();
        } catch (Exception e) {
            log.error("IMAP 연결 또는 메일 조회 중 오류가 발생했습니다.", e);
            agentLogService.append("오류: " + e.getMessage());
        }

        agentLogService.append("완료: " + createdCount + "개 기사 생성/수정");
        return createdCount;
    }

    private int handleMessage(Message message) throws Exception {
        String subject = message.getSubject();
        if (subject == null || !subject.contains("[보도자료]")) {
            return 0;
        }

        // 1차 필터: 보낸사람 화이트리스트 (리스트가 비어 있으면 전체 허용)
        List<String> allowedSenders = agentConfigService.getAllowedSenderEmails();
        if (!allowedSenders.isEmpty()) {
            String senderEmail = extractSenderEmail(message);
            if (senderEmail == null || !allowedSenders.stream().anyMatch(s -> s.equalsIgnoreCase(senderEmail))) {
                log.debug("AI Reporter: 보낸사람 미등록으로 스킵. from={}", senderEmail);
                return 0;
            }
        }

        String contentText = null;
        List<String> imageUrls = new ArrayList<>();

        Object content = message.getContent();

        if (content instanceof Multipart multipart) {
            for (int i = 0; i < multipart.getCount(); i++) {
                BodyPart part = multipart.getBodyPart(i);

                String disposition = part.getDisposition();
                String fileName = part.getFileName();

                boolean isAttachment = Part.ATTACHMENT.equalsIgnoreCase(disposition) || fileName != null;
                if (!isAttachment) {
                    continue;
                }

                try (InputStream is = part.getInputStream()) {
                    String lowerName = fileName != null ? fileName.toLowerCase() : "";

                    if (lowerName.endsWith(".hwp")) {
                        contentText = hwpParsingService.extractText(is);
                    } else if (isImageAttachment(part)) {
                        byte[] bytes = IoUtils.toByteArray(is);
                        String contentType = part.getContentType();
                        String url = imageService.uploadImage(bytes, fileName, contentType);
                        imageUrls.add(url);
                    }
                }
            }
        } else if (content instanceof String textContent) {
            contentText = textContent;
        }

        if (contentText == null || contentText.isBlank()) {
            log.warn("보도자료 메일이지만 본문 텍스트를 추출하지 못했습니다. subject={}", subject);
            agentLogService.append("본문 추출 실패: " + (subject != null ? subject.substring(0, Math.min(50, subject.length())) : ""));
            return 0;
        }

        // 수정요청 키워드 확인: [수정배포], [정정요청], [보도자료 정정요청] 등
        List<String> modKeywords = agentConfigService.getModificationKeywordsList();
        String matchingKeyword = modKeywords.stream()
                .filter(subject::contains)
                .findFirst()
                .orElse(null);

        if (matchingKeyword != null) {
            // 수정요청: 기존 기사 찾아 본문만 갱신
            String originalTitle = subject
                    .replace("[보도자료]", "")
                    .replace(matchingKeyword, "")
                    .trim();
            if (originalTitle.isBlank()) {
                log.warn("AI Reporter: 수정요청 메일이지만 원본 제목을 추출하지 못했습니다. subject={}", subject);
                return 0;
            }

            final String finalContent = contentText;
            return articleService.findFirstByTitleContainingOrderByIdDesc(originalTitle)
                    .map(article -> {
                        articleService.updateContent(article.getId(), finalContent);
                        log.info("AI Reporter: 기사 수정 완료. articleId={}, title={}", article.getId(), originalTitle);
                        agentLogService.append("기사 수정: " + originalTitle);
                        return 1;
                    })
                    .orElseGet(() -> {
                        log.warn("AI Reporter: 수정 대상 기사를 찾지 못했습니다. titlePart={}", originalTitle);
                        return 0;
                    });
        }

        // 신규 기사 생성
        String title = subject.replace("[보도자료]", "").trim();
        ArticleSaveRequest request = new ArticleSaveRequest(
                title,
                "보도자료",
                contentText,
                "AI Reporter",
                imageUrls
        );

        Long articleId = articleService.saveArticle(request);
        log.info("AI Reporter: 메일로부터 기사 생성 완료. articleId={}", articleId);
        agentLogService.append("기사 생성: " + title);
        return 1;
    }

    private String extractSenderEmail(Message message) throws MessagingException {
        Address[] from = message.getFrom();
        if (from == null || from.length == 0) return null;
        Address addr = from[0];
        if (addr instanceof InternetAddress ia) {
            return ia.getAddress();
        }
        return addr.toString();
    }

    private boolean isImageAttachment(BodyPart part) throws MessagingException {
        String contentType = part.getContentType();
        if (contentType != null && contentType.toLowerCase().startsWith("image/")) {
            return true;
        }

        String fileName = part.getFileName();
        if (fileName == null) return false;

        String lower = fileName.toLowerCase();
        return lower.endsWith(".jpg") || lower.endsWith(".jpeg")
                || lower.endsWith(".png") || lower.endsWith(".gif")
                || lower.endsWith(".bmp") || lower.endsWith(".webp");
    }

    private String safeSubject(Message message) {
        try {
            return message.getSubject();
        } catch (MessagingException e) {
            return "unknown";
        }
    }
}

