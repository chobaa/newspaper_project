# 목록/추천뉴스 로딩 성능 개선

작성일: 2026-09-10
브랜치: `develop`

---

## 1. 문제 상황

운영 중인 홈페이지에서 두 가지 증상이 보고됐다.

1. **메인 화면의 카테고리 위젯에 기사가 3건이 안 뜬다.** (예: `성남시정` 위젯에 1건만 노출)
2. **카테고리 메뉴를 누르거나 기사 상세로 들어갔을 때, 목록/추천뉴스가 너무 늦게 뜬다.**

요구사항은 "미리 당겨오는 프리페치까지는 필요 없고, **누른 순간 그 페이지에 필요한 것만 빠르게** 로딩되면 된다"였다.

---

## 2. 원인 분석

### 2-1. 전체 기사를 본문까지 통째로 내려받고 있었다

`GET /api/articles` 는 DB의 모든 기사를 `ArticleResponse` 로 변환해서 **본문(content) 전체를 포함**해 반환한다.
현재 운영 DB 기준 기사 4,790건 / 본문 합계 약 13.6MB이고, JSON 직렬화 후 실제 응답은 **약 15.6MB, 응답 시간 11.6초**였다.

이 엔드포인트를 호출하는 곳이 두 군데였다.

| 화면 | 호출 위치 | 하는 일 |
|------|-----------|---------|
| 카테고리 목록 | `NewsSection` (`category !== "전체"` 일 때 `mode: "full"`) | 전체를 받아서 **브라우저에서** 카테고리 필터 + 10건씩 페이징 |
| 기사 상세 - 추천뉴스 | `ArticleDetail` | 전체를 받아서 같은 카테고리 3건만 골라냄 |

즉 3건짜리 추천뉴스를 그리려고 15.6MB를 받고 있었다. 게다가 상세 페이지에서는 추천뉴스 요청이
`useEffect(..., [article])` 로 묶여 있어서 **본문 조회가 끝난 뒤에야** 시작됐다(직렬 실행).

### 2-2. 홈 위젯은 "최신 80건" 안에서만 카테고리를 골라내고 있었다

홈 화면은 `GET /api/articles/home?limit=80` 으로 최신 80건을 받은 뒤, 프론트에서
`articles.filter(a => a.category === "성남시정").slice(0, 3)` 방식으로 위젯을 채웠다.

그래서 최근 80건이 특정 카테고리(성남시의회 등)에 쏠려 있으면, DB에 기사가 2,115건 있는 `성남시정` 도
위젯에 1건밖에 안 나왔다. **DB에 기사가 없어서가 아니라, 조회 범위 밖이라서 안 나온 것**이다.

### 2-3. 썸네일/요약을 만들려고 본문 HTML을 브라우저로 실어 날랐다

카드에 실제로 필요한 건 `요약문 300자` + `썸네일 URL 1개`뿐인데, 이걸 뽑으려고 본문 HTML 전체를 받아서
브라우저에서 정규식으로 파싱하고 있었다. (`/api/articles/home` 도 본문을 8,000자로 자를 뿐 여전히 267KB)

### 2-4. 부수적인 문제

- `useArticles` 훅이 언마운트 시 `AbortController.abort()` 를 호출하는데, 이 fetch promise는 캐시를 통해
  다른 컴포넌트와 **공유**되고 있었다. 화면을 빠르게 전환하면 남아 있는 컴포넌트의 요청까지 취소돼
  "가끔 안 뜨는" 증상의 원인이 될 수 있었다.
- 사이드바 슬라이더(`NewsSlider`)도 인기뉴스 5건을 그리려고 홈 API 80건(267KB)을 받고 있었다.
- 홈/헤더의 8개 카테고리 목록이 `Header.jsx` 와 `NewsSection.jsx` 에 각각 하드코딩돼 있었다.

---

## 3. 개선 방향

> **화면이 필요로 하는 만큼만, 서버에서 잘라서 준다.**

- 목록/위젯은 본문을 아예 내려보내지 않는다. 요약문과 썸네일은 **서버에서 미리 계산**해서 준다.
- 카테고리별 조회는 **카테고리마다 따로 질의**해서, 최신 기사 쏠림과 무관하게 항상 N건을 채운다.
- 페이징/검색은 **서버 페이지네이션**으로 옮겨서, 한 페이지에 필요한 10건만 받는다.
- 상세 페이지의 본문 조회와 추천뉴스 조회는 **병렬**로 실행한다.

---

