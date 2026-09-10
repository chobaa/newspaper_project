import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom"; // ✅ 페이지 이동 훅 추가
import Widget from "./Widget";
import ArticleForm from "./ArticleForm";
import { decodeHtmlEntities } from "../utils/text";
import useApi, { clearApiCache } from "../hooks/useApi";
import {
  articleSummariesUrl,
  articleUrl,
  homeSectionsUrl,
  mapSummaries,
} from "../api/articles";
import { NEWS_CATEGORIES } from "../config/categories";

const PAGE_SIZE = 10;
const HOME_WIDGET_SIZE = 3;

// =================================================================
// 공통 조각들 (모듈 최상단에 둬서 리렌더마다 다시 마운트되지 않게 함)
// =================================================================

function SkeletonList({ count = 4 }) {
  return (
    <div className="space-y-6" aria-busy="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col sm:flex-row gap-6 border-b border-gray-100 pb-6 last:border-0 p-2">
          <div className="w-full sm:w-48 h-32 bg-gray-200 rounded-lg shrink-0 animate-pulse" />
          <div className="flex-1 space-y-3 py-1">
            <div className="h-5 bg-gray-200 rounded animate-pulse w-3/4" />
            <div className="h-4 bg-gray-100 rounded animate-pulse" />
            <div className="h-4 bg-gray-100 rounded animate-pulse w-5/6" />
          </div>
        </div>
      ))}
    </div>
  );
}

