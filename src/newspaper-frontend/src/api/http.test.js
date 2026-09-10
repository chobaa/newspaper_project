import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { authFetch, readErrorMessage, UnauthorizedError } from "./http";
import { clearAdminToken, getAdminToken, isAdmin, onAdminChange, saveAdminToken } from "./auth";

describe("auth 토큰 저장", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("저장하면 관리자로 인식된다", () => {
    expect(isAdmin()).toBe(false);

    saveAdminToken("token-123");

    expect(getAdminToken()).toBe("token-123");
    expect(isAdmin()).toBe(true);
    expect(localStorage.getItem("isAdmin")).toBe("true");
  });

  it("지우면 관리자가 아니게 된다", () => {
    saveAdminToken("token-123");

    clearAdminToken();

    expect(getAdminToken()).toBeNull();
    expect(isAdmin()).toBe(false);
    expect(localStorage.getItem("isAdmin")).toBe("false");
  });

  it("변경을 구독할 수 있다", () => {
    const listener = vi.fn();
    const unsubscribe = onAdminChange(listener);

    saveAdminToken("token-123");
    expect(listener).toHaveBeenLastCalledWith(true);

    clearAdminToken();
    expect(listener).toHaveBeenLastCalledWith(false);

    unsubscribe();
    saveAdminToken("token-456");
    expect(listener).toHaveBeenCalledTimes(2);
  });
});

describe("authFetch", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("토큰이 있으면 Authorization 헤더를 붙인다", async () => {
    saveAdminToken("token-123");
    fetch.mockResolvedValue({ ok: true, status: 200 });

    await authFetch("/api/articles", { method: "POST" });

    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe("/api/articles");
    expect(options.method).toBe("POST");
    expect(options.headers.get("Authorization")).toBe("Bearer token-123");
  });

  it("기존 헤더를 유지한다", async () => {
    saveAdminToken("token-123");
    fetch.mockResolvedValue({ ok: true, status: 200 });

    await authFetch("/api/articles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    const [, options] = fetch.mock.calls[0];
    expect(options.headers.get("Content-Type")).toBe("application/json");
    expect(options.headers.get("Authorization")).toBe("Bearer token-123");
  });

  it("토큰이 없으면 Authorization 헤더를 붙이지 않는다", async () => {
    fetch.mockResolvedValue({ ok: true, status: 200 });

    await authFetch("/api/articles", { method: "POST" });

    const [, options] = fetch.mock.calls[0];
    expect(options.headers.get("Authorization")).toBeNull();
  });

  it("401 이면 토큰을 지우고 UnauthorizedError 를 던진다", async () => {
    saveAdminToken("token-123");
    fetch.mockResolvedValue({ ok: false, status: 401 });

    await expect(authFetch("/api/articles", { method: "POST" })).rejects.toBeInstanceOf(
      UnauthorizedError
    );
    expect(isAdmin()).toBe(false);
  });

  it("401 이 아닌 실패 응답은 그대로 돌려준다", async () => {
    saveAdminToken("token-123");
    fetch.mockResolvedValue({ ok: false, status: 500 });

    const res = await authFetch("/api/articles", { method: "POST" });

    expect(res.status).toBe(500);
    expect(isAdmin()).toBe(true); // 토큰은 유지
  });
});

describe("readErrorMessage", () => {
  it("error 필드를 우선 사용한다", async () => {
    const res = { text: async () => JSON.stringify({ error: "권한이 없습니다." }) };

    expect(await readErrorMessage(res, "기본 메시지")).toBe("권한이 없습니다.");
  });

  it("detail 이 있으면 기본 메시지에 덧붙인다", async () => {
    const res = { text: async () => JSON.stringify({ detail: "원인" }) };

    expect(await readErrorMessage(res, "저장 실패.")).toBe("저장 실패. 원인");
  });

  it("JSON 이 아니면 본문을 덧붙인다", async () => {
    const res = { text: async () => "서버 폭발" };

    expect(await readErrorMessage(res, "저장 실패.")).toBe("저장 실패. 서버 폭발");
  });

  it("본문이 비어 있으면 기본 메시지를 쓴다", async () => {
    const res = { text: async () => "" };

    expect(await readErrorMessage(res, "저장 실패.")).toBe("저장 실패.");
  });
});
