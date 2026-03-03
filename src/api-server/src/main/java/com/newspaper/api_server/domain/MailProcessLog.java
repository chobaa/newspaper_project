package com.newspaper.api_server.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * 메일 처리 로그 엔티티
 * 각 메일별로 처리 결과를 기록
 */
@Entity
@Getter
@NoArgsConstructor
public class MailProcessLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String subject; // 메일 제목

    private String senderEmail; // 발신자 이메일

    @Column(nullable = false)
    private LocalDateTime receivedDate; // 메일 수신 시간

    @Column(nullable = false)
    private LocalDateTime processedDate = LocalDateTime.now(); // 처리 시간

    @Column(nullable = false)
    private Boolean success; // 성공 여부

    private String errorMessage; // 실패 시 에러 메시지

    private Long articleId; // 생성/수정된 기사 ID

    @ElementCollection
    @CollectionTable(name = "mail_process_log_attachments", joinColumns = @JoinColumn(name = "log_id"))
    @Column(name = "attachment_name")
    private List<String> attachments = new ArrayList<>(); // 첨부파일 목록

    private String hwpFileName; // HWP 파일명

    @ElementCollection
    @CollectionTable(name = "mail_process_log_images", joinColumns = @JoinColumn(name = "log_id"))
    @Column(name = "image_name")
    private List<String> imageFileNames = new ArrayList<>(); // 이미지 파일명 목록

    public MailProcessLog(String subject, String senderEmail, LocalDateTime receivedDate,
            Boolean success, String errorMessage, Long articleId) {
        this.subject = subject;
        this.senderEmail = senderEmail;
        this.receivedDate = receivedDate;
        this.success = success;
        this.errorMessage = errorMessage;
        this.articleId = articleId;
    }

    public void addAttachment(String fileName) {
        this.attachments.add(fileName);
    }

    public void setHwpFileName(String hwpFileName) {
        this.hwpFileName = hwpFileName;
    }

    public void addImageFileName(String imageFileName) {
        this.imageFileNames.add(imageFileName);
    }

    public void setArticleId(Long articleId) {
        this.articleId = articleId;
    }

    public void setSuccess(Boolean success) {
        this.success = success;
    }

    public void setErrorMessage(String errorMessage) {
        this.errorMessage = errorMessage;
    }
}
