# 메일 수집 에이전트 기능 제거

작성일: 2026-09-10
브랜치: `develop`

---

## 1. 배경

`/api/agent/*` 는 이미 삭제된 기능인데, 관련 코드가 저장소 곳곳에 남아 있었다.
`SECURITY_ADMIN_AUTH.md` 작업 중 프론트가 존재하지 않는 `/api/agent/fetch` 를 호출하는 걸
발견해서, 남은 잔해를 정리했다.

## 2. 삭제 전 확인한 것

지우기 전에 "정말 죽은 코드인지" 를 아래 순서로 확인했다.

### 2-1. 엔진이 이미 없다

에이전트의 실제 동작부가 전부 사라진 상태였다.

| 확인 항목 | 결과 |
|-----------|------|
| `/api/agent/**` 컨트롤러 | **없음** (프론트만 호출하고 있었음) |
| `@Scheduled` / `@EnableScheduling` | **없음** |
| IMAP 메일 수신 코드 (`jakarta.mail`, `imaps`) | **없음** |
| `GeminiService` | **없음** (`application.yml` 이 로깅 레벨만 걸어두고 있었음) |
| `hwplib` (HWP 파싱) 사용처 | **없음** |
| `WebClient` 사용처 | **없음** |

남아 있던 건 설정·로그를 저장하는 **껍데기 CRUD** 뿐이었다.
동작할 엔진이 없으니 허용 발신자/키워드/스케줄/로그는 아무 의미가 없었다.

### 2-2. 프론트에서 렌더되지 않는다

`AdminPanel` 이 관련 상태와 핸들러를 들고 있었지만, `return` 이후 JSX 에서 **단 한 번도 쓰이지 않았다.**
(eslint 도 `config`, `fetching`, `scheduleConfig`, `mailLogs`, `runFetchNow`, `runAiSummary`,
`addSender`, `removeSender`, `addKeyword`, `removeKeyword` 등을 전부 `no-unused-vars` 로 잡고 있었다)

### 2-3. 데이터가 사실상 없다

| 테이블 | 행 수 |
|--------|-------|
| `allowed_sender` | 0 |
| `mail_process_log` | 0 |
| `mail_process_log_attachments` | 0 |
| `mail_process_log_images` | 0 |
| `modification_keyword` | 2 (시더가 넣은 기본값) |
| `schedule_config` | 1 (기본 설정 1행) |

### 2-4. 공유 코드 사용처 확인

에이전트 전용으로 보이는 메서드가 다른 곳에서 쓰이는지 확인했고, **호출자가 없었다.**

- `ArticleService.updateContent()` — 주석에 "수정요청 메일 처리용"
- `ArticleService.findFirstByTitleContainingOrderByIdDesc()` — 주석에 "수정요청 매칭용"
- `ArticleRepository.findFirstByTitleContainingOrderByIdDesc()`
- `Article.updateContent()`

반면 `ImageService.uploadImage(byte[], ...)` 오버로드는 `uploadImage(MultipartFile)` 이
내부적으로 쓰고 있어서 **남겨 뒀다.**

---

## 3. 삭제한 것

### 3-1. 백엔드 파일 14개

```
config/AgentConfigSeeder.java
dto/AgentConfigDto.java
dto/ScheduleDto.java
service/AgentConfigService.java
service/AgentLogService.java
service/ScheduleService.java
domain/AllowedSender.java
domain/ModificationKeyword.java
domain/MailProcessLog.java
domain/ScheduleConfig.java
repository/AllowedSenderRepository.java
repository/ModificationKeywordRepository.java
repository/MailProcessLogRepository.java
repository/ScheduleConfigRepository.java
```

### 3-2. 백엔드 엔드포인트 11개 (`AdminController`)

```
GET    /api/admin/agent-config
POST   /api/admin/agent-config/senders
DELETE /api/admin/agent-config/senders/{id}
POST   /api/admin/agent-config/modification-keywords
DELETE /api/admin/agent-config/modification-keywords/{id}
GET    /api/admin/agent-config/logs
DELETE /api/admin/agent-config/logs
GET    /api/admin/schedule-config
PUT    /api/admin/schedule-config
GET    /api/admin/mail-process-logs
DELETE /api/admin/mail-process-logs
```

`AdminController` 에 남은 것: 로그인, 브랜드 자산 업로드/삭제, 고아 이미지 정리, 브랜드 설정 저장.

### 3-3. 죽은 의존성 (`build.gradle`)

```
spring-boot-starter-mail    (IMAP/SMTP)
kr.dogfoot:hwplib           (HWP 파싱)
spring-boot-starter-webflux (Gemini 호출용 WebClient)
```

세 개 모두 `src/main/java` 에서 사용처가 0곳이었다.
webflux 를 걷어내면 servlet/reactive 웹 타입이 섞여 있던 모호함도 함께 사라진다.

### 3-4. 죽은 설정

