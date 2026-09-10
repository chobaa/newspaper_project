import { clearAdminToken, getAdminToken } from "./auth";

/**
 * 관리자 토큰을 붙여서 요청합니다. (쓰기·관리자 API 전용)
 *
 * - 토큰은 쿠키가 아니라 `Authorization: Bearer` 헤더로 보냅니다.
 *   그래서 CORS 에서 credentials 를 허용할 필요가 없습니다.
 * - 401 이 오면 토큰이 만료/무효가 된 것이므로 정리하고 다시 로그인하도록 안내합니다.
 */
export async function authFetch(url, options = {}) {
  const token = getAdminToken();
  const headers = new Headers(options.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    clearAdminToken();
    throw new UnauthorizedError();
  }
  return res;
}

export class UnauthorizedError extends Error {
  constructor(message = "관리자 인증이 만료되었습니다. 다시 로그인해 주세요.") {
    super(message);
    this.name = "UnauthorizedError";
    this.status = 401;
  }
}

/** 실패 응답에서 사람이 읽을 메시지를 뽑아냅니다. */
export async function readErrorMessage(res, fallback) {
  const text = await res.text();
  try {
    const json = JSON.parse(text);
    if (json.error) return json.error;
    if (json.detail) return `${fallback} ${json.detail}`;
  } catch {
    if (text) return `${fallback} ${text}`;
  }
  return fallback;
}
