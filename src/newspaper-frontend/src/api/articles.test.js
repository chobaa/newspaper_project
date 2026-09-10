import { describe, expect, it } from "vitest";
import {
  articleSummariesUrl,
  articleUrl,
  homeSectionsUrl,
  mapSummaries,
  mapSummary,
  relatedArticlesUrl,
  sliderUrl,
} from "./articles";
import { NEWS_CATEGORIES } from "../config/categories";

describe("article API urls", () => {
  it("asks the home endpoint for every category widget at once", () => {
    const url = homeSectionsUrl({ perCategory: 3, headlines: 5 });

    expect(url).toContain("/api/articles/home-sections?");
    expect(decodeURIComponent(url)).toContain(`categories=${NEWS_CATEGORIES.join(",")}`);
    expect(url).toContain("perCategory=3");
    expect(url).toContain("headlines=5");
  });

  it("requests only the current page for list views", () => {
    const url = decodeURIComponent(articleSummariesUrl({ category: "성남시의회", page: 3, size: 10 }));

    expect(url).toBe("/api/articles/summary?category=성남시의회&page=3&size=10");
  });

  it("omits the category for search results", () => {
    const url = decodeURIComponent(
      articleSummariesUrl({ keyword: "예산", searchType: "titleAndContent", page: 1, size: 10 })
    );

    expect(url).toBe("/api/articles/summary?keyword=예산&searchType=titleAndContent&page=1&size=10");
  });

  it("returns null related url when there is no article id", () => {
    expect(relatedArticlesUrl(undefined)).toBeNull();
    expect(relatedArticlesUrl(12)).toBe("/api/articles/12/related?limit=3");
  });

  it("builds slider and detail urls", () => {
    expect(sliderUrl(5)).toBe("/api/articles/slider?limit=5");
    expect(articleUrl(7)).toBe("/api/articles/7");
  });
});

describe("mapSummary", () => {
  it("maps the summary payload onto the card shape", () => {
    const card = mapSummary({
      id: 1,
      title: "제목",
      category: "성남시정",
      writer: "홍길동",
      regDate: "2026-09-10T12:00:00",
      viewCount: 12,
      summary: "요약문",
      thumbnailUrl: "http://cdn/a.jpg",
      videoThumbnail: false,
    });

    expect(card).toEqual({
      id: 1,
      title: "제목",
      category: "성남시정",
      author: "홍길동",
      date: "2026-09-10",
      viewCount: 12,
      desc: "요약문",
      img: "http://cdn/a.jpg",
      hasVideoThumb: false,
    });
  });

  it("falls back for missing fields", () => {
    const card = mapSummary({ id: 2, title: "제목" });

    expect(card.category).toBe("성남시정");
    expect(card.author).toBe("기자");
    expect(card.date).toBe("");
    expect(card.img).toBeNull();
    expect(card.hasVideoThumb).toBe(false);
  });

  it("returns an empty array for missing lists", () => {
    expect(mapSummaries(undefined)).toEqual([]);
    expect(mapSummaries(null)).toEqual([]);
  });
});
