# Newspaper Frontend

## 두 개의 브랜드 프론트엔드 구조

- 백엔드(Spring Boot, `/api/**`)와 DB는 공용.
- 프론트엔드는 **같은 코드**를 사용하지만, `VITE_BRAND` 값에 따라
  - `primary` 브랜드 (예: NEWSPAPER)
  - `secondary` 브랜드 (예: DAILY FOCUS)
  로 이름·배너·색상·푸터·광고 문구를 분리한다.

### 개발 서버 실행

- 1번 신문사:

```bash
cd src/newspaper-frontend
npm install
npm run dev:primary
```

- 2번 신문사(다른 포트에서 동시에 실행):

```bash
cd src/newspaper-frontend
npm run dev:secondary
```

- `vite.config.js` 의 프록시 설정 덕분에 두 서버 모두 `http://localhost:8080` 백엔드의 `/api/**`를 공용으로 사용한다.

### 빌드

- 1번 신문사 빌드: `npm run build:primary`
- 2번 신문사 빌드: `npm run build:secondary`

