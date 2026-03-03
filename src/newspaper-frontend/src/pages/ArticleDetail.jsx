import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { getDisplaySettings } from '../utils/displaySettings';

import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import Footer from '../components/Footer';
import ArticleForm from '../components/ArticleForm';

export default function ArticleDetail() {
  const location = useLocation();
  const navigate = useNavigate();
  const { id } = useParams();
  const display = getDisplaySettings();
  const isAdmin = typeof window !== "undefined" && localStorage.getItem("isAdmin") === "true";

  // 목록에서 넘겨준 기사 데이터 받기 (없으면 서버에서 조회)
  const [article, setArticle] = useState(location.state?.article || null);
  const [loading, setLoading] = useState(!location.state?.article);

  const [relatedNews, setRelatedNews] = useState([]);
  const [isEditing, setIsEditing] = useState(false);

  // 스크롤을 맨 위로 올리기 (페이지 이동 시)
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // 서버에서 기사 상세 조회 (URL로 직접 접근 시)
  useEffect(() => {
    const fetchArticle = async () => {
      if (article || !id) return;
      try {
        const res = await fetch(`/api/articles/${id}`);
        if (!res.ok) {
          setLoading(false);
          return;
        }
        const data = await res.json();
        const dateStr = data.regDate ? data.regDate.substring(0, 10) : "";
        const mapped = {
          id: data.id,
          category: data.category || "정치",
          title: data.title,
          content: data.content,
          date: dateStr,
          author: data.writer || "기자",
        };
        setArticle(mapped);
      } catch (e) {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    fetchArticle();
  }, [article, id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-xl text-gray-500 mb-4">기사를 불러오는 중입니다...</p>
      </div>
    );
  }

  // 데이터가 없으면 예외 처리
  if (!article) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-xl text-gray-500 mb-4">기사 정보를 찾을 수 없습니다.</p>
        <button onClick={() => navigate(-1)} className="text-blue-600 hover:underline">
          뒤로 가기
        </button>
      </div>
    );
  }

  // 실제 기사 목록에서 동일 카테고리 추천 기사 불러오기
  useEffect(() => {
    const fetchRelated = async () => {
      if (!article) return;
      try {
        const res = await fetch("/api/articles");
        if (!res.ok) {
          return;
        }
        const data = await res.json();
        const sameCategory = data
          .filter((a) => a.id !== article.id && a.category === article.category)
          .sort((a, b) => (b.id ?? 0) - (a.id ?? 0))
          .slice(0, 3)
          .map((a) => {
            const imgMatch = a.content
              ? a.content.match(/<img[^>]+src="([^">]+)"/)
              : null;
            const firstImage = imgMatch && imgMatch[1] ? imgMatch[1] : null;
            return {
              id: a.id,
              title: a.title,
              date: a.regDate ? a.regDate.substring(0, 10) : "",
              img: firstImage,
            };
          });
        setRelatedNews(sameCategory);
      } catch (e) {
        // ignore
      }
    };
    fetchRelated();
  }, [article]);

  const extractImageUrlsFromContent = (html) => {
    const regex = /<img[^>]+src="([^">]+)"/g;
    const urls = [];
    let match;
    while ((match = regex.exec(html)) !== null) {
      const src = match[1];
      if (src && !src.startsWith("data:")) {
        urls.push(src);
      }
    }
    return urls;
  };

  const handleUpdateArticle = async (updatedArticle) => {
    try {
      const imageUrls = extractImageUrlsFromContent(updatedArticle.content);

      const res = await fetch(`/api/articles/${article.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: updatedArticle.title,
          category: updatedArticle.category,
          content: updatedArticle.content,
          writer: updatedArticle.author,
          imageUrls,
        }),
      });

      if (!res.ok) {
        throw new Error("기사 수정에 실패했습니다.");
      }

      setArticle((prev) => ({
        ...prev,
        title: updatedArticle.title,
        category: updatedArticle.category,
        content: updatedArticle.content,
        author: updatedArticle.author,
      }));

      setIsEditing(false);
      window.__articleDirty = false;
      alert("기사가 수정되었습니다.");
    } catch (e) {
      alert(e.message || "기사 수정 중 오류가 발생했습니다.");
    }
  };

  const handleDeleteArticle = async () => {
    if (!window.confirm("이 기사를 삭제하시겠습니까?")) return;
    try {
      await fetch(`/api/articles/${article.id}`, { method: "DELETE" });
      alert("기사가 삭제되었습니다.");
      navigate(-1);
    } catch (e) {
      alert("기사 삭제 중 오류가 발생했습니다.");
    }
  };

  const handleShare = async () => {
    try {
      const url = window.location.href;
      const title = article.title || "뉴스 기사";
      if (navigator.share) {
        await navigator.share({ title, url });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        alert("기사 링크가 클립보드에 복사되었습니다.");
      } else {
        alert("이 브라우저에서는 공유 기능을 지원하지 않습니다.\nURL: " + url);
      }
    } catch (e) {
      // 사용자가 공유를 취소한 경우 등은 조용히 무시
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* 1. 헤더 (상단 고정) */}
      {/* 상세 페이지에서는 카테고리 클릭 시 홈으로 이동하도록 처리, 로그인 버튼은 숨김 */}
      <Header onSelectCategory={() => navigate('/')} showLogin={false} />

      {/* 2. 메인 컨텐츠 영역 (그리드 레이아웃 적용) */}
      <main className="flex-grow max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-10 gap-8 w-full animate-fade-in-up">

        {/* [왼쪽 70%] 기사 본문 영역 */}
        <div className="lg:col-span-7 bg-white p-6 md:p-10 rounded-xl shadow-sm border border-gray-100 h-fit">

          {/* 뒤로가기 버튼 */}
          <button
            onClick={() => navigate(-1)}
            className="mb-6 text-sm text-gray-500 hover:text-blue-600 flex items-center gap-1 transition"
          >
            ← 목록으로
          </button>

          {isEditing ? (
            <ArticleForm
              initialArticle={article}
              onSave={handleUpdateArticle}
              onCancel={() => {
                setIsEditing(false);
                window.__articleDirty = false;
              }}
            />
          ) : (
            <>
              {/* 기사 헤더 */}
              <div className="border-b pb-6 mb-8">
                <span className="inline-block px-3 py-1 mb-3 text-xs font-bold text-blue-800 bg-blue-100 rounded-full">
                  {article.category}
                </span>
                <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-6 leading-tight">
                  {article.title}
                </h1>
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-gray-700">{article.author} 기자</span>
                    <span className="w-px h-3 bg-gray-300"></span>
                    <span>입력 {article.date}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <button onClick={handleShare} className="hover:text-gray-900">
                      공유
                    </button>
                    {isAdmin && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => setIsEditing(true)}
                          className="text-xs border border-gray-300 bg-white px-3 py-1 rounded hover:bg-blue-50 text-blue-600"
                        >
                          수정
                        </button>
                        <button
                          onClick={handleDeleteArticle}
                          className="text-xs border border-gray-300 bg-white px-3 py-1 rounded hover:bg-red-50 text-red-600"
                        >
                          삭제
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 기사 본문 (Quill 스타일 적용) */}
              <div className="ql-snow mb-12">
                <div
                  className="ql-editor !p-0 !min-h-0 article-content"
                  dangerouslySetInnerHTML={{ __html: article.content }}
                />
              </div>

              {/* ✅ 관련 기사 섹션 (실제 기사 기반) */}
              <div className="bg-gray-50 p-6 rounded-lg border border-gray-100">
                <h3 className="font-bold text-lg text-gray-800 mb-4 border-l-4 border-blue-600 pl-3">
                  이 시각 <span className="text-blue-600">{article.category}</span> 주요 뉴스
                </h3>
                {relatedNews.length === 0 ? (
                  <p className="text-sm text-gray-400">관련 기사가 아직 없습니다.</p>
                ) : (
                  <ul className="space-y-3">
                    {relatedNews.map((news) => (
                      <li
                        key={news.id}
                        className="group flex items-center gap-3 cursor-pointer hover:bg-white p-2 rounded transition"
                        onClick={() => navigate(`/article/${news.id}`)}
                      >
                        {news.img && (
                          <div className="hidden sm:block w-20 h-14 bg-gray-100 rounded-md overflow-hidden flex-shrink-0">
                            <img
                              src={news.img}
                              alt={news.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <div className="flex-1 flex items-center justify-between gap-3 min-w-0">
                          <span className="text-gray-700 group-hover:text-blue-600 group-hover:underline truncate">
                            · {news.title}
                          </span>
                          <span className="text-xs text-gray-400 flex-shrink-0">
                            {news.date}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}

        </div>

        {/* [오른쪽 30%] 사이드바 (배너, 인기순위 등) */}
        <div className="lg:col-span-3">
           {/* Sidebar 컴포넌트 재사용 */}
           <Sidebar />
        </div>

      </main>

      {/* 3. 푸터 */}
      <Footer />

      {/* 스타일링 (관리자 페이지에서 설정한 글꼴/크기/이미지/줄간격 적용) */}
      <style>{`
        .article-content {
          font-family: ${display.fontFamily};
          font-size: ${display.fontSize};
          line-height: ${display.lineHeight};
        }
        .article-content img {
          max-width: ${display.imageMaxWidth};
          height: auto;
          margin: 20px auto;
          border-radius: 8px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          display: block;
        }
        .article-content p {
          margin-bottom: 1.2rem;
          line-height: ${display.lineHeight};
          font-size: ${display.fontSize};
          color: #374151;
        }
        .article-content h1, .article-content h2, .article-content h3 {
          margin-top: 2.5rem;
          margin-bottom: 1rem;
          font-weight: 800;
          color: #111827;
        }
        .article-content blockquote {
          border-left: 4px solid #2563eb;
          padding-left: 1rem;
          font-style: italic;
          color: #4b5563;
          margin: 1.5rem 0;
        }
      `}</style>
    </div>
  );
}