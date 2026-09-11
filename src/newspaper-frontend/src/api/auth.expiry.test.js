import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearAdminToken, getAdminToken, isAdmin, saveAdminToken } from "./auth";

/** 서버와 같은 형식으로 토큰을 만든다: base64url("admin:만료시각") + "." + 서명 */
function makeToken(expiresAtEpochSeconds) {
  const payload = btoa(`admin:${expiresAtEpochSeconds}`)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return `${payload}.c2lnbmF0dXJl`;
}

describe("토큰 만료 처리", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("유효한 토큰은 그대로 돌려준다", () => {
    const token = makeToken(Math.floor(Date.now() / 1000) + 3600);
    saveAdminToken(token);

    expect(getAdminToken()).toBe(token);
    expect(isAdmin()).toBe(true);
  });

  it("만료된 토큰은 없는 것으로 보고 저장소에서도 지운다", () => {
    // 만료된 토큰을 들고 있으면 관리자 화면은 열리는데 업로드만 401 로 실패한다.
    const expired = makeToken(Math.floor(Date.now() / 1000) - 1);
    saveAdminToken(expired);

    expect(getAdminToken()).toBeNull();
    expect(isAdmin()).toBe(false);
    expect(localStorage.getItem("adminToken")).toBeNull();
    expect(localStorage.getItem("isAdmin")).toBe("false");
  });

  it("만료시각을 읽을 수 없으면 서버 판단에 맡긴다", () => {
    saveAdminToken("깨진토큰");

    expect(getAdminToken()).toBe("깨진토큰");
  });

  it("토큰이 없으면 관리자가 아니다", () => {
    clearAdminToken();

    expect(getAdminToken()).toBeNull();
    expect(isAdmin()).toBe(false);
  });
});
