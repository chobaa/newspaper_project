import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getDisplaySettings } from '../utils/displaySettings';

import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import Footer from '../components/Footer';

export default function ArticleDetail() {
  const location = useLocation();
  const navigate = useNavigate();
  const display = getDisplaySettings();

  // 목록에서 넘겨준 기사 데이터 받기
  const article = location.state?.article;

  // 스크롤을 맨 위로 올리기 (페이지 이동 시)
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

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

  // 관련 기사 더미 데이터 (같은 카테고리 느낌을 주기 위해 생성)
  const relatedNews = [
    { id: 101, title: `${article.category} 분야의 또 다른 중요 이슈입니다`, date: "2026.01.08" },
    { id: 102, title: "관련된 심층 분석 기사를 확인해보세요", date: "2026.01.07" },
    { id: 103, title: "전문가들이 말하는 향후 전망은?", date: "2026.01.06" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* 1. 헤더 (상단 고정) */}
      {/* 상세 페이지에서는 카테고리 클릭 시 홈으로 이동하도록 처리 */}
      <Header onSelectCategory={() => navigate('/')} />

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
              <div className="flex gap-2">
                <button className="hover:text-gray-900">공유</button>
                <button className="hover:text-gray-900">스크랩</button>
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

          {/* ✅ [추가] 관련 기사 섹션 */}
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-100">
            <h3 className="font-bold text-lg text-gray-800 mb-4 border-l-4 border-blue-600 pl-3">
              이 시각 <span className="text-blue-600">{article.category}</span> 주요 뉴스
            </h3>
            <ul className="space-y-3">
              {relatedNews.map((news) => (
                <li key={news.id} className="group flex justify-between items-center cursor-pointer hover:bg-white p-2 rounded transition">
                  <span className="text-gray-700 group-hover:text-blue-600 group-hover:underline truncate flex-1">
                    · {news.title}
                  </span>
                  <span className="text-xs text-gray-400 ml-4">{news.date}</span>
                </li>
              ))}
            </ul>
          </div>

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