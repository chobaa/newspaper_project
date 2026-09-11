import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import useApi, { buildQuery, clearApiCache } from "./useApi";

describe("buildQuery", () => {
  it("serializes only non-empty params", () => {
    expect(buildQuery({ category: "성남시정", page: 2, keyword: "", size: undefined })).toBe(
      "?category=%EC%84%B1%EB%82%A8%EC%8B%9C%EC%A0%95&page=2"
    );
  });

  it("returns empty string when nothing to serialize", () => {
    expect(buildQuery({})).toBe("");
    expect(buildQuery()).toBe("");
  });
});

describe("useApi", () => {
  beforeEach(() => {
    clearApiCache();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetches once and reuses the cache for the same url", async () => {
    const mockData = { items: [{ id: 1, title: "테스트" }], total: 1 };
    fetch.mockResolvedValue({ ok: true, json: async () => mockData });

    const { result: first } = renderHook(() => useApi("/api/articles/summary?page=1"));
    await waitFor(() => expect(first.current.loading).toBe(false));
    expect(first.current.data).toEqual(mockData);

    const { result: second } = renderHook(() => useApi("/api/articles/summary?page=1"));

    // 캐시에 있으므로 로딩 없이 즉시 데이터가 나와야 합니다.
    expect(second.current.loading).toBe(false);
    expect(second.current.data).toEqual(mockData);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("does not request when url is null", () => {
    const { result } = renderHook(() => useApi(null));

    expect(result.current).toEqual({ data: null, loading: false, error: null });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("refetches after the cache is cleared and version changes", async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({ total: 0 }) });

    const { result, rerender } = renderHook(({ version }) => useApi("/api/articles/slider?limit=5", { version }), {
      initialProps: { version: 0 },
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(fetch).toHaveBeenCalledTimes(1);

    clearApiCache();
    rerender({ version: 1 });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("does not leak the previous url's data while a new url loads", async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ page: 1 }) });

    const { result, rerender } = renderHook(({ url }) => useApi(url), {
      initialProps: { url: "/api/articles/summary?page=1" },
    });
    await waitFor(() => expect(result.current.data).toEqual({ page: 1 }));

    let resolveSecond;
    fetch.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveSecond = () => resolve({ ok: true, json: async () => ({ page: 2 }) });
      })
    );
    rerender({ url: "/api/articles/summary?page=2" });

    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(true);

    resolveSecond();
    await waitFor(() => expect(result.current.data).toEqual({ page: 2 }));
  });

  it("surfaces an error and retries on the next mount", async () => {
    fetch.mockResolvedValueOnce({ ok: false, status: 500 });

    const { result } = renderHook(() => useApi("/api/articles/home-sections"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeInstanceOf(Error);

    // 실패한 응답은 캐시에 남지 않으므로 다시 마운트하면 재요청됩니다.
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ headlines: [] }) });
    const { result: retry } = renderHook(() => useApi("/api/articles/home-sections"));
    await waitFor(() => expect(retry.current.data).toEqual({ headlines: [] }));
  });
});
