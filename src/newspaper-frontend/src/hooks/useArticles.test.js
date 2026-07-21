import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import useArticles, {
  buildArticlesUrl,
  clearArticlesCache,
} from "../hooks/useArticles";

describe("buildArticlesUrl", () => {
  it("returns full articles endpoint by default", () => {
    expect(buildArticlesUrl()).toBe("/api/articles");
    expect(buildArticlesUrl({ mode: "full" })).toBe("/api/articles");
  });

  it("returns home endpoint with limit", () => {
    expect(buildArticlesUrl({ mode: "home", limit: 80 })).toBe(
      "/api/articles/home?limit=80"
    );
  });

  it("uses default home limit when limit is invalid", () => {
    expect(buildArticlesUrl({ mode: "home", limit: 0 })).toBe(
      "/api/articles/home?limit=50"
    );
  });
});

describe("useArticles", () => {
  beforeEach(() => {
    clearArticlesCache();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetches home articles once and reuses cache", async () => {
    const mockData = [{ id: 1, title: "테스트" }];
    fetch.mockResolvedValue({
      ok: true,
      json: async () => mockData,
    });

    const { result: first } = renderHook(() =>
      useArticles({ mode: "home", limit: 5 })
    );
    await waitFor(() => expect(first.current.loading).toBe(false));

    const { result: second } = renderHook(() =>
      useArticles({ mode: "home", limit: 5 })
    );

    expect(second.current.loading).toBe(false);
    expect(second.current.data).toEqual(mockData);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(
      "/api/articles/home?limit=5",
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  });

  it("sets error when fetch fails", async () => {
    fetch.mockResolvedValue({ ok: false, status: 500 });

    const { result } = renderHook(() => useArticles({ mode: "home", limit: 5 }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeInstanceOf(Error);
  });
});
