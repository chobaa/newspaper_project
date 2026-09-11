import { useEffect, useState } from "react";

// 간단 in-memory 캐시
// - 같은 URL로 호출된 fetch는 1번만 실행되고, 결과는 모든 호출자가 공유합니다.
// - 이미 받아온 URL은 렌더 시점에 캐시에서 바로 꺼내 쓰므로 재방문 시 깜빡임이 없습니다.
const cache = new Map();

export function clearApiCache() {
  cache.clear();
}

/** 값이 비어있는 파라미터는 빼고 쿼리스트링을 만듭니다. */
export function buildQuery(params) {
  const query = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    query.set(key, String(value));
  });
  const serialized = query.toString();
  return serialized ? `?${serialized}` : "";
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.json();
}

const EMPTY = { data: null, loading: false, error: null };

/**
 * URL 하나를 GET 해서 JSON을 돌려주는 훅.
 *
 * @param url     null/undefined 이면 요청하지 않습니다.
 * @param version 값이 바뀌면 캐시를 무시하고 다시 요청합니다(기사 저장/삭제 후 갱신용).
 * @returns {{ data: any, loading: boolean, error: Error|null }}
 */
export default function useApi(url, { version = 0 } = {}) {
  const [state, setState] = useState({ url: null, ...EMPTY });

  useEffect(() => {
    // url이 없으면 아무것도 하지 않습니다. (렌더에서 EMPTY를 돌려줍니다)
    if (!url) return undefined;

    let cancelled = false;

    // 이미 받아둔 URL이면 렌더에서 캐시를 그대로 돌려주므로 아무것도 하지 않습니다.
    const hit = cache.get(url);
    if (hit && "data" in hit) return undefined;

    // 진행 중인 동일 요청이 있으면 그 promise를 그대로 기다립니다.
    const promise = hit?.promise ?? fetchJson(url);
    if (!hit?.promise) cache.set(url, { promise });

    // 로딩 상태는 따로 setState 하지 않습니다.
    // state.url이 아직 이전 URL이면 렌더에서 loading:true 를 돌려줍니다.
    promise.then(
      (data) => {
        cache.set(url, { data });
        if (!cancelled) setState({ url, data, loading: false, error: null });
      },
      (error) => {
        // 실패한 요청은 캐시에서 지워서 다음 진입 때 다시 시도되게 합니다.
        if (cache.get(url)?.promise === promise) cache.delete(url);
        if (!cancelled) setState({ url, data: null, loading: false, error });
      }
    );

    return () => {
      cancelled = true;
    };
  }, [url, version]);

  if (!url) return EMPTY;

  // 캐시에 이미 있으면 effect를 기다리지 않고 렌더 시점에 바로 돌려줍니다.
  const cached = cache.get(url);
  if (cached && "data" in cached) {
    return { data: cached.data, loading: false, error: null };
  }

  // URL이 막 바뀐 프레임에서는 이전 URL의 데이터를 보여주지 않습니다.
  if (state.url !== url) return { data: null, loading: true, error: null };

  return { data: state.data, loading: state.loading, error: state.error };
}
