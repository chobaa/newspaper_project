# 관리자 인증 도입 및 CORS 정리

작성일: 2026-09-10
브랜치: `develop`

> **참고:** 이 문서에 실측 예시로 등장하는 `/api/admin/agent-config` 는 작업 당시에는 존재했지만,
> 이후 [AGENT_FEATURE_REMOVAL.md](AGENT_FEATURE_REMOVAL.md) 작업으로 삭제되었다.
> 아래 측정값은 당시 기록 그대로 남겨 둔다.

---

## 1. 문제 상황

"가끔 cross-origin 문제가 있다"는 제보에서 출발했는데, 원인을 파고들다 보니
**CORS 설정이 보호하는 것은 없으면서 깨지기만 하는 상태**라는 게 드러났다.

### 1-1. 쓰기·관리자 API 가 전부 무인증이었다

Spring Security 의존성이 없고, 세션도 쿠키도 쓰지 않았다.
관리자 로그인은 `AdminController` 에서 문자열 비교 후 `{"result":"OK"}` 만 돌려주고,
프론트가 `localStorage.isAdmin = true` 를 세우는 게 전부였다.

즉 서버 입장에서는 **아무나** 아래를 호출할 수 있었다.

```
POST   /api/articles
PUT    /api/articles/{id}
DELETE /api/articles/{id}
POST   /api/images
GET    /api/admin/**        ← 관리자 설정 조회도 공개 상태
PUT    /api/admin/**
```

실측으로 확인:

```
GET /api/admin/agent-config  (인증 없음, Origin 헤더도 없음)  ->  200
```

CORS 는 브라우저 안에서만 도는 정책이라 curl / Postman 은 그대로 통과한다.
**CORS 를 아무리 조여도 이건 막히지 않는다.**

### 1-2. CORS 허용 목록이 compose 에 하드코딩돼 있었다

`docker-compose.yml` 의 `environment:` 가 운영 도메인 2개만 지정하고 있었고,
이것이 `application.yml` 의 넓은 기본값을 덮어썼다. (`environment` 가 `env_file` 보다 우선)

```
CORS_ALLOWED_ORIGINS=https://xn--vg1b002am5bc0y3ga.com,https://www.xn--vg1b002am5bc0y3ga.com
```

여기에 `allowCredentials(true)` 가 켜져 있어서 와일드카드를 쓸 수 없었고,
포트·스킴·www 가 한 글자만 달라도 `403 Invalid CORS request` 가 났다.

재현:

| Origin | 결과 |
|---|---|
| `http://localhost` | 200 (동일 출처로 판정) |
| `https://xn--vg1b002am5bc0y3ga.com` | 200 (목록에 있음) |
| `http://localhost:5173` | **403 Invalid CORS request** |
| Origin 헤더 없음 | 200 |

평소에는 프론트가 `/api` 상대경로를 쓰고 nginx 가 프록시해서 동일 출처이므로 CORS 가 아예 안 돈다.
그래서 `npm run dev`(5173)로 개발하며 Vite 프록시를 타지 않는 순간에만 터졌다 — 이게 "가끔"의 정체다.

### 1-3. 백엔드가 nginx 뒤에 있다는 걸 Spring 이 몰랐다

`server.forward-headers-strategy` 가 설정돼 있지 않아, HTTPS 요청이 와도 백엔드는 자기 자신을
`http` / `8080` 으로 인식했다. Spring 이 동일 출처를 교차 출처로 오판할 여지가 있었고,
지금은 운영 도메인이 마침 허용 목록에 있어서 가려져 있을 뿐이었다.

거기에 `docker-compose.yml` 이 `ports: "8080:8080"` 으로 백엔드를 호스트에 직접 열고 있어서,
nginx 를 우회해 `X-Forwarded-*` 를 위조할 수 있는 경로도 있었다.

---

## 2. 개선 방향

> **인증을 먼저 넣고, 그 형태에 맞춰 CORS 를 정리한다.**