## 4. 백엔드 변경

### 4-1. `support/ArticleSummarizer.java` (신규)

프론트에 흩어져 있던 추출 로직을 서버로 옮긴 유틸.

- `normalize()` : 에디터가 남기는 `&amp;nbsp;` / `&nbsp;` 를 공백으로 정리
- `summarize()` : 태그 제거 후 앞 300자 (`300자 초과 시 "..." 부착`)
- `thumbnail()` : 본문 첫 `<img src="...">` 를 썸네일로 사용, 없으면 유튜브 영상 ID를 찾아
  `https://img.youtube.com/vi/{id}/hqdefault.jpg` 로 대체 (`video=true` 플래그 반환)
- `decodeEntities()` : `&amp;` / `&#39;` 같은 엔티티 복원 — 이걸 안 하면 이미지 URL이 깨진다

기존 프론트 로직과 동일한 결과가 나오도록 맞췄고, 유튜브 URL 패턴은
`youtube.com/embed/`, `youtube.com/watch?...v=`, `youtu.be/`, `youtube.com/shorts/` 순서로 탐색한다.
(프론트에 있던 `[?&]v=` 폴백은 유튜브가 아닌 URL까지 잡을 수 있어서, `youtube.com` 호스트를 붙인 패턴으로 좁혔다.)

### 4-2. DTO (신규)

| DTO | 용도 |
|-----|------|
| `ArticleSummaryResponse` | 목록/위젯 공통 경량 DTO. **content 없음.** `summary`, `thumbnailUrl`, `videoThumbnail` 포함 |
| `ArticlePageResponse` | 서버 페이지네이션 결과 (`items`, `total`, `page`, `size`, `totalPages`) |
| `HomeSectionsResponse` | 홈 1회 요청용 (`headlines` + 카테고리별 `sections`) |
| `ArticleSliderResponse` | 사이드바 슬라이더용 (`popular`, `realtime`) |

### 4-3. 신규 엔드포인트 (`ArticleApiController`)

| 메서드 | 경로 | 용도 |
|--------|------|------|
| GET | `/api/articles/home-sections?categories=&perCategory=3&headlines=5` | 홈 헤드라인 + 카테고리별 위젯 기사 |
| GET | `/api/articles/summary?category=&keyword=&searchType=&page=&size=` | 카테고리 목록 / 검색 결과 (서버 페이징) |
| GET | `/api/articles/{id}/related?limit=3` | 상세 페이지 추천뉴스 |
| GET | `/api/articles/slider?limit=5` | 사이드바 슬라이더 |

기존 `/api/articles`, `/api/articles/home`, `/api/articles/{id}` 는 그대로 뒀다(하위 호환).
`{id}` 경로 변수보다 `home-sections` / `summary` / `slider` 같은 고정 경로가 우선 매칭되므로 충돌은 없다.

### 4-4. `ArticleService`

- `getHomeSections()` : 카테고리 목록을 받아 **카테고리마다** `findByCategoryOrderByIdDesc(category, PageRequest.of(0, N))`
  를 호출한다. 이게 "3건이 안 뜨는" 문제의 직접적인 해결이다. `perCategory`(1~10), `headlines`(1~10)는 clamp 처리.
- `getArticleSummaries()` : `JpaSpecificationExecutor` + `Specification` 으로 카테고리/키워드 조건을 조립하고
  `findAll(spec, pageable)` 로 페이지와 전체 건수를 함께 얻는다. `size` 는 1~50으로 clamp.
- `getRelatedArticles()` : 기사의 카테고리를 읽고 `findByCategoryAndIdNotOrderByIdDesc` 로 자기 자신을 뺀 최신 N건.
- `getSliderArticles()` : 최근 30일 조회수 상위(없으면 전체 기간), 오늘 등록분 조회수 상위(없으면 앞의 목록)를 계산.
  슬라이더는 큰 이미지를 그대로 쓰기 때문에 **실제 사진이 있는 기사만** 남기고(유튜브 썸네일 제외),
  필터링으로 개수가 모자라지 않도록 `limit * 10` 만큼 넉넉히 조회한 뒤 잘라낸다.

> **검색 구현 메모**
> 처음에 `cb.lower(root.get("content"))` 로 작성했다가 런타임 500이 났다.
> `content` 는 `@Lob`(LONGTEXT)이라 Hibernate 6가 `lower()` 인자로 받아주지 않는다
> (`Parameter 1 of function 'lower()' has type 'STRING', but argument is of type 'java.lang.String'`).
> 제목은 `lower()` + 소문자 패턴으로, 본문은 `LIKE` 만 사용하도록 분리했다.
> DB 콜레이션이 `utf8mb4_unicode_ci`(대소문자 구분 없음)라 본문 검색도 대소문자 구분 없이 동작한다.

