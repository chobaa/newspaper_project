const TOKEN_KEY = "adminToken";
const ADMIN_FLAG_KEY = "isAdmin";

// 토큰이 만료/무효가 되었을 때 화면에 알려주기 위한 구독자 목록
const listeners = new Set();

/**
 * 토큰 페이로드에서 만료시각을 읽어 이미 지났는지 판단합니다.
 * 형식: base64url("subject:만료시각(epoch초)") + "." + base64url(서명)
 *
 * 서명은 서버만 검증할 수 있으므로 여기서는 "만료 여부"만 본다.
 * 읽지 못하면 판단을 서버에 맡긴다(그대로 보내고 401을 받는다).
 */
function isExpired(token) {
  try {
    const payload = token.split(".")[0];
    const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const expiresAt = Number(decoded.slice(decoded.lastIndexOf(":") + 1));
    if (!Number.isFinite(expiresAt) || expiresAt <= 0) return false;
    return Date.now() >= expiresAt * 1000;
  } catch {
    return false;
  }
}

export function getAdminToken() {
  let token = null;
  try {
    token = localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
  if (!token) return null;

  // 만료된 토큰을 들고 있으면 관리자 화면은 열리는데 저장·업로드만 401로 실패한다.
  // 그래서 읽는 시점에 걸러낸다. (렌더 중에 호출될 수 있어 알림은 다음 틱으로 미룬다)
  if (isExpired(token)) {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.setItem(ADMIN_FLAG_KEY, "false");
    } catch {
      // 무시
    }
    setTimeout(notify, 0);
    return null;
  }
  return token;
}

export function isAdmin() {
  return !!getAdminToken();
}

export function saveAdminToken(token) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    // 기존 화면들이 참조하던 플래그도 함께 유지합니다.
    localStorage.setItem(ADMIN_FLAG_KEY, "true");
  } catch {
    // 저장 실패(시크릿 모드 등)해도 현재 세션은 계속 쓸 수 있게 둡니다.
  }
  notify();
}

export function clearAdminToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.setItem(ADMIN_FLAG_KEY, "false");
  } catch {
    // 무시
  }
  notify();
}

/** 토큰이 생기거나 사라졌을 때 호출됩니다. 해제 함수를 반환합니다. */
export function onAdminChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify() {
  listeners.forEach((listener) => {
    try {
      listener(isAdmin());
    } catch {
      // 구독자 오류가 다른 구독자에게 번지지 않게 함
    }
  });
}