토큰을 **쿠키가 아니라 `Authorization: Bearer` 헤더**로 주고받기로 했다. 그러면

- CORS 에서 `allowCredentials` 를 켤 필요가 없다 → 와일드카드 패턴을 쓸 수 있다
- CSRF 를 고려할 필요가 없다 (브라우저가 자동으로 실어 보내는 자격증명이 없음)
- 나중에 CORS 설정을 다시 손볼 일이 없다

---

## 3. 백엔드 변경

### 3-1. `support/AdminTokenService.java` (신규)

HMAC-SHA256 으로 서명한 만료형 토큰을 발급/검증한다. JWT 라이브러리를 새로 들이지 않고
표준 라이브러리(`javax.crypto.Mac`)만 사용했다.

- 토큰 형식: `base64url(subject:만료시각) + "." + base64url(HMAC-SHA256)`
- 서명 비교는 `MessageDigest.isEqual` 로 **상수 시간 비교** (타이밍 공격 방지)
- `ADMIN_TOKEN_SECRET` 미설정 시 기동할 때마다 임의 키를 생성하고 경고 로그를 남긴다.
  소스에 비밀값을 박아두지 않기 위한 선택이며, 재기동하면 재로그인이 필요하다.
- 기본 유효기간 12시간 (`ADMIN_TOKEN_TTL_HOURS`)

### 3-2. `config/AdminAuthInterceptor.java` (신규)

`HandlerInterceptor` 로 `/api/**` 를 검사한다. 판정 기준:

| 조건 | 결과 |
|------|------|
| `OPTIONS` (preflight) | 통과 |
| `POST /api/admin/login` | 통과 |
| `/api/admin/**`, `/api/images**` | **메서드 무관 토큰 필요** |
| 그 외 `GET` / `HEAD` | 통과 (공개 조회) |
| 그 외 (POST/PUT/DELETE 등) | **토큰 필요** |

관리자 설정은 GET 이어도 공개되면 안 되므로 경로 기준 예외를 따로 뒀다.
실패 시 `401` 과 `{"error":"관리자 인증이 필요합니다. 다시 로그인해 주세요."}` 를 반환한다.

### 3-3. `AdminController`

- 로그인 성공 시 `{"result":"OK","token":"..."}` 반환
- 계정 정보를 소스 하드코딩에서 설정(`admin.username` / `admin.password`)으로 이동
- 아이디·비밀번호 비교도 `MessageDigest.isEqual` 로 상수 시간 비교

### 3-4. `WebConfig` — CORS 정리

```java
registry.addMapping("/**")
        .allowedOriginPatterns(origins)   // allowedOrigins → 패턴 지원
        .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
        .allowedHeaders("*")
        .maxAge(3600);                    // allowCredentials 제거
```

- `allowCredentials(true)` **제거**. 쿠키·세션을 쓰지 않으므로 켤 이유가 없고,
  켜져 있으면 와일드카드 패턴을 못 쓴다.
- `allowedOrigins` → `allowedOriginPatterns`. `http://localhost:[*]` 같은
  포트 와일드카드를 지원해서 포트 하나 때문에 403 이 나던 문제가 사라진다.
- 목록이 비어 있으면 CORS 매핑 자체를 등록하지 않는다(동일 출처만 허용).

### 3-5. `application.yml`

```yaml
server:
  port: 8080
  forward-headers-strategy: framework   # nginx 의 X-Forwarded-* 반영

cors:
  allowed-origins: ${CORS_ALLOWED_ORIGINS:...,http://localhost:[*],http://127.0.0.1:[*]}

admin:
  username: ${ADMIN_USERNAME:admin}
  password: ${ADMIN_PASSWORD:8593}
  token-secret: ${ADMIN_TOKEN_SECRET:}
  token-ttl-hours: ${ADMIN_TOKEN_TTL_HOURS:12}
```