### 4-5. `Article` 엔티티 인덱스 추가

```java
@Table(name = "article", indexes = {
        @Index(name = "idx_article_category_id", columnList = "category, id"),
        @Index(name = "idx_article_reg_date", columnList = "reg_date")
})
```

카테고리별 최신순 조회가 가장 잦은 접근 패턴이 됐기 때문에 복합 인덱스를 추가했다.
슬라이더의 기간 조회를 위해 `reg_date` 인덱스도 함께 추가했다.
`ddl-auto: update` 라서 컨테이너 기동 시 자동 생성된다. (컬럼명은 실제 물리명인 `reg_date` 로 지정)

### 4-6. `ArticleRepository`

`JpaSpecificationExecutor<Article>` 를 상속하고, 아래 파생 쿼리를 추가했다.

- `findByCategoryOrderByIdDesc(String, Pageable)`
- `findByCategoryAndIdNotOrderByIdDesc(String, Long, Pageable)`
- `findByRegDateGreaterThanEqualOrderByViewcountDesc(LocalDateTime, Pageable)`
- `findAllByOrderByViewcountDesc(Pageable)`

---

## 5. 프론트엔드 변경

### 5-1. `hooks/useApi.js` (신규, `hooks/useArticles.js` 대체)

기사 전용 훅을 URL 하나를 받는 범용 훅으로 바꿨다.

- URL 단위 in-memory 캐시. **같은 URL 동시 호출은 promise를 공유**해서 1번만 요청한다.
- 이미 받아둔 URL은 effect를 기다리지 않고 **렌더 시점에 캐시에서 바로 반환** → 재방문 시 깜빡임 없음.
- **`AbortController` 를 제거했다.** 공유 캐시 구조에서 언마운트 시 abort하면 아직 살아 있는 다른
  컴포넌트의 요청까지 취소돼 버린다. 대신 `cancelled` 플래그로 setState만 막는다.
- URL이 막 바뀐 프레임에서 **이전 URL의 데이터를 그대로 보여주지 않도록** 상태에 `url` 을 같이 들고 있다.
  (카테고리를 바꿨는데 이전 카테고리 기사가 한 프레임 스쳐 지나가는 문제 방지)
- `version` 옵션 : 기사 저장/수정/삭제 후 `clearApiCache()` + `version` 증가로 강제 재조회.

### 5-2. `api/articles.js` (신규)

URL 조립과 응답 매핑을 한곳에 모았다. `mapSummary()` 가 서버 요약 응답을 화면에서 쓰던 카드 형태
(`desc`, `img`, `hasVideoThumb`, `date`, `author`)로 변환해서, 화면 코드의 변경 폭을 줄였다.

### 5-3. `config/categories.js` (신규)

8개 카테고리를 한곳에서 관리하고 `Header.jsx` 와 `NewsSection.jsx` 가 함께 쓰도록 했다.
홈 위젯과 헤더 메뉴, 그리고 `home-sections` 요청 파라미터가 어긋날 수 없게 된다.

### 5-4. `components/NewsSection.jsx` (대폭 수정)

- 홈: `home-sections` **1회 요청**으로 헤드라인 5건 + 카테고리 8개 × 3건을 한 번에 받는다.
- 카테고리/검색: `summary` API로 **현재 페이지 10건만** 받는다. 페이지 버튼/이전·다음/직접 이동은
  서버가 준 `totalPages` 를 그대로 사용한다.
- 검색어 입력은 `useDebouncedValue(250ms)` 로 묶어 **키 입력마다 요청이 나가지 않도록** 했다.
- 로딩 중에는 빈 화면 대신 **스켈레톤**을 보여준다.
- 매 렌더마다 재생성되던 내부 컴포넌트(`GroupWidget`, `MainGridView`의 헤드라인 캐러셀)를
  **모듈 최상단 컴포넌트로 분리**했다. 이전에는 부모가 리렌더될 때마다 컴포넌트 타입 자체가 바뀌어
  하위 트리가 통째로 다시 마운트되고 헤드라인 인덱스가 초기화됐다.