function SkeletonWidgetItems({ count = HOME_WIDGET_SIZE }) {
  return (
    <div className="space-y-4" aria-busy="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex gap-4 rounded-xl border border-gray-100 bg-white p-3">
          <div className="w-32 h-24 md:w-40 md:h-28 bg-gray-200 rounded-lg flex-shrink-0 animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded animate-pulse w-4/5" />
            <div className="h-3 bg-gray-100 rounded animate-pulse" />
            <div className="h-3 bg-gray-100 rounded animate-pulse w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

function VideoPlayBadge({ size = "md" }) {
  const box = size === "lg" ? "w-14 h-14" : size === "sm" ? "w-10 h-10" : "w-11 h-11";
  const icon = size === "lg" ? "w-7 h-7" : size === "sm" ? "w-5 h-5" : "w-6 h-6";
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className={`${box} rounded-full bg-black/45 backdrop-blur-sm flex items-center justify-center shadow`}>
        <svg viewBox="0 0 24 24" className={`${icon} text-white`} fill="currentColor" aria-hidden="true">
          <path d="M8 5v14l11-7z" />
        </svg>
      </div>
    </div>
  );
}

function Pagination({ page, totalPages, onChange, showJump = false }) {
  const [pageInput, setPageInput] = useState("");

  const buttons = useMemo(() => {
    const maxButtons = 10;
    let end = Math.min(totalPages, Math.max(1, page - 4) + maxButtons - 1);
    const start = Math.max(1, end - maxButtons + 1);
    const arr = [];
    for (let i = start; i <= end; i++) arr.push(i);
    return arr;
  }, [page, totalPages]);

  return (
    <div className="flex flex-col items-center gap-3 pt-4">
      {/* 페이지 번호 버튼 (최대 10개) */}
      <div className="flex flex-wrap justify-center gap-2">
        {buttons.map((p) => (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={`min-w-[32px] px-2 py-1 rounded border text-sm ${
              p === page
                ? "text-white border-[var(--brand-600)] bg-[var(--brand-600)]"
                : "text-gray-700 border-gray-300 hover:bg-gray-50"
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* 이전/다음 + 직접 입력 이동 */}
      <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-gray-600">
        <button
          onClick={() => onChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className={`px-3 py-1 rounded border ${
            page === 1 ? "text-gray-300 border-gray-200 cursor-not-allowed" : "text-gray-700 border-gray-300 hover:bg-gray-50"
          }`}
        >
          이전
        </button>
        <span className="text-sm text-gray-500">
          {page} / {totalPages}
        </span>
        <button
          onClick={() => onChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          className={`px-3 py-1 rounded border ${
            page === totalPages ? "text-gray-300 border-gray-200 cursor-not-allowed" : "text-gray-700 border-gray-300 hover:bg-gray-50"
          }`}
        >
          다음
        </button>

        {showJump && (
          <div className="flex items-center gap-1 ml-4">
            <span>페이지로 이동:</span>
            <input
              type="number"
              min={1}
              max={totalPages}
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
            />
            <button
              onClick={() => {
                const num = parseInt(pageInput, 10);
                if (!isNaN(num) && num >= 1 && num <= totalPages) onChange(num);
              }}
              className="px-3 py-1 rounded border border-gray-300 bg-white hover:bg-gray-50 text-sm"
            >
              이동
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/** 목록(카테고리/검색) 한 줄 카드 */
function ListArticleCard({ news, isAdmin, onOpen, onEdit, onDelete }) {
  return (
    <div
      onClick={() => onOpen(news)}
      className="flex flex-col sm:flex-row gap-6 group cursor-pointer border-b border-gray-100 pb-6 last:border-0 hover:bg-gray-50/50 p-2 rounded-xl transition-colors"
    >
      {news.img && (
        <div className="w-full sm:w-48 h-32 bg-gray-200 rounded-lg overflow-hidden shrink-0 relative">
          <img src={news.img} alt="news" loading="lazy" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
          <span className="absolute top-2 left-2 backdrop-blur-sm text-white text-[10px] px-2 py-1 rounded font-bold shadow-sm bg-[var(--brand-600)]/90">{news.category}</span>
          {news.hasVideoThumb && <VideoPlayBadge />}
        </div>
      )}
      <div className="flex-1 flex flex-col justify-between py-1">
        <div>
          <h3 className="font-bold text-xl text-gray-900 leading-tight mb-2 transition-colors break-all group-hover:text-[var(--brand-600)]">
            {decodeHtmlEntities(news.title)}
          </h3>
          <p className="text-sm text-gray-500 line-clamp-2 break-all">
            {decodeHtmlEntities(news.desc)}
          </p>
        </div>
        <div className="flex items-center justify-between mt-3">
          <div className="text-xs text-gray-400 font-medium">
            <span className="text-[var(--brand-500)]">{news.author}</span> • <span>{news.date}</span>
          </div>
          {isAdmin && (
            <div className="flex gap-2">
              <button
                className="text-xs border border-gray-200 bg-white px-2 py-1 rounded hover:bg-[var(--brand-50)] text-[var(--brand-600)]"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(news);
                }}
              >
                수정
              </button>
              <button
                onClick={(e) => onDelete(e, news.id)}
                className="text-xs border border-gray-200 bg-white px-2 py-1 rounded hover:bg-red-50 text-red-600"
              >
                삭제
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** 홈 화면 섹터별 위젯 (가로형 긴 카드 3개) */
function GroupWidget({ title, targetCategories, items, loading, onOpen, onSelectCategory }) {
  const primaryCategory = targetCategories[0];
  const hasPairTitle = targetCategories.length === 2;

  const renderTitle = () => {
    if (!hasPairTitle) return title;
    const [left, right] = targetCategories;
    return (
      <div className="inline-flex items-center gap-1 text-base md:text-lg">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelectCategory(left);
          }}
          className="font-extrabold text-gray-900 hover:text-[var(--brand-700)] transition-colors"
        >
          {left}
        </button>
        <span className="text-gray-400 font-semibold mx-0.5">/</span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelectCategory(right);
          }}
          className="font-extrabold text-gray-900 hover:text-[var(--brand-700)] transition-colors"
        >
          {right}
        </button>
      </div>
    );
  };

  const onTitleClick = hasPairTitle
    ? undefined
    : () => {
        if (primaryCategory) onSelectCategory(primaryCategory);
      };

  if (loading) {
    return (
      <Widget title={renderTitle()} onTitleClick={onTitleClick}>
        <SkeletonWidgetItems />
      </Widget>
    );
  }

  if (items.length === 0) {
    return (
      <Widget title={renderTitle()} onTitleClick={onTitleClick}>
        <div className="h-32 flex items-center justify-center text-gray-400 text-sm bg-gray-50 rounded-lg">
          등록된 기사가 없습니다.
        </div>
      </Widget>
    );
  }

  return (
    <Widget title={renderTitle()} onTitleClick={onTitleClick}>
      <div className="space-y-4">
        {items.map((item) => (
          <div
            key={item.id}
            onClick={() => onOpen(item)}
            className="group flex gap-4 cursor-pointer rounded-xl border border-gray-100 bg-white hover:bg-gray-50 transition-colors p-3"
          >
            {item.img && (
              <div className="relative w-32 h-24 md:w-40 md:h-28 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                <img
                  src={item.img}
                  alt={decodeHtmlEntities(item.title)}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                {item.hasVideoThumb && <VideoPlayBadge size="sm" />}
              </div>
            )}
            <div className="flex-1 min-w-0 flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-sm md:text-base text-gray-900 mb-1 line-clamp-2 break-all group-hover:text-[var(--brand-700)]">
                  {decodeHtmlEntities(item.title)}
                </h4>
                <p className="text-xs md:text-sm text-gray-500 line-clamp-2 break-all">
                  {decodeHtmlEntities(item.desc)}
                </p>
              </div>
              <div className="mt-2 text-[11px] text-gray-400 flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full font-semibold bg-[var(--brand-50)] text-[var(--brand-700)]">
                  {item.category}
                </span>
                <span>{item.date}</span>
                <span className="truncate flex-1 text-right">{item.author}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Widget>
  );
}

/** 홈 상단 헤드라인 (최신 기사 자동 전환) */
function HeadlineWidget({ items, loading, onOpen }) {
  const [rawIndex, setIndex] = useState(0);
  // 목록이 갱신되면서 길이가 줄어도 안전하도록 렌더 시점에 보정합니다.
  const index = items.length > 0 ? rawIndex % items.length : 0;

  useEffect(() => {
    if (items.length <= 1) return undefined;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % items.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [items.length]);

  const headline = items[index];

  if (loading) {
    return (
      <Widget className="lg:col-span-2 min-h-[260px]">
        <div className="flex flex-col md:flex-row gap-6" aria-busy="true">
          <div className="w-full md:w-1/2 h-52 md:h-64 rounded-xl bg-gray-200 animate-pulse" />
          <div className="flex-1 space-y-4 py-2">
            <div className="h-8 bg-gray-200 rounded animate-pulse w-4/5" />
            <div className="h-4 bg-gray-100 rounded animate-pulse" />
            <div className="h-4 bg-gray-100 rounded animate-pulse" />
            <div className="h-4 bg-gray-100 rounded animate-pulse w-2/3" />
          </div>
        </div>
      </Widget>
    );
  }

  return (
    <Widget className="lg:col-span-2 min-h-[260px] group cursor-pointer">
      {headline ? (
        <div onClick={() => onOpen(headline)} className="flex flex-col">
          {/* 배지·인디케이터: 이미지/제목 위에 한 줄로 */}
          <div className="flex items-center justify-between mb-3">
            <span className="inline-block px-3 py-1 text-xs font-bold text-white rounded-full bg-[var(--brand-600)]">
              HEADLINE · {headline.category}
            </span>
            {items.length > 1 && (
              <div className="flex items-center gap-1 text-[10px] text-gray-400">
                <span>{index + 1} / {items.length}</span>
                <div className="flex gap-1">
                  {items.map((item, idx) => (
                    <button
                      key={item.id || idx}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIndex(idx);
                      }}
                      className={`w-2 h-2 rounded-full ${idx === index ? "bg-[var(--brand-600)]" : "bg-gray-300"}`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
          {/* 이미지와 제목 상단·하단 맞춤: 같은 높이, 보이는 줄 수만 조절 */}
          <div className="flex flex-col md:flex-row gap-6 md:items-stretch">
            {headline.img && (
              <div className="relative w-full md:w-1/2 h-52 md:h-64 rounded-xl overflow-hidden bg-gray-200 flex-shrink-0">
                <img
                  src={headline.img}
                  alt={decodeHtmlEntities(headline.title)}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                {headline.hasVideoThumb && <VideoPlayBadge size="lg" />}
              </div>
            )}
            <div className="flex-1 flex flex-col justify-between min-w-0 md:h-64 overflow-hidden">
              <div className="min-h-0 flex flex-col gap-2">
                <h2 className="text-2xl md:text-3xl font-black text-gray-900 leading-tight line-clamp-2">
                  {decodeHtmlEntities(headline.title)}
                </h2>
                <p className="text-sm md:text-base text-gray-600 break-all line-clamp-[6] md:line-clamp-4 flex-1 min-h-0">
                  {decodeHtmlEntities(headline.desc) || "최신 헤드라인 기사를 확인해 보세요."}
                </p>
              </div>
              <div className="mt-4 text-xs text-gray-400 flex items-center gap-3 flex-shrink-0">
                <span>{headline.author}</span>
                <span className="w-px h-3 bg-gray-300" />
                <span>{headline.date}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
          아직 등록된 기사가 없습니다.
        </div>
      )}
    </Widget>
  );
}

/** 검색어 입력 중에 매 글자마다 요청이 나가지 않도록 살짝 늦춥니다. */
function useDebouncedValue(value, delay = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// =================================================================
// 본문
// =================================================================
export default function NewsSection({ category, categoryVersion, isAdmin, search, searchType = "titleAndContent" }) {
  const [isWriting, setIsWriting] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
  const [page, setPage] = useState(1);
  // 기사 저장/수정/삭제 후 목록을 강제로 다시 불러오기 위한 값
  const [dataVersion, setDataVersion] = useState(0);
  const navigate = useNavigate(); // ✅ 이동 함수 생성

  const isHome = category === "전체";
  const isSearch = category === "검색결과";
  const keyword = useDebouncedValue((search || "").trim());

  // 홈은 카테고리별 위젯 데이터를, 그 외에는 현재 페이지에 필요한 10건만 요청합니다.
  const homeUrl = isHome ? homeSectionsUrl({ perCategory: HOME_WIDGET_SIZE, headlines: 5 }) : null;
  const listUrl = isHome
    ? null
    : articleSummariesUrl({
        category: isSearch ? undefined : category,
        keyword,
        searchType,
        page,
        size: PAGE_SIZE,
      });

  const home = useApi(homeUrl, { version: dataVersion });
  const list = useApi(listUrl, { version: dataVersion });

  const homeSections = useMemo(() => {
    const map = new Map();
    (home.data?.sections || []).forEach((section) => {
      map.set(section.category, mapSummaries(section.articles));
    });
    return map;
  }, [home.data]);

  const headlines = useMemo(() => mapSummaries(home.data?.headlines), [home.data]);
  const listItems = useMemo(() => mapSummaries(list.data?.items), [list.data]);
  const totalItems = list.data?.total ?? 0;
  const totalPages = Math.max(1, list.data?.totalPages ?? 1);

  useEffect(() => {
    if (!isAdmin) setIsWriting(false);
  }, [isAdmin]);

  // 상단 카테고리 변경 또는 동일 카테고리 재클릭 시: 작성 모드 종료 + 1페이지로 이동
  useEffect(() => {
    setIsWriting(false);
    setEditingArticle(null);
    setPage(1);
  }, [categoryVersion, category]);

  // 검색어가 바뀌면 1페이지부터 다시
  useEffect(() => {
    setPage(1);
  }, [keyword, searchType]);

  // 서버에 있는 페이지 수보다 큰 페이지에 머무르지 않도록 보정
  // (로딩 중에는 totalPages 기본값이 1이라 보정하면 안 됨)
  useEffect(() => {
    if (list.data && page > totalPages) setPage(totalPages);
  }, [list.data, page, totalPages]);

  const refreshArticles = () => {
    clearApiCache();
    setDataVersion((v) => v + 1);
  };

  // 본문 내용에서 이미지 src 추출
  const extractImageUrlsFromContent = (html) => {
    const regex = /<img[^>]+src="([^">]+)"/g;
    const urls = [];
    let match;
    while ((match = regex.exec(html)) !== null) {
      const src = decodeHtmlEntities(match[1] || "");
      // data: 로 시작하는 인라인(base64) 이미지는 DB에 저장하지 않는다
      if (src && !src.startsWith("data:")) {
        urls.push(src);
      }
    }
    return urls;
  };

  const buildPayload = (article) => ({
    title: article.title != null ? String(article.title) : "",
    category: article.category != null ? String(article.category) : "",
    content: article.content != null ? String(article.content) : "",
    writer: article.author != null ? String(article.author) : "",
    imageUrls: extractImageUrlsFromContent(article.content || ""),
  });

  const readErrorMessage = async (res, fallback) => {
    const text = await res.text();
    try {
      const json = JSON.parse(text);
      if (json.error) return json.error;
      if (json.detail) return `${fallback} ${json.detail}`;
    } catch {
      if (text) return `${fallback} ${text}`;
    }
    return fallback;
  };

  const handleSaveArticle = async (newArticle) => {
    try {
      const res = await fetch("/api/articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(newArticle)),
      });

      if (!res.ok) throw new Error(await readErrorMessage(res, "기사 저장에 실패했습니다."));

      setIsWriting(false);
      setEditingArticle(null);
      window.__articleDirty = false;
      refreshArticles();
      alert("기사가 성공적으로 발행되었습니다!");
    } catch (e) {
      console.error(e);
      alert("기사 저장 중 오류가 발생했습니다.");
    }
  };

  const handleUpdateArticle = async (updatedArticle) => {
    const id = updatedArticle?.id;
    if (id == null || id === "" || String(id) === "undefined") {
      alert("기사 ID가 없어 수정할 수 없습니다.");
      return;
    }
    try {
      const res = await fetch(articleUrl(id), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(updatedArticle)),
      });

      if (!res.ok) throw new Error(await readErrorMessage(res, "기사 수정에 실패했습니다."));

      setIsWriting(false);
      setEditingArticle(null);
      window.__articleDirty = false;
      refreshArticles();
      alert("기사가 수정되었습니다.");
    } catch (e) {
      console.error(e);
      alert(e.message || "기사 수정 중 오류가 발생했습니다.");
    }
  };

  const handleDeleteArticle = async (e, id) => {
    e.stopPropagation(); // 클릭 이벤트 전파 방지 (상세페이지 이동 막기)
    if (!window.confirm("정말 이 기사를 삭제하시겠습니까?")) return;

    try {
      await fetch(articleUrl(id), { method: "DELETE" });
    } catch (err) {
      console.error(err);
    } finally {
      refreshArticles();
    }
  };

  // 목록에는 본문이 없으므로(요약만 내려받음), 수정할 때 본문을 따로 가져옵니다.
  const openEditor = async (news) => {
    try {
      const res = await fetch(articleUrl(news.id));
      if (!res.ok) throw new Error("기사 본문을 불러오지 못했습니다.");
      const data = await res.json();
      setEditingArticle({
        ...news,
        title: data.title,
        category: data.category,
        content: data.content,
        author: data.writer || news.author,
      });
      setIsWriting(true);
    } catch (err) {
      console.error(err);
      alert("기사 본문을 불러오지 못했습니다.");
    }
  };

  const openNewArticleForm = (presetCategory) => {
    setEditingArticle({
      id: undefined,
      title: "",
      category: presetCategory || "",
      content: "",
      desc: "",
      date: new Date().toLocaleDateString(),
      author: "",
    });
    setIsWriting(true);
  };

  // ✅ [핵심] 상세 페이지로 이동하는 함수
  const goDetail = (article) => {
    navigate(`/article/${article.id}`, { state: { article } });
  };

  const selectCategory = (nextCategory) => {
    navigate("/", { state: { category: nextCategory } });
  };

  const newArticleButton = (presetCategory) =>
    isAdmin && !isWriting ? (
      <button
        onClick={() => openNewArticleForm(presetCategory)}
        className="text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md flex items-center gap-2 transition-transform hover:scale-105 bg-[var(--brand-600)] hover:bg-[var(--brand-700)]"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg> 새 기사 작성
      </button>
    ) : null;

  const articleFormView = (
    <ArticleForm
      initialArticle={editingArticle}
      onSave={editingArticle?.id != null ? handleUpdateArticle : handleSaveArticle}
      onCancel={() => {
        setIsWriting(false);
        setEditingArticle(null);
      }}
    />
  );

  // =================================================================
  // 목록 뷰 (카테고리 / 검색 결과 공용)
  // =================================================================
  const renderListView = () => {
    const emptyMessage = isSearch
      ? keyword
        ? `「${search}」에 대한 검색 결과가 없습니다.`
        : "검색어를 입력한 뒤 검색창에서 엔터를 눌러주세요."
      : keyword
        ? "검색 결과가 없습니다."
        : "등록된 기사가 없습니다.";

    return (
      <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
        <div className="flex justify-between items-end border-b-2 border-gray-900 pb-3 mb-6">
          <h2 className="text-3xl font-black text-gray-900">
            {isSearch ? (
              <>검색 결과 {keyword ? <span className="text-[var(--brand-600)]">「{search}」</span> : ""}</>
            ) : (
              <><span className="text-[var(--brand-600)]">{category}</span> 뉴스</>
            )}
          </h2>
          {newArticleButton(isSearch ? "" : category)}
        </div>

        {isWriting ? (
          articleFormView
        ) : list.loading ? (
          <SkeletonList />
        ) : list.error ? (
          <div className="text-center py-20 text-gray-400">
            기사를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
          </div>
        ) : (
          <div className="space-y-6">
            {listItems.map((news) => (
              <ListArticleCard
                key={news.id}
                news={news}
                isAdmin={isAdmin}
                onOpen={goDetail}
                onEdit={openEditor}
                onDelete={handleDeleteArticle}
              />
            ))}

            {listItems.length === 0 && (
              <div className="text-center py-20 text-gray-400">{emptyMessage}</div>
            )}

            {totalItems > 0 && (
              <Pagination page={page} totalPages={totalPages} onChange={setPage} showJump={!isSearch} />
            )}
          </div>
        )}
      </div>
    );
  };

  // =================================================================
  // 홈 화면
  // =================================================================
  const renderMainGrid = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 auto-rows-[minmax(180px,auto)] animate-[fadeIn_0.3s_ease-out]">
      <HeadlineWidget items={headlines} loading={home.loading} onOpen={goDetail} />

      {NEWS_CATEGORIES.map((name) => (
        <GroupWidget
          key={name}
          title={name}
          targetCategories={[name]}
          items={homeSections.get(name) || []}
          loading={home.loading}
          onOpen={goDetail}
          onSelectCategory={selectCategory}
        />
      ))}
    </div>
  );

  return <>{isHome ? renderMainGrid() : renderListView()}</>;
}