`.env` 가 없는 환경에서도 그대로 뜨도록 기본값을 넉넉히 뒀다.

### 3-6. `docker-compose.yml`

- `environment:` 의 `CORS_ALLOWED_ORIGINS` 하드코딩 **제거** → `.env` 가 실제로 먹는다
- 백엔드 `ports: "8080:8080"` → `expose: "8080"`
  nginx 는 도커 네트워크로 `backend:8080` 에 접근하므로 동작에 지장이 없고,
  nginx 를 우회해 `X-Forwarded-*` 를 위조하는 경로가 막힌다.
  (`forward-headers-strategy` 를 켠 이상 이건 같이 가야 한다)

---

## 4. 프론트엔드 변경

### 4-1. `api/auth.js` (신규)

토큰 저장/조회/삭제와 변경 구독(`onAdminChange`). `localStorage` 접근은 전부 try/catch 로 감쌌다
(시크릿 모드 등에서 throw 될 수 있음).

### 4-2. `api/http.js` (신규)

```js
export async function authFetch(url, options = {}) { ... }
```

- 토큰이 있으면 `Authorization: Bearer` 헤더를 붙인다
- **401 이 오면 토큰을 지우고 `UnauthorizedError` 를 던진다** → 만료 시 자동 로그아웃
- 실패 응답에서 메시지를 뽑는 `readErrorMessage` 도 여기로 모았다
  (`NewsSection` 안에 있던 중복 구현 제거)

### 4-3. 호출부 교체

| 파일 | 교체 |
|------|------|
| `LoginModal` | 로그인 응답의 `token` 을 저장 |
| `Home` | 관리자 여부를 **토큰 보유 여부**로 판단. 로그아웃 시 토큰 삭제 + 홈으로 |
| `NewsSection` | 기사 저장/수정/삭제 → `authFetch` |
| `ArticleDetail` | 기사 수정/삭제 → `authFetch`, 관리자 UI 판정도 토큰 기준 |
| `ArticleForm` | 이미지 업로드/정리 → `authFetch` |
| `AdminPanel` | 관리자 API 15곳 전부 → `authFetch` |
| `BrandSettingsContext` | 브랜드 설정 저장(PUT) → `authFetch` |

공개 조회(`GET /api/articles/{id}`, `GET /api/brand-settings/{id}`, 로그인)는 그대로 `fetch` 를 쓴다.

> 이전에는 `localStorage.isAdmin` 플래그만 보고 관리자 UI 를 켰기 때문에,
> 콘솔에서 플래그만 세워도 관리자 화면이 열렸다. 이제는 토큰이 있어야 하고,
> 토큰이 유효하지 않으면 첫 요청에서 401 을 받고 곧바로 로그아웃된다.

---

## 5. 검증

### 자동 테스트

- 백엔드 `./gradlew test` — **49 tests, BUILD SUCCESSFUL**
  - `AdminTokenServiceTest` (신규) : 정상 발급/검증, 페이로드 변조, 서명 변조, 다른 키로 서명,
    만료 토큰, 형식 오류, 키 미설정 시 인스턴스별 격리
  - `AdminAuthInterceptorTest` (신규) : 공개 조회 통과, 로그인·preflight 통과,
    쓰기/관리자/이미지 차단, 유효 토큰 통과, 잘못된 Authorization 헤더 형식, 401 응답 본문
  - 기존 컨트롤러 슬라이스 테스트에 인터셉터를 `@Import` 해서
    **공개 조회가 인증에 걸리지 않는지**도 함께 검증
- 프론트 `vitest` — **27 tests passed**
  - `api/http.test.js` (신규) : 토큰 저장/삭제/구독, 헤더 주입, 기존 헤더 유지,
    토큰 없을 때 헤더 미부착, 401 시 토큰 삭제 + throw, 500 은 토큰 유지, 에러 메시지 파싱
- `npm run build` 정상 / 이번에 추가·수정한 파일 eslint 경고 0건