- 중복돼 있던 페이지네이션 UI와 목록 카드 마크업을 `Pagination`, `ListArticleCard` 로 추출했다.
- 목록에는 본문이 없으므로, 관리자가 **수정** 버튼을 누르면 `GET /api/articles/{id}` 로 본문을 먼저
  가져온 뒤 에디터를 연다(`openEditor`).
- 저장/수정/삭제 후에는 로컬 배열을 직접 수정하는 대신 `clearApiCache()` + `dataVersion` 증가로
  서버에서 다시 읽어온다. 서버 페이징 상태와 화면이 어긋나지 않는다.
- 사용하지 않던 `AdBanner` import 와 `parseBannerList`, `brand` 를 제거했다.

### 5-5. `pages/ArticleDetail.jsx`

- 추천뉴스를 `/api/articles/{id}/related?limit=3` 로 교체.
- **`id` 기준으로 요청**하도록 바꿔서 본문 조회와 **동시에** 나간다(기존에는 본문 도착 후 시작).
- 목록에서 넘어올 때 넘겨받는 state에는 본문이 없으므로, 초기 `loading` 판정을
  `!location.state?.article` → `!location.state?.article?.content` 로 수정했다.
- 수정/삭제 후 `clearApiCache()` 를 호출해서 뒤로 갔을 때 최신 내용이 보이게 했다.

### 5-6. `components/NewsSlider.jsx`

`/api/articles/slider?limit=5` 로 교체. 인기/급상승 계산이 서버로 넘어가면서 컴포넌트에서
날짜 파싱·정렬·이미지 필터링 로직이 전부 사라졌다. 로딩 스켈레톤을 추가했다.

---

## 6. 이미지 캐싱 (`ImageController`)

목록 API를 줄이고 나니 이미지가 남은 병목으로 드러났다. 홈 화면 기준 실측:

| 항목 | 수치 |
|------|------|
| 홈 전체 이미지 | 21장 / **28.4 MB** (평균 1.35 MB) |
| 첫 화면 로딩분 | 3장 / 1.9 MB (`loading="lazy"` 로 나머지는 스크롤 시) |
| 대표 사례 | **128×96px** 자리에 **2000×1333 원본** 표시 |
| `Cache-Control` / `ETag` | **둘 다 없음** → 페이지 이동·재방문마다 전부 재다운로드 |

이번에는 **캐싱만** 손봤다. 리사이즈/썸네일 생성은 별도 작업으로 남긴다.

- 업로드 파일명이 UUID라 내용이 바뀌지 않으므로
  `Cache-Control: public, max-age=31536000, immutable` 부여
- MinIO 객체의 ETag를 그대로 `ETag` 헤더로 내보내고, `Last-Modified` 도 함께 전달
- `If-None-Match` 가 일치하면 **`headObject` 만 하고 304 반환** —
  MinIO 에서 본문을 읽지 않으므로 네트워크뿐 아니라 JVM 힙도 아낀다
  (기존에는 요청마다 `readAllBytes()` 로 이미지 전체를 힙에 올렸다)
- 없는 키는 500 대신 **404** 반환

### 결과

| 상황 | 변경 전 | 변경 후 |
|------|---------|---------|
| 최초 요청 | 200 / 144 KB / 311 ms | 200 / 144 KB / 311 ms (동일) |
| 재요청 (`If-None-Match`) | 200 / 144 KB / 311 ms | **304 / 0 KB / 34 ms** |
| 홈 재방문 (브라우저) | 27.02 MB 재전송 | **0 MB — 21장 전부 캐시 적중** |
| 없는 이미지 | 500 | 404 |

> 첫 방문 용량(1.9 MB)은 그대로다. 이걸 줄이려면 썸네일 생성이 필요하다. **§9 참고.**

---

## 7. 빌드/배포 관련

`docker compose build frontend` 가 아래 오류로 실패했다.

```
target frontend: failed to solve: invalid file request src/newspaper-frontend/node_modules/.bin/lz-string
```

루트에 `.dockerignore` 가 없어서 윈도우에서 설치된 `node_modules`(심볼릭 링크 포함)까지 빌드 컨텍스트로
전송되고 있었다. 어차피 `Dockerfile.frontend` 안에서 `npm ci` 로 새로 설치하므로 보낼 이유가 없다.

- `.dockerignore` (신규) : `**/node_modules`, 빌드 산출물, `data/`, `backups/`, `actions-runner/` 등 제외
- `src/api-server/.dockerignore` : 기존 항목(`build/`, `.gradle/`, `*.log`, `.git/`)에 `out/`, `bin/` 추가

