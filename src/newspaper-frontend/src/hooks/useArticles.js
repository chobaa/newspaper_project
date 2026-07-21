import { useEffect, useMemo, useState } from "react";

// 간단 in-memory 캐시
// - 같은 key로 호출된 fetch는 1번만 실행되고, 결과는 공유됩니다.
const cache = new Map();

export function buildArticlesUrl({ mode = "full", limit } = {}) {
  if (mode === "home") {
    const l = typeof limit === "number" && limit > 0 ? limit : 50;
    return `/api/articles/home?limit=${encodeURIComponent(l)}`;
  }
  return "/api/articles";
}

export function clearArticlesCache() {
  cache.clear();
}

function buildUrl({ mode, limit }) {
  return buildArticlesUrl({ mode, limit });
}

export default function useArticles({ mode = "full", limit } = {}) {
  const url = useMemo(() => buildUrl({ mode, limit }), [mode, limit]);
  const key = url;

  const [state, setState] = useState(() => {
    const hit = cache.get(key);
    if (hit?.data) return { data: hit.data, loading: false, error: null };
    return { data: null, loading: true, error: null };
  });

  useEffect(() => {
    let cancelled = false;

    const hit = cache.get(key);
    if (hit?.data) {
      setState({ data: hit.data, loading: false, error: null });
      return;
    }

    // 진행중인 fetch가 있으면 동일 promise를 기다립니다.
    if (hit?.promise) {
      setState((s) => ({ ...s, loading: true, error: null }));
      hit.promise
        .then((data) => {
          if (cancelled) return;
          setState({ data, loading: false, error: null });
        })
        .catch((err) => {
          if (cancelled) return;
          setState({ data: null, loading: false, error: err });
        });
      return;
    }

    const controller = new AbortController();
    const p = (async () => {
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) throw new Error(`Failed to fetch articles: ${res.status}`);
      return await res.json();
    })();

    cache.set(key, { promise: p });
    setState((s) => ({ ...s, loading: true, error: null }));

    p.then(
      (data) => {
        if (cancelled) return;
        cache.set(key, { data });
        setState({ data, loading: false, error: null });
      },
      (err) => {
        if (cancelled) return;
        cache.delete(key);
        setState({ data: null, loading: false, error: err });
      }
    );

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [key]);

  return state;
}