### 배포 후 실측

```
1. 인증 없이
   GET  /api/admin/agent-config  -> 401
   POST /api/articles            -> 401
   DEL  /api/articles/999999     -> 401
   POST /api/images/cleanup      -> 401

2. 공개 조회
   GET /api/articles/slider      -> 200
   GET /api/articles/summary     -> 200
   GET /api/brand-settings/...   -> 200
   GET /api/public/images/...    -> 200

3. 로그인
   올바른 비밀번호               -> 200, token 발급
   틀린 비밀번호                 -> 401

4. 토큰
   유효한 토큰 + 보호된 API      -> 200
   위조한 토큰                   -> 401

5. CORS (preflight)
   http://localhost:5173         -> 200  (이전에는 403)
   http://localhost:3000         -> 200
   https://xn--vg1b002am5bc0y3ga.com -> 200
   https://evil.example.com      -> 403

6. 포트 노출
   http://localhost:8080         -> 접근 불가 (nginx 경유만 가능)
```

### 브라우저 실측

- 비로그인 상태로 홈 정상 렌더 (기사 25건)
- 로그인 → 관리자 메뉴 노출 → 관리자 패널의 `GET /api/admin/agent-config` **200**
  (실제 번들이 `Authorization` 헤더를 붙이는지 확인)
- 토큰을 임의 값으로 바꾸고 관리자 패널 진입 → **401 → 토큰 자동 삭제 → 로그아웃**

---

## 6. 운영 시 해야 할 일

1. **`ADMIN_PASSWORD` 를 바꿀 것.** 기존 값(`8593`)이 그대로 `.env` 에 들어가 있고,
   소스에도 기본값으로 남아 있다(하위 호환용). `.env` 에서 바꾸면 즉시 적용된다.
2. **`ADMIN_TOKEN_SECRET` 은 이미 `.env` 에 임의 값으로 생성해 뒀다.**
   `.env` 는 `.gitignore` 에 있으므로 저장소에 올라가지 않는다.
   → **다른 서버에 배포한다면 그 서버의 `.env` 에도 직접 넣어야 한다.**
3. 배포 워크플로 확인 필요. `.github/workflows/deploy.yml` 이 쓰는 러너 체크아웃
   (`actions-runner/_work/newspaper_project/newspaper_project/`)은 2026-01 이후 갱신되지 않았고
   `.env` 도 없다. 현재 실제 배포는 로컬 디렉터리에서 수동으로 이뤄지는 것으로 보인다.

## 7. 후속 수정 (2026-09-11) — 토큰 만료 처리

인증을 넣은 다음 날 "기사 작성에서 사진이 안 올라간다. 서버와 MinIO 확인하라고 나온다" 는 제보가 왔다.

### 확인한 것

서버·MinIO 모두 정상이었고, 업로드 API 도 정상이었다.

```
POST /api/images  (토큰 있음)  -> 200, /api/public/images/...
POST /api/images  (토큰 없음)  -> 401
```

nginx 접근 로그를 보니 사용자 브라우저가 01:37~02:33 동안 `POST /api/images` 에 대해
**401 을 반복해서 받고 있었고, 그 구간에 로그인 요청이 없었다.**
전날 13:06 에 받아간 번들은 최신이었으므로 캐시 문제도 아니었다.
→ **토큰(TTL 12시간)이 만료된 상태**였다.

### 문제 1 — 만료된 토큰을 "로그인 상태" 로 봤다

`getAdminToken()` 이 **토큰의 존재 여부만** 확인했다.
만료된 토큰이 `localStorage` 에 남아 있으면

- 관리자 UI 는 그대로 열리고
- 저장·업로드만 401 로 실패한다

사용자 입장에서는 "로그인은 되어 있는데 사진만 안 올라가는" 상태로 보인다.

