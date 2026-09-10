package com.newspaper.api_server.support;

import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

class AdminTokenServiceTest {

    private AdminTokenService service(String secret) {
        return new AdminTokenService(secret, 12);
    }

    @Test
    void issuedTokenIsAccepted() {
        AdminTokenService service = service("test-secret");

        assertThat(service.isValid(service.issue("admin"))).isTrue();
    }

    @Test
    void rejectsTamperedPayload() {
        AdminTokenService service = service("test-secret");
        String token = service.issue("admin");

        String tampered = "x" + token;

        assertThat(service.isValid(tampered)).isFalse();
    }

    @Test
    void rejectsTamperedSignature() {
        AdminTokenService service = service("test-secret");
        String token = service.issue("admin");
        String payload = token.substring(0, token.lastIndexOf('.'));

        assertThat(service.isValid(payload + ".YWJjZGVm")).isFalse();
    }

    @Test
    void rejectsTokenSignedWithAnotherSecret() {
        String token = service("secret-one").issue("admin");

        assertThat(service("secret-two").isValid(token)).isFalse();
    }

    @Test
    void rejectsExpiredToken() {
        AdminTokenService service = service("test-secret");
        String expired = service.issueUntil("admin", Instant.now().getEpochSecond() - 1);

        assertThat(service.isValid(expired)).isFalse();
    }

    @Test
    void acceptsTokenThatHasNotExpiredYet() {
        AdminTokenService service = service("test-secret");
        String token = service.issueUntil("admin", Instant.now().getEpochSecond() + 60);

        assertThat(service.isValid(token)).isTrue();
    }

    @Test
    void rejectsMalformedTokens() {
        AdminTokenService service = service("test-secret");

        assertThat(service.isValid(null)).isFalse();
        assertThat(service.isValid("")).isFalse();
        assertThat(service.isValid("no-separator")).isFalse();
        assertThat(service.isValid(".")).isFalse();
        assertThat(service.isValid("payload.")).isFalse();
        assertThat(service.isValid("!!!.!!!")).isFalse();
    }

    @Test
    void generatesRandomSecretWhenNotConfigured() {
        // 미설정이면 인스턴스마다 다른 키를 쓰므로, 서로의 토큰을 받아들이면 안 됩니다.
        AdminTokenService first = new AdminTokenService("", 12);
        AdminTokenService second = new AdminTokenService(null, 12);

        assertThat(first.isValid(first.issue("admin"))).isTrue();
        assertThat(second.isValid(first.issue("admin"))).isFalse();
    }
}
