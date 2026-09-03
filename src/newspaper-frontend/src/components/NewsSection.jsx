import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; // ✅ 페이지 이동 훅 추가
import Widget from "./Widget";
import ArticleForm from "./ArticleForm";
import AdBanner from "./AdBanner";
import { useBrandSettings } from "../context/BrandSettingsContext";
import { decodeHtmlEntities } from "../utils/text";
import useArticles from "../hooks/useArticles";

const PAGE_SIZE = 10;

export default function NewsSection({ category, categoryVersion, isAdmin, search, searchType = "titleAndContent" }) {
  const [articles, setArticles] = useState([]);
  const [isWriting, setIsWriting] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
  const [page, setPage] = useState(1);
  const [pageInput, setPageInput] = useState("");
  const navigate = useNavigate(); // ✅ 이동 함수 생성
  const { settings: brand } = useBrandSettings();
  const parseBannerList = (raw, fallbackText) => {
    if (!raw) return [];
    if (Array.isArray(raw)) {
      return raw.map((b) => ({
        imageUrl: b.imageUrl || "",
        linkUrl: b.linkUrl || "",
        text: b.text || fallbackText || "",
        show: b.show !== false,
      }));
    }
    if (typeof raw === "string") {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.map((b) => ({
            imageUrl: b.imageUrl || "",
            linkUrl: b.linkUrl || "",
            text: b.text || fallbackText || "",
            show: b.show !== false,
          }));
        }
      } catch {
        // 문자열 하나만 있는 기존 방식 지원
        return [{
          imageUrl: raw,
          text: fallbackText,
          linkUrl: "",
          show: true,
        }];
      }
    }
    return [];
  };

  const articlesMode = category === "전체" ? "home" : "full";
  // 홈페이지(카테고리=전체)는 응답을 줄이기 위해 home용 엔드포인트를 사용합니다.
  const { data: rawArticles } = useArticles({ mode: articlesMode, limit: 80 });

  useEffect(() => {
    // 백엔드에서 실제 기사 목록 불러오기
    if (!rawArticles) return;

    const fetchArticles = () => {
      try {
        const data = rawArticles;
        const normalizeContentHtml = (html) => {
          if (!html) return "";
          return html
            .replace(/&amp;nbsp;/g, " ")
            .replace(/&nbsp;/g, " ");
        };

        const extractYouTubeIdFromUrl = (url) => {
          try {
            const u = new URL(String(url || "").trim());
            const host = u.hostname.replace(/^www\./, "");
            if (host === "youtube.com" || host === "m.youtube.com") {
              const v = u.searchParams.get("v");
              if (v) return v;
              const shortsMatch = u.pathname.match(/^\/shorts\/([^/]+)/);
              if (shortsMatch?.[1]) return shortsMatch[1];
              const embedMatch = u.pathname.match(/^\/embed\/([^/]+)/);
              if (embedMatch?.[1]) return embedMatch[1];
            }
            if (host === "youtu.be") {
              const id = u.pathname.replace("/", "").trim();
              if (id) return id;
            }
          } catch (_) {}
          return null;
        };

        const extractYouTubeIdFromContent = (contentHtml) => {
          if (!contentHtml) return null;

          // 1) <iframe src="..."> (quill video)
          const iframeMatch = contentHtml.match(/<iframe[^>]+src="([^">]+)"/i);
          if (iframeMatch?.[1]) {
            const id = extractYouTubeIdFromUrl(decodeHtmlEntities(iframeMatch[1]));
            if (id) return id;
          }

          // 2) <a href="URL">URL</a>
          const aMatch = contentHtml.match(/<a\b[^>]*href="(https?:\/\/[^"]+)"/i);
          if (aMatch?.[1]) {
            const id = extractYouTubeIdFromUrl(decodeHtmlEntities(aMatch[1]));
            if (id) return id;
          }

          // 3) plain URL text
          const urlMatch = contentHtml.match(/https?:\/\/[^\s<"]+/i);
          if (urlMatch?.[0]) {
            const id = extractYouTubeIdFromUrl(decodeHtmlEntities(urlMatch[0]));
            if (id) return id;
          }

          // 4) fallback: youtube patterns inside HTML (covers escaped/odd formatting)
          const raw = decodeHtmlEntities(String(contentHtml));
          const embedId = raw.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{6,})/i)?.[1];
          if (embedId) return embedId;
          const watchId = raw.match(/[?&]v=([a-zA-Z0-9_-]{6,})/i)?.[1];
          if (watchId) return watchId;
          const shortId = raw.match(/youtu\.be\/([a-zA-Z0-9_-]{6,})/i)?.[1];
          if (shortId) return shortId;
          const shortsId = raw.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{6,})/i)?.[1];
          if (shortsId) return shortsId;

          return null;
        };
        const mapped = data.map((a) => {
          const contentHtml = normalizeContentHtml(a.content || "");
          const plainText = contentHtml.replace(/<[^>]+>/g, "");
          // 헤드라인/리스트 모두에서 좀 더 긴 요약을 보여주기 위해 길이를 늘림
          const desc =
            plainText.length > 0
              ? plainText.slice(0, 300) + (plainText.length > 300 ? "..." : "")
              : "";
          // 본문 HTML에서 첫 번째 <img src="...">를 그대로 썸네일로 사용
          const imgMatch = contentHtml
            ? contentHtml.match(/<img[^>]+src="([^">]+)"/)
            : null;
          // contentHtml 안의 &amp; 같은 엔티티가 남아있으면 React img src에서 그대로 요청되어 깨질 수 있음
          const firstImage = imgMatch && imgMatch[1] ? decodeHtmlEntities(imgMatch[1]) : null;

          const ytId = extractYouTubeIdFromContent(contentHtml);
          const videoThumb = ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : null;
          const dateStr = a.regDate ? a.regDate.substring(0, 10) : "";
          return {
            id: a.id,
            category: a.category || "성남시정",
            title: a.title,
            desc,
            content: a.content,
            date: dateStr,
            author: a.writer || "기자",
            img: firstImage || videoThumb,
            hasVideoThumb: !!(videoThumb && !firstImage),
          };
        });
        setArticles(mapped);
      } catch (e) {
        console.error(e);
      }
    };

    fetchArticles();
  }, [rawArticles]);

  useEffect(() => {
    if (!isAdmin) setIsWriting(false);
  }, [isAdmin]);

  // 상단 카테고리 변경 또는 동일 카테고리 재클릭 시: 작성 모드 종료 + 1페이지로 이동
  useEffect(() => {
    setIsWriting(false);
    setEditingArticle(null);
    setPage(1);
    setPageInput("");
  }, [categoryVersion, category]);

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

  const handleSaveArticle = async (newArticle) => {
    try {
      const imageUrls = extractImageUrlsFromContent(newArticle.content || "");
      const payload = {
        title: newArticle.title != null ? String(newArticle.title) : "",
        category: newArticle.category != null ? String(newArticle.category) : "",
        content: newArticle.content != null ? String(newArticle.content) : "",
        writer: newArticle.author != null ? String(newArticle.author) : "",
        imageUrls: Array.isArray(imageUrls) ? imageUrls : [],
      };

      const res = await fetch("/api/articles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        let msg = "기사 저장에 실패했습니다.";
        try {
          const json = JSON.parse(text);
          if (json.detail) msg += " " + json.detail;
          else if (json.error) msg = json.error;
        } catch (_) {
          if (text) msg += " " + text;
        }
        throw new Error(msg);
      }

      const newId = await res.json();

      const firstImage =
        imageUrls && imageUrls.length > 0 ? imageUrls[0] : null;

      const savedArticle = { ...newArticle, id: newId, img: firstImage };

      setArticles((prev) => [savedArticle, ...prev]);
      setIsWriting(false);
      setEditingArticle(null);
      alert("기사가 성공적으로 발행되었습니다!");
    } catch (e) {
      console.error(e);
      alert("기사 저장 중 오류가 발생했습니다.");
    }
  };

  const handleDeleteArticle = (e, id) => {
    e.stopPropagation(); // 클릭 이벤트 전파 방지 (상세페이지 이동 막기)
    if (!window.confirm("정말 이 기사를 삭제하시겠습니까?")) return;

    // 백엔드 삭제 호출 후 상태에서도 제거
    fetch(`/api/articles/${id}`, {
      method: "DELETE",
    })
      .catch((err) => console.error(err))
      .finally(() => {
        setArticles((prev) => prev.filter((article) => article.id !== id));
      });
  };

  // ✅ [핵심] 상세 페이지로 이동하는 함수
  const goDetail = (article) => {
    navigate(`/article/${article.id}`, { state: { article } });
  };

  const handleUpdateArticle = async (updatedArticle) => {
    const id = updatedArticle?.id;
    if (id == null || id === "" || String(id) === "undefined") {
      alert("기사 ID가 없어 수정할 수 없습니다.");
      return;
    }
    try {
      const imageUrls = extractImageUrlsFromContent(updatedArticle.content || "");
      const payload = {
        title: updatedArticle.title != null ? String(updatedArticle.title) : "",
        category: updatedArticle.category != null ? String(updatedArticle.category) : "",
        content: updatedArticle.content != null ? String(updatedArticle.content) : "",
        writer: updatedArticle.author != null ? String(updatedArticle.author) : "",
        imageUrls: Array.isArray(imageUrls) ? imageUrls : [],
      };

      const res = await fetch(`/api/articles/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        let msg = "기사 수정에 실패했습니다.";
        try {
          const json = JSON.parse(text);
          if (json.detail) msg += " " + json.detail;
          else if (json.error) msg = json.error;
        } catch (_) {
          if (text) msg += " " + text;
        }
        throw new Error(msg);
      }

      const firstImage =
        imageUrls && imageUrls.length > 0 ? imageUrls[0] : null;

      setArticles((prev) =>
        prev.map((a) =>
          a.id === updatedArticle.id
            ? {
                ...a,
                title: updatedArticle.title,
                category: updatedArticle.category,
                desc: updatedArticle.desc,
                content: updatedArticle.content,
                img: firstImage,
                author: updatedArticle.author,
                date: updatedArticle.date,
              }
            : a
        )
      );

      setIsWriting(false);
      setEditingArticle(null);
      window.__articleDirty = false;
      alert("기사가 수정되었습니다.");
    } catch (e) {
      console.error(e);
      alert(e.message || "기사 수정 중 오류가 발생했습니다.");
    }
  };

  // =================================================================
  // 그룹 위젯 (섹터별 가로형 긴 카드 3개)
  // =================================================================
  const GroupWidget = ({ title, targetCategories }) => {
    const filtered = articles.filter((a) => targetCategories.includes(a.category));
    const primaryCategory = targetCategories[0];
    const hasPairTitle = Array.isArray(targetCategories) && targetCategories.length === 2;

    const renderTitle = () => {
      if (!hasPairTitle) return title;
      const [left, right] = targetCategories;
      return (
        <div className="inline-flex items-center gap-1 text-base md:text-lg">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              navigate("/", { state: { category: left } });
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
              navigate("/", { state: { category: right } });
            }}
            className="font-extrabold text-gray-900 hover:text-[var(--brand-700)] transition-colors"
          >
            {right}
          </button>
        </div>
      );
    };

    if (filtered.length === 0) {
      return (
        <Widget
          title={renderTitle()}
          onTitleClick={hasPairTitle ? undefined : () => {
            if (!primaryCategory) return;
            navigate("/", { state: { category: primaryCategory } });
          }}
        >
          <div className="h-32 flex items-center justify-center text-gray-400 text-sm bg-gray-50 rounded-lg">
            등록된 기사가 없습니다.
          </div>
        </Widget>
      );
    }

    const items = filtered.slice(0, 3);

    return (
      <Widget
        title={renderTitle()}
        onTitleClick={hasPairTitle ? undefined : () => {
          if (!primaryCategory) return;
          navigate("/", { state: { category: primaryCategory } });
        }}
      >
        <div className="space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              onClick={() => goDetail(item)}
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
                  {item.hasVideoThumb && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-black/45 backdrop-blur-sm flex items-center justify-center shadow">
                        <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="currentColor" aria-hidden="true">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>
                  )}
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
                  <span className="truncate flex-1 text-right">
                    {item.author}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Widget>
    );
  };


  // =================================================================
  // 검색 결과 전용 뷰 (검색창에서 엔터 시 이동)
  // =================================================================
  const SearchResultsView = () => {
    const keyword = (search || "").trim().toLowerCase();
    let filteredArticles = articles;
    if (keyword) {
      filteredArticles = articles.filter((a) => {
        const title = a.title?.toLowerCase() || "";
        const desc = a.desc?.toLowerCase() || "";
        if (searchType === "title") return title.includes(keyword);
        if (searchType === "content") return desc.includes(keyword);
        return title.includes(keyword) || desc.includes(keyword);
      });
    }

    const totalPages = Math.max(1, Math.ceil(filteredArticles.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    const displayList = filteredArticles.slice(start, end);

    return (
      <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
        <div className="flex justify-between items-end border-b-2 border-gray-900 pb-3 mb-6">
          <h2 className="text-3xl font-black text-gray-900">
            검색 결과 {keyword ? <span className="text-[var(--brand-600)]">「{search}」</span> : ""}
          </h2>
          {isAdmin && !isWriting && (
            <button
              onClick={() => {
                setIsWriting(true);
                setEditingArticle({
                  id: undefined,
                  title: "",
                  category: "",
                  content: "",
                  desc: "",
                  date: new Date().toLocaleDateString(),
                  author: "",
                });
              }}
              className="text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md flex items-center gap-2 transition-transform hover:scale-105 bg-[var(--brand-600)] hover:bg-[var(--brand-700)]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg> 새 기사 작성
            </button>
          )}
        </div>

        {isWriting ? (
          <ArticleForm
            initialArticle={editingArticle}
            onSave={editingArticle?.id != null ? handleUpdateArticle : handleSaveArticle}
            onCancel={() => {
              setIsWriting(false);
              setEditingArticle(null);
            }}
          />
        ) : (
          <div className="space-y-6">
            {displayList.map((news) => (
              <div
                key={news.id}
                onClick={() => goDetail(news)}
                className="flex flex-col sm:flex-row gap-6 group cursor-pointer border-b border-gray-100 pb-6 last:border-0 hover:bg-gray-50/50 p-2 rounded-xl transition-colors"
              >
                {news.img && (
                  <div className="w-full sm:w-48 h-32 bg-gray-200 rounded-lg overflow-hidden shrink-0 relative">
                    <img src={news.img} alt="news" loading="lazy" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    <span className="absolute top-2 left-2 backdrop-blur-sm text-white text-[10px] px-2 py-1 rounded font-bold shadow-sm bg-[var(--brand-600)]/90">{news.category}</span>
                    {news.hasVideoThumb && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-11 h-11 rounded-full bg-black/45 backdrop-blur-sm flex items-center justify-center shadow">
                          <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="currentColor" aria-hidden="true">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                      </div>
                    )}
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
                    <div className="text-xs text-gray-400 font-medium"><span className="text-[var(--brand-500)]">{news.author}</span> • <span>{news.date}</span></div>
                    {isAdmin && (
                      <div className="flex gap-2">
                        <button
                          className="text-xs border border-gray-200 bg-white px-2 py-1 rounded hover:bg-[var(--brand-50)] text-[var(--brand-600)]"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingArticle(news);
                            setIsWriting(true);
                          }}
                        >
                          수정
                        </button>
                        <button
                          onClick={(e) => handleDeleteArticle(e, news.id)}
                          className="text-xs border border-gray-200 bg-white px-2 py-1 rounded hover:bg-red-50 text-red-600"
                        >
                          삭제
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {displayList.length === 0 && (
              <div className="text-center py-20 text-gray-400">
                {keyword ? `「${search}」에 대한 검색 결과가 없습니다.` : "검색어를 입력한 뒤 검색창에서 엔터를 눌러주세요."}
              </div>
            )}

            {filteredArticles.length > 0 && (
              <div className="flex flex-col items-center gap-3 pt-4">
                <div className="flex flex-wrap justify-center gap-2">
                  {(() => {
                    const maxButtons = 10;
                    let startBtn = Math.max(1, safePage - 4);
                    let endBtn = Math.min(totalPages, startBtn + maxButtons - 1);
                    startBtn = Math.max(1, endBtn - maxButtons + 1);
                    const arr = [];
                    for (let i = startBtn; i <= endBtn; i++) arr.push(i);
                    return arr;
                  })().map((p) => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`min-w-[32px] px-2 py-1 rounded border text-sm ${
                        p === safePage
                          ? "text-white border-[var(--brand-600)] bg-[var(--brand-600)]"
                          : "text-gray-700 border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-gray-600">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={safePage === 1}
                    className={`px-3 py-1 rounded border ${safePage === 1 ? "text-gray-300 border-gray-200 cursor-not-allowed" : "text-gray-700 border-gray-300 hover:bg-gray-50"}`}
                  >
                    이전
                  </button>
                  <span className="text-sm text-gray-500">{safePage} / {totalPages}</span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safePage === totalPages}
                    className={`px-3 py-1 rounded border ${safePage === totalPages ? "text-gray-300 border-gray-200 cursor-not-allowed" : "text-gray-700 border-gray-300 hover:bg-gray-50"}`}
                  >
                    다음
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // =================================================================
  // 카테고리별 전체 리스트 뷰
  // =================================================================
  const CategoryListView = () => {
    const keyword = (search || "").trim().toLowerCase();
    let filteredArticles = articles.filter(a => a.category === category);
    if (keyword) {
      filteredArticles = filteredArticles.filter((a) => {
        const title = a.title?.toLowerCase() || "";
        const desc = a.desc?.toLowerCase() || "";
        if (searchType === "title") return title.includes(keyword);
        if (searchType === "content") return desc.includes(keyword);
        return title.includes(keyword) || desc.includes(keyword);
      });
    }

    const totalPages = Math.max(1, Math.ceil(filteredArticles.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    const displayList = filteredArticles.slice(start, end);

    return (
      <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
        <div className="flex justify-between items-end border-b-2 border-gray-900 pb-3 mb-6">
          <h2 className="text-3xl font-black text-gray-900">
            <span className="text-[var(--brand-600)]">{category}</span> 뉴스
          </h2>
          {isAdmin && !isWriting && (
            <button
              onClick={() => {
                setIsWriting(true);
                setEditingArticle({
                  id: undefined,
                  title: "",
                  category,
                  content: "",
                  desc: "",
                  date: new Date().toLocaleDateString(),
                  author: "",
                });
              }}
              className="text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md flex items-center gap-2 transition-transform hover:scale-105 bg-[var(--brand-600)] hover:bg-[var(--brand-700)]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg> 새 기사 작성
            </button>
          )}
        </div>
        {isWriting ? (
          <ArticleForm
            initialArticle={editingArticle}
            onSave={editingArticle?.id != null ? handleUpdateArticle : handleSaveArticle}
            onCancel={() => {
              setIsWriting(false);
              setEditingArticle(null);
            }}
          />
        ) : (
          <div className="space-y-6">
            {displayList.map((news) => (
              // ✅ 리스트 아이템 클릭 시 이동
              <div
                key={news.id}
                onClick={() => goDetail(news)}
                className="flex flex-col sm:flex-row gap-6 group cursor-pointer border-b border-gray-100 pb-6 last:border-0 hover:bg-gray-50/50 p-2 rounded-xl transition-colors"
              >
                {news.img && (
                  <div className="w-full sm:w-48 h-32 bg-gray-200 rounded-lg overflow-hidden shrink-0 relative">
                    <img src={news.img} alt="news" loading="lazy" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    <span className="absolute top-2 left-2 backdrop-blur-sm text-white text-[10px] px-2 py-1 rounded font-bold shadow-sm bg-[var(--brand-600)]/90">{news.category}</span>
                    {news.hasVideoThumb && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-11 h-11 rounded-full bg-black/45 backdrop-blur-sm flex items-center justify-center shadow">
                          <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="currentColor" aria-hidden="true">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                      </div>
                    )}
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
                    <div className="text-xs text-gray-400 font-medium"><span className="text-[var(--brand-500)]">{news.author}</span> • <span>{news.date}</span></div>
                    {isAdmin && (
                      <div className="flex gap-2">
                        <button
                          className="text-xs border border-gray-200 bg-white px-2 py-1 rounded hover:bg-[var(--brand-50)] text-[var(--brand-600)]"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingArticle(news);
                            setIsWriting(true);
                          }}
                        >
                          수정
                        </button>
                        <button
                          onClick={(e) => handleDeleteArticle(e, news.id)}
                          className="text-xs border border-gray-200 bg-white px-2 py-1 rounded hover:bg-red-50 text-red-600"
                        >
                          삭제
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {displayList.length === 0 && (
              <div className="text-center py-20 text-gray-400">
                {keyword ? "검색 결과가 없습니다." : "등록된 기사가 없습니다."}
              </div>
            )}

            {filteredArticles.length > 0 && (
              <div className="flex flex-col items-center gap-3 pt-4">
                {/* 페이지 번호 버튼 (최대 10개) */}
                <div className="flex flex-wrap justify-center gap-2">
                  {(() => {
                    const maxButtons = 10;
                    let start = Math.max(1, safePage - 4);
                    let end = Math.min(totalPages, start + maxButtons - 1);
                    // 뒤쪽이 부족하면 앞을 당겨서 항상 최대한 10개 보여주기
                    start = Math.max(1, end - maxButtons + 1);
                    const arr = [];
                    for (let i = start; i <= end; i++) arr.push(i);
                    return arr;
                  })().map((p) => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`min-w-[32px] px-2 py-1 rounded border text-sm ${
                        p === safePage
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
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={safePage === 1}
                    className={`px-3 py-1 rounded border ${
                      safePage === 1
                        ? "text-gray-300 border-gray-200 cursor-not-allowed"
                        : "text-gray-700 border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    이전
                  </button>
                  <span className="text-sm text-gray-500">
                    {safePage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safePage === totalPages}
                    className={`px-3 py-1 rounded border ${
                      safePage === totalPages
                        ? "text-gray-300 border-gray-200 cursor-not-allowed"
                        : "text-gray-700 border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    다음
                  </button>

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
                        if (!isNaN(num) && num >= 1 && num <= totalPages) {
                          setPage(num);
                        }
                      }}
                      className="px-3 py-1 rounded border border-gray-300 bg-white hover:bg-gray-50 text-sm"
                    >
                      이동
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const MainGridView = () => {
    const [headlineIndex, setHeadlineIndex] = useState(0);

    const headlineItems = articles.slice(0, 5);

    useEffect(() => {
      if (headlineItems.length === 0) return;
      const timer = setInterval(() => {
        setHeadlineIndex((prev) => (prev + 1) % headlineItems.length);
      }, 4000);
      return () => clearInterval(timer);
    }, [headlineItems.length]);

    const headline = headlineItems[headlineIndex];

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 auto-rows-[minmax(180px,auto)] animate-[fadeIn_0.3s_ease-out]">

        {/* 상단 헤드라인 위젯: 최신 기사 1건 (좌썸네일/우텍스트 레이아웃) */}
        <Widget className="lg:col-span-2 min-h-[260px] group cursor-pointer">
          {headline ? (
            <div
              onClick={() => goDetail(headline)}
              className="flex flex-col"
            >
              {/* 배지·인디케이터: 이미지/제목 위에 한 줄로 */}
              <div className="flex items-center justify-between mb-3">
                <span className="inline-block px-3 py-1 text-xs font-bold text-white rounded-full bg-[var(--brand-600)]">
                  HEADLINE · {headline.category}
                </span>
                {headlineItems.length > 1 && (
                  <div className="flex items-center gap-1 text-[10px] text-gray-400">
                    <span>{headlineIndex + 1} / {headlineItems.length}</span>
                    <div className="flex gap-1">
                      {headlineItems.map((item, idx) => (
                        <button
                          key={item.id || idx}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setHeadlineIndex(idx);
                          }}
                          className={`w-2 h-2 rounded-full ${
                            idx === headlineIndex
                              ? "bg-[var(--brand-600)]"
                              : "bg-gray-300"
                          }`}
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
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    {headline.hasVideoThumb && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-14 h-14 rounded-full bg-black/45 backdrop-blur-sm flex items-center justify-center shadow">
                          <svg viewBox="0 0 24 24" className="w-7 h-7 text-white" fill="currentColor" aria-hidden="true">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                      </div>
                    )}
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

        <GroupWidget title="성남시정" targetCategories={["성남시정"]} />
        <GroupWidget title="성남시의회" targetCategories={["성남시의회"]} />
        <GroupWidget title="사회/복지" targetCategories={["사회/복지"]} />
        <GroupWidget title="교육/문화" targetCategories={["교육/문화"]} />
        <GroupWidget title="경기도정" targetCategories={["경기도정"]} />
        <GroupWidget title="경기도의회" targetCategories={["경기도의회"]} />
        <GroupWidget title="인터뷰칼럼" targetCategories={["인터뷰칼럼"]} />
        <GroupWidget title="동영상뉴스" targetCategories={["동영상뉴스"]} />
      </div>
    );
  };

  return (
    <>
      {category === "전체" && <MainGridView />}
      {category === "검색결과" && <SearchResultsView />}
      {category !== "전체" && category !== "검색결과" && <CategoryListView />}
    </>
  );
}