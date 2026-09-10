import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { decodeHtmlEntities } from "../utils/text";
import useApi from "../hooks/useApi";
import { mapSummaries, sliderUrl } from "../api/articles";

const SLIDE_COUNT = 5;

export default function NewsSlider() {
  const [activeTab, setActiveTab] = useState("많이 본 뉴스");
  const [rawIndex, setCurrentIndex] = useState(0);
  const navigate = useNavigate();

  // 많이 본 뉴스 / 실시간 급상승 계산은 서버에서 하고, 여기서는 5건씩만 받아옵니다.
  const { data, loading } = useApi(sliderUrl(SLIDE_COUNT));

  const popularArticles = useMemo(() => mapSummaries(data?.popular), [data]);
  const realtimeArticles = useMemo(() => mapSummaries(data?.realtime), [data]);

  const slideData = {
    "많이 본 뉴스": popularArticles,
    "실시간 급상승": realtimeArticles,
  };

  const currentArticles = slideData[activeTab] || [];
  // 탭을 바꾸거나 목록이 갱신돼도 범위를 벗어나지 않도록 렌더 시점에 보정합니다.
  const currentIndex = currentArticles.length > 0 ? rawIndex % currentArticles.length : 0;

  useEffect(() => {
    if (!currentArticles.length) return undefined;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % currentArticles.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [activeTab, currentArticles.length]);

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden mb-6 p-4" aria-busy="true">
        <div className="h-48 rounded-xl bg-gray-200 animate-pulse mb-3" />
        <div className="h-5 bg-gray-200 rounded animate-pulse w-4/5 mb-4" />
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-4 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!currentArticles.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden mb-6 p-6 text-sm text-gray-400">
        아직 추천할 기사가 없습니다.
      </div>
    );
  }

  const current = currentArticles[currentIndex] || null;

  const goDetail = (article) => {
    if (!article || !article.id) return;
    navigate(`/article/${article.id}`);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden mb-6">
      <div className="flex border-b border-gray-100">
        {Object.keys(slideData).map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              setCurrentIndex(0);
            }}
            className={`flex-1 py-3 text-sm font-bold transition-colors ${
              activeTab === tab
                ? "text-white bg-[var(--brand-600)]"
                : "bg-white text-gray-500 hover:bg-gray-50"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
      <div className="p-4">
        {current && (
          <>
            <div
              className="relative overflow-hidden rounded-xl h-48 mb-3 group cursor-pointer"
              onClick={() => goDetail(current)}
            >
              <img
                src={current.img}
                alt="news"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
                {currentIndex + 1} / {currentArticles.length}
              </div>
            </div>
            <h4
              className="font-bold text-lg leading-snug text-gray-800 cursor-pointer transition-colors hover:text-[var(--brand-600)]"
              onClick={() => goDetail(current)}
            >
              {decodeHtmlEntities(current.title)}
            </h4>
          </>
        )}
      </div>
      <div className="px-4 pb-4 space-y-2">
        {currentArticles.map((item, idx) => (
          <div
            key={item.id}
            onClick={() => {
              setCurrentIndex(idx);
            }}
            className={`text-sm cursor-pointer truncate p-2 rounded transition-colors ${
              idx === currentIndex
                ? "font-bold bg-[var(--brand-50)] text-[var(--brand-600)]"
                : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            <span
              onClick={() => goDetail(item)}
              className="inline-block w-full"
            >
              • {decodeHtmlEntities(item.title)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
