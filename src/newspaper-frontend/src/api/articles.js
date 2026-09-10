import { buildQuery } from "../hooks/useApi";
import { NEWS_CATEGORIES } from "../config/categories";

/**
 * 목록/위젯은 본문 전체가 아니라 요약 API를 사용합니다.
 * (본문까지 내려받으면 목록 한 번 여는 데 수 MB가 오가서 화면이 늦게 뜹니다.)
 */

/** 홈 화면: 헤드라인 + 카테고리별 기사 3건씩을 한 번에 */
export function homeSectionsUrl({ perCategory = 3, headlines = 5 } = {}) {
  return `/api/articles/home-sections${buildQuery({
    categories: NEWS_CATEGORIES.join(","),
    perCategory,
    headlines,
  })}`;
}

/** 카테고리 목록 / 검색 결과: 서버 페이지네이션 */
export function articleSummariesUrl({ category, keyword, searchType, page = 1, size = 10 } = {}) {
  return `/api/articles/summary${buildQuery({ category, keyword, searchType, page, size })}`;
}

/** 상세 페이지 추천 뉴스 */
export function relatedArticlesUrl(id, limit = 3) {
  if (id == null || id === "") return null;
  return `/api/articles/${encodeURIComponent(id)}/related${buildQuery({ limit })}`;
}

/** 사이드바 슬라이더 */
export function sliderUrl(limit = 5) {
  return `/api/articles/slider${buildQuery({ limit })}`;
}

/** 상세 조회 (본문 포함) */
export function articleUrl(id) {
  return `/api/articles/${encodeURIComponent(id)}`;
}

/** 요약 API 응답을 화면에서 쓰는 카드 형태로 변환 */
export function mapSummary(article) {
  return {
    id: article.id,
    category: article.category || "성남시정",
    title: article.title,
    desc: article.summary || "",
    date: article.regDate ? article.regDate.substring(0, 10) : "",
    author: article.writer || "기자",
    img: article.thumbnailUrl || null,
    hasVideoThumb: !!article.videoThumbnail,
    viewCount: article.viewCount || 0,
  };
}

export function mapSummaries(articles) {
  return Array.isArray(articles) ? articles.map(mapSummary) : [];
}
