# API 매핑 정리 (백엔드 ↔ 프론트엔드)

## 백엔드 엔드포인트

| 메서드 | 경로 | 컨트롤러 | 용도 |
|--------|------|----------|------|
| GET | `/api/articles` | ArticleApiController | 기사 목록 조회 |
| POST | `/api/articles` | ArticleApiController | 기사 저장 |
| GET | `/api/articles/{id}` | ArticleApiController | 기사 상세 조회 |
| DELETE | `/api/articles/{id}` | ArticleApiController | 기사 삭제 |
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
| NewsSection | GET | `/api/articles` | 기사 목록 로드 |
| NewsSection | POST | `/api/articles` | 기사 저장 |
| NewsSection | DELETE | `/api/articles/{id}` | 기사 삭제 |
| AgentConfigPanel | GET | `/api/admin/agent-config` | 에이전트 설정 로드 |
| AgentConfigPanel | POST | `/api/admin/agent-config/senders` | 보낸사람 추가 |
| AgentConfigPanel | DELETE | `/api/admin/agent-config/senders/{id}` | 보낸사람 삭제 |
| AgentConfigPanel | POST | `/api/admin/agent-config/modification-keywords` | 수정요청 키워드 추가 |
| AgentConfigPanel | DELETE | `/api/admin/agent-config/modification-keywords/{id}` | 수정요청 키워드 삭제 |

## 매핑 상태

- 위 매핑은 모두 일치함.
- Docker 사용 시 변경 사항 반영을 위해 `docker-compose up -d --build` 실행 필요.

## Windows에서 검색 (PowerShell)

```powershell
# agent-config 또는 admin 관련 코드 검색
Select-String -Path "src\api-server\src\main\java\**\*.java" -Pattern "agent-config|/admin" -Recurse
```
