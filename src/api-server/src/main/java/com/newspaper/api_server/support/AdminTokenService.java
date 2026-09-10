package com.newspaper.api_server.support;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;

/**
 * 관리자 인증 토큰 발급/검증.
 *
 * <p>쿠키·세션을 쓰지 않고 {@code Authorization: Bearer <token>} 헤더로만 주고받습니다.
 * 그래서 CORS 에서 credentials 를 허용할 필요가 없고, CSRF 도 고려 대상이 아닙니다.</p>
 *
 * <p>토큰 형식: {@code base64url(subject:만료시각) + "." + base64url(HMAC-SHA256)}</p>
 */
@Service
public class AdminTokenService {

    private static final Logger log = LoggerFactory.getLogger(AdminTokenService.class);
    private static final String HMAC_ALGORITHM = "HmacSHA256";
    private static final Base64.Encoder ENCODER = Base64.getUrlEncoder().withoutPadding();
    private static final Base64.Decoder DECODER = Base64.getUrlDecoder();

    private final byte[] secret;
    private final boolean secretGenerated;
    private final Duration ttl;

    public AdminTokenService(
            @Value("${admin.token-secret:}") String configuredSecret,
            @Value("${admin.token-ttl-hours:12}") long ttlHours
    ) {
        if (configuredSecret == null || configuredSecret.isBlank()) {
            // 소스에 비밀값을 박아두지 않기 위해, 미설정 시에는 기동할 때마다 임의 키를 만듭니다.
            // (안전하지만 재기동하면 기존 토큰이 무효가 되어 다시 로그인해야 합니다)
            byte[] random = new byte[32];
            new SecureRandom().nextBytes(random);
            this.secret = random;
            this.secretGenerated = true;
        } else {
            this.secret = configuredSecret.getBytes(StandardCharsets.UTF_8);
            this.secretGenerated = false;
        }
        this.ttl = Duration.ofHours(Math.max(1, ttlHours));
    }

    @PostConstruct
    void warnIfSecretMissing() {
        if (secretGenerated) {
            log.warn("ADMIN_TOKEN_SECRET 가 설정되지 않아 임의 키를 생성했습니다. "
                    + "백엔드를 재기동하면 관리자가 다시 로그인해야 합니다. "
                    + ".env 에 ADMIN_TOKEN_SECRET 를 지정하세요.");
        }
    }

    /** 로그인 성공 시 토큰을 발급합니다. */
    public String issue(String subject) {
        return issueUntil(subject, Instant.now().plus(ttl).getEpochSecond());
    }

    /** 만료시각을 직접 지정해 발급합니다. (만료 동작 테스트용) */
    String issueUntil(String subject, long expiresAtEpochSecond) {
        String payload = ENCODER.encodeToString(
                (subject + ":" + expiresAtEpochSecond).getBytes(StandardCharsets.UTF_8));
        return payload + "." + ENCODER.encodeToString(sign(payload));
    }

    /** 서명과 만료시각이 모두 유효할 때만 true. */
    public boolean isValid(String token) {
        if (token == null || token.isBlank()) return false;

        int separator = token.lastIndexOf('.');
        if (separator <= 0 || separator == token.length() - 1) return false;

        String payload = token.substring(0, separator);
        byte[] providedSignature;
        byte[] decodedPayload;
        try {
            providedSignature = DECODER.decode(token.substring(separator + 1));
            decodedPayload = DECODER.decode(payload);
        } catch (IllegalArgumentException e) {
            return false;
        }

        // 타이밍 공격을 피하기 위해 상수 시간 비교
        if (!MessageDigest.isEqual(sign(payload), providedSignature)) return false;

        String decoded = new String(decodedPayload, StandardCharsets.UTF_8);
        int colon = decoded.lastIndexOf(':');
        if (colon < 0) return false;

        try {
            long expiresAt = Long.parseLong(decoded.substring(colon + 1));
            return Instant.now().getEpochSecond() < expiresAt;
        } catch (NumberFormatException e) {
            return false;
        }
    }

    private byte[] sign(String payload) {
        try {
            Mac mac = Mac.getInstance(HMAC_ALGORITHM);
            mac.init(new SecretKeySpec(secret, HMAC_ALGORITHM));
            return mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            throw new IllegalStateException("토큰 서명에 실패했습니다.", e);
        }
    }
}
