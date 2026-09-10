# API 매핑 정리 (백엔드 ↔ 프론트엔드)

## 백엔드 엔드포인트

| 메서드 | 경로 | 컨트롤러 | 용도 |
|--------|------|----------|------|
| GET | `/api/articles` | ArticleApiController | 기사 목록 조회 (본문 포함, 하위 호환용 — 프론트 미사용) |
| POST | `/api/articles` | ArticleApiController | 기사 저장 |
| GET | `/api/articles/{id}` | ArticleApiController | 기사 상세 조회 |
| PUT | `/api/articles/{id}` | ArticleApiController | 기사 수정 |
| DELETE | `/api/articles/{id}` | ArticleApiController | 기사 삭제 |
| GET | `/api/articles/home` | ArticleApiController | 홈용 요약 목록 (본문 8,000자 컷, 하위 호환용) |
| GET | `/api/articles/home-sections` | ArticleApiController | 홈 헤드라인 + 카테고리별 위젯 기사 |
| GET | `/api/articles/summary` | ArticleApiController | 카테고리 목록 / 검색 (서버 페이지네이션, 본문 제외) |
| GET | `/api/articles/{id}/related` | ArticleApiController | 상세 페이지 추천뉴스 |
| GET | `/api/articles/slider` | ArticleApiController | 사이드바 슬라이더 (많이 본 / 실시간 급상승) |
| POST | `/api/images` | ImageApiController | 이미지 업로드 (MinIO) |
| POST | `/api/agent/fetch` | AgentController | AI 에이전트 수동 실행 |
| GET | `/api/admin/agent-config` | AgentConfigController | 에이전트 설정 조회 |
| POST | `/api/admin/agent-config/senders` | AgentConfigController | 보낸사람 추가 |
| DELETE | `/api/admin/agent-config/senders/{id}` | AgentConfigController | 보낸사람 삭제 |
| POST | `/api/admin/agent-config/modification-keywords` | AgentConfigController | 수정요청 키워드 추가 |
| DELETE | `/api/admin/agent-config/modification-keywords/{id}` | AgentConfigController | 수정요청 키워드 삭제 |

## 프론트엔드 호출

| 컴포넌트 | 메서드 | 경로 | 용도 |
|----------|--------|------|------|
| NewsSection | GET | `/api/articles/home-sections` | 홈 헤드라인 + 카테고리 위젯 |
| NewsSection | GET | `/api/articles/summary` | 카테고리 목록 / 검색 결과 (페이지 단위) |
| NewsSection | GET | `/api/articles/{id}` | 관리자 수정 시 본문 로드 |
| NewsSection | POST | `/api/articles` | 기사 저장 |
| NewsSection | PUT | `/api/articles/{id}` | 기사 수정 |
| NewsSection | DELETE | `/api/articles/{id}` | 기사 삭제 |
| ArticleDetail | GET | `/api/articles/{id}` | 기사 본문 조회 |
| ArticleDetail | GET | `/api/articles/{id}/related` | 추천뉴스 (본문 조회와 병렬) |
| NewsSlider | GET | `/api/articles/slider` | 사이드바 인기/급상승 |
| AgentConfigPanel | GET | `/api/admin/agent-config` | 에이전트 설정 로드 |
| AgentConfigPanel | POST | `/api/admin/agent-config/senders` | 보낸사람 추가 |
| AgentConfigPanel | DELETE | `/api/admin/agent-config/senders/{id}` | 보낸사람 삭제 |
| AgentConfigPanel | POST | `/api/admin/agent-config/modification-keywords` | 수정요청 키워드 추가 |
| AgentConfigPanel | DELETE | `/api/admin/agent-config/modification-keywords/{id}` | 수정요청 키워드 삭제 |

## 매핑 상태

- 위 매핑은 모두 일치함.
- Docker 사용 시 변경 사항 반영을 위해 `docker-compose up -d --build` 실행 필요.
- 목록/위젯 API가 경량 요약 응답으로 바뀐 배경과 측정 결과는 [PERFORMANCE_LIST_LOADING.md](PERFORMANCE_LIST_LOADING.md) 참고.

## 인증

`POST /api/admin/login` 이 관리자 토큰을 발급하고, 이후 보호된 요청은
`Authorization: Bearer <token>` 헤더를 요구한다. (쿠키/세션 미사용)

| 구분 | 대상 | 토큰 |
|------|------|------|
| 공개 | `GET /api/articles/**`, `GET /api/public/images/**`, `GET /api/brand-settings/**`, `GET /api/health`, `POST /api/admin/login`, 모든 `OPTIONS` | 불필요 |
| 보호 | `/api/admin/**`(로그인 제외), `/api/agent/**`, `/api/images**` — 메서드 무관 | **필요** |
| 보호 | 그 외 모든 쓰기 요청 (`POST`/`PUT`/`DELETE`) | **필요** |

프론트는 `src/api/http.js` 의 `authFetch()` 로 호출하며, 401 을 받으면 토큰을 지우고 자동 로그아웃한다.
자세한 배경은 [SECURITY_ADMIN_AUTH.md](SECURITY_ADMIN_AUTH.md) 참고.

## Windows에서 검색 (PowerShell)

```powershell
# agent-config 또는 admin 관련 코드 검색
Select-String -Path "src\api-server\src\main\java\**\*.java" -Pattern "agent-config|/admin" -Recurse
```
