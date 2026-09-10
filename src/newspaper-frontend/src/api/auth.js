const TOKEN_KEY = "adminToken";
const ADMIN_FLAG_KEY = "isAdmin";

// 토큰이 만료/무효가 되었을 때 화면에 알려주기 위한 구독자 목록
const listeners = new Set();

export function getAdminToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
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