- `application.yml` : `spring.mail.*`, `gemini.*`, `logging.level`(없는 `GeminiService` 대상)
- `application-test.yml` : `spring.mail.*`, `gemini.enabled`
- `.env` : `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `GEMINI_API_KEY`

> `application.yml` 의 `spring.mail.username: ${MAIL_USERNAME}` 은 **기본값이 없었다.**
> `.env` 에 해당 값이 없으면 기동이 실패하는 구조였으므로, 이걸 걷어낸 건 부수적인 안정성 개선이기도 하다.

### 3-5. 프론트엔드 (`AdminPanel.jsx`)

- 상태 13개 제거 : `config`, `senderInput`, `keywordInput`, `loading`, `error`, `fetching`,
  `scheduleConfig`, `scheduleForm`, `scheduleLoading`, `scheduleDirty`,
  `mailLogs`, `mailLogsLoading`, `summaryLoading`
- 핸들러 12개 제거 : `fetchConfig`, `fetchScheduleConfig`, `saveScheduleConfig`, `handleScheduleChange`,
  `fetchMailLogs`, `clearMailLogs`, `runFetchNow`, `runAiSummary`,
  `addSender`, `removeSender`, `addKeyword`, `removeKeyword`
- `useEffect(() => { fetchConfig(); }, [])` 제거

> **주의했던 부분:** `loading` / `error` 는 렌더 게이트
> (`if (loading) return <div>로딩 중...</div>`)로 쓰이고 있었는데, 값을 채우는 게
> 삭제 대상인 `fetchConfig()` 뿐이었다. 그대로 지웠으면 관리자 패널이 **영영 "로딩 중" 에서 멈춘다.**
> 게이트까지 함께 제거했고, 실제로 패널이 정상 렌더되는지 브라우저로 확인했다.

`AdminPanel.jsx` 의 eslint 오류가 **22개 → 5개**로 줄었다.
(남은 5개는 `display`, `saveBrandConfigLocal` 미사용 등 에이전트와 무관한 기존 항목)

### 3-6. 인증 규칙

`AdminAuthInterceptor` 의 보호 경로 목록에서 `/api/agent/` 제거.
관련 테스트도 실재하는 엔드포인트를 예시로 쓰도록 수정했다.

### 3-7. 문서

- `README.md` : 7절을 실제 기능(표시 설정/배너)에 맞게 수정, 인증 절 추가,
  접속 표에서 `:8080` 직접 접근 삭제
- `docs/API_MAPPING.md` : 존재하지 않는 `AgentController` / `AgentConfigPanel` 행 삭제,
  실제 엔드포인트로 갱신
- `docs/SECURITY_ADMIN_AUTH.md` : 실측 예시로 쓰인 `/api/admin/agent-config` 가
  이후 삭제되었다는 주석 추가 (측정 기록 자체는 보존)

---

## 4. 남겨 둔 것

### DB 테이블

`ddl-auto: update` 는 테이블을 **드롭하지 않으므로** 아래 테이블은 그대로 남아 있다.
엔티티가 없으니 애플리케이션은 더 이상 건드리지 않으며, 동작에 영향은 없다.

```
allowed_sender
modification_keyword
schedule_config
mail_process_log
mail_process_log_attachments
mail_process_log_images
```

정리하고 싶다면 **백업 후** 아래를 직접 실행하면 된다. (되돌릴 수 없으므로 자동 실행하지 않았다)

```sql
DROP TABLE IF EXISTS mail_process_log_attachments;
DROP TABLE IF EXISTS mail_process_log_images;
DROP TABLE IF EXISTS mail_process_log;
DROP TABLE IF EXISTS allowed_sender;
DROP TABLE IF EXISTS modification_keyword;
DROP TABLE IF EXISTS schedule_config;
```

### 그 외

- `TestController` 의 `/hello` 도 쓰이지 않지만, 에이전트와 무관해서 이번 범위에서 제외했다.

---

## 5. 검증

- 백엔드 `./gradlew test` — **BUILD SUCCESSFUL**
- 프론트 `vitest` — **27 tests passed**, `npm run build` 정상
- 재배포 후 백엔드 기동 로그에 에러 없음 (빈 컴포넌트 스캔/빈 누락 없음)

삭제된 엔드포인트 (유효한 관리자 토큰으로 호출):

```
GET  /api/admin/agent-config       -> 404
GET  /api/admin/schedule-config    -> 404
GET  /api/admin/mail-process-logs  -> 404
POST /api/agent/fetch              -> 404
```

살아있는 기능:

```
GET  /api/articles/slider              -> 200
GET  /api/brand-settings/primary       -> 200
GET  /api/health                       -> 200
POST /api/admin/cleanup-orphan-images  -> 200
```

브라우저:

- 홈 정상 렌더, 새 탭 기준 **콘솔 에러 0건**
- 로그인 후 관리자 패널 정상 렌더 (로딩 게이트 제거가 의도대로 동작)