**수정:** `auth.js` 가 토큰 페이로드의 만료시각을 읽어, 지났으면 없는 것으로 처리하고
저장소에서도 지운다. 서명은 서버만 검증할 수 있으므로 여기서는 만료 여부만 본다.
(렌더 중에 호출될 수 있어 상태 변경 알림은 다음 틱으로 미룬다)

### 문제 2 — 401 을 서버 장애로 안내했다

`ArticleForm.jsx` 의 catch 가 실제 오류를 버리고 고정 문구를 띄웠다.

```js
alert("이미지 업로드에 실패했습니다. 서버와 MinIO가 동작 중인지 확인해 주세요.");
```

인증 만료(401)든 뭐든 전부 "서버와 MinIO 확인" 으로 나와서 엉뚱한 곳을 보게 만들었다.

**수정:** `describeUploadError()` 를 두어 401 은 "관리자 로그인이 만료되었습니다. 다시 로그인해 주세요",
나머지는 실제 오류 메시지를 그대로 보여준다.

### 문제 3 — 만료되면 작성 중인 기사가 날아갔다

`NewsSection` 에 `if (!isAdmin) setIsWriting(false)` 가 있어서,
토큰이 만료되어 관리자 상태가 풀리는 순간 편집기가 닫히고 쓰던 기사가 사라졌다.

**수정:** 미저장 내용(`window.__articleDirty`)이 있으면 편집기를 닫지 않는다.
다시 로그인한 뒤 저장하면 된다.

### 문제 4 — 배포해도 사용자에게 도달하지 않는다

고친 번들을 배포했는데도 브라우저가 **옛 번들을 계속 불러왔다.**
nginx 에 캐시 헤더가 전혀 없어서 브라우저가 `index.html` 을 임의로 캐싱하고 있었다.
번들 파일명에는 해시가 붙는데, 그 파일명을 가리키는 `index.html` 이 낡으면 새 번들을 받을 길이 없다.

**수정:** `deployment/nginx/nginx.conf` 의 SPA 서빙 블록 3곳에

```nginx
location /assets/ {
    add_header Cache-Control "public, max-age=31536000, immutable";
    try_files $uri =404;
}
location = /index.html {
    add_header Cache-Control "no-cache, must-revalidate";
}
```

확인:

```
index.html   Cache-Control: no-cache, must-revalidate
assets/*.js  Cache-Control: public, max-age=31536000, immutable
```

> 이미 옛 `index.html` 을 캐시에 들고 있는 브라우저는 **한 번은 강력 새로고침(Ctrl+F5)** 이 필요하다.
> 그 뒤로는 항상 최신 번들을 받는다.

### 검증

새 번들 기준:

| 상황 | 결과 |
|------|------|
| 만료 토큰을 심어두고 홈 진입 | 토큰 자동 삭제, 관리자 메뉴 숨김, 푸터가 "관리자 로그인" 으로 표시 |
| 로그인 | 200, 만료까지 12.0시간 |
| 로그인 후 이미지 업로드 | 200, `/api/public/images/...` 반환 |

프론트 테스트 31개 통과 (`auth.expiry.test.js` 4개 추가).

### 참고

- 토큰 유효기간은 `.env` 의 `ADMIN_TOKEN_TTL_HOURS` 로 조절한다(기본 12).
  매일 다시 로그인하는 게 번거로우면 늘릴 수 있지만, 그만큼 토큰이 탈취됐을 때의 유효 시간도 길어진다.

---

## 8. 남은 과제

- 토큰이 `localStorage` 에 저장되므로 XSS 가 발생하면 탈취될 수 있다.
  본문은 관리자만 작성하지만, 상세 페이지가 `dangerouslySetInnerHTML` 로 HTML 을 렌더하므로
  본문 sanitize(이미 `dompurify` 의존성은 있음)를 검토할 가치가 있다.
- 계정이 하나뿐이고 비밀번호가 평문 비교다. 사용자가 늘어나면 해시 저장으로 옮겨야 한다.
- 로그인 시도 횟수 제한이 없다.