빌드 컨텍스트가 줄어서 이미지 빌드 자체도 빨라졌다.

---

## 8. 측정 결과

운영 DB(기사 4,790건, 본문 합계 13.6MB) 기준, 로컬 백엔드 직접 호출.

| 화면 | 변경 전 | 변경 후 |
|------|---------|---------|
| 카테고리 클릭 | `GET /api/articles` — **15,672 KB / 11,608 ms** | `GET /api/articles/summary` — **11 KB / 33 ms** |
| 상세 추천뉴스 | `GET /api/articles` — **15,672 KB / 11,608 ms** (본문 조회 후 직렬 실행) | `GET /api/articles/{id}/related` — **3 KB / 23 ms** (본문 조회와 병렬) |
| 홈 화면 | `GET /api/articles/home?limit=80` — **267 KB / 136 ms** | `home-sections` **29 KB / 59 ms** + `slider` **11 KB / 31 ms** (병렬) |

- 카테고리 목록: **약 1,400배 작은 응답, 11.6초 → 0.03초**
- 홈 위젯: 8개 카테고리 전부 3건씩 채워짐 (`동영상뉴스` 는 DB에 총 2건이라 2건 — 정상)
- 검색(제목+본문 전체 대상, 4,790건 LIKE 스캔): 144ms

---

## 9. 검증

### 자동 테스트

- 백엔드 `./gradlew test` : **BUILD SUCCESSFUL**
  - `ArticleSummarizerTest` (신규) : 요약 자르기, `&nbsp;` 처리, 이미지 엔티티 디코딩, 유튜브 폴백, 미검출 케이스
  - `ArticleApiControllerSummaryTest` (신규) : 신규 4개 엔드포인트의 응답 형태, 카테고리 파라미터 트리밍
  - `ArticleServiceSummaryTest` (신규) : 카테고리별 개별 조회, clamp, 추천뉴스 자기 제외, 슬라이더 이미지 필터/폴백
  - 기존 `ArticleApiControllerHomeTest` 통과
- 프론트 `npx vitest run` : **15 tests passed**
  - `useApi.test.js` (신규, 기존 `useArticles.test.js` 대체) : 캐시 재사용, null URL, 캐시 무효화 후 재조회,
    URL 전환 시 이전 데이터 비노출, 실패 시 캐시에 남지 않고 재시도
  - `api/articles.test.js` (신규) : URL 조립, 요약 응답 매핑
- `npx eslint` : 이번에 추가/수정한 파일은 경고 0건
  (`AdminPanel.jsx`, `ArticleForm.jsx` 등 기존 파일의 lint 오류는 이번 작업 범위 밖이라 그대로 뒀다)
- `npm run build` : 정상

### 브라우저 확인 (배포된 `http://localhost`)

- 홈 진입 시 API 요청이 `home-sections` + `slider` **2건만** 발생, 병렬 실행
- 홈 위젯 8개 모두 3건 노출 확인
- 카테고리 클릭 → `summary?category=...&page=1` 1건, 목록 즉시 표시
- 페이지네이션 "다음" → `page=2` 요청, 내용 정상 교체
- 기사 상세 → `.../related` 와 `.../{id}` 가 같은 타이밍에 병렬 발생, 추천뉴스 3건 정상 노출
- 검색 "예산" 입력 후 엔터 → 요청 1건(디바운스 동작), 10건 표시 / 123페이지

---

## 10. 남은 것 / 참고

- 검색 범위가 넓어졌다. 기존에는 본문 **앞 300자**만 클라이언트에서 훑었지만, 이제는 서버가
  **본문 전체**를 대상으로 LIKE 검색한다. 결과 건수가 이전보다 늘어난다(의도한 개선).
  기사가 지금보다 크게 늘어나면 LIKE 스캔 대신 FULLTEXT 인덱스를 검토할 필요가 있다.
- 페이지 이동 시 스크롤 위치를 유지한다(기존 동작과 동일). 목록 상단으로 올리는 게 나으면 별도 처리 필요.
- `/api/articles`(전체 본문)는 하위 호환을 위해 남겨뒀지만 프론트에서는 더 이상 호출하지 않는다.
  외부 사용처가 없다고 확인되면 제거해도 된다.
- 프론트 번들이 730KB(gzip 209KB)로 커서 vite가 경고를 낸다. 이번 작업 범위 밖이지만,
  Quill 에디터를 관리자 화면에서만 `import()` 하도록 코드 스플리팅하면 초기 로딩을 더 줄일 수 있다.
