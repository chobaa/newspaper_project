import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function NewsSlider() {
  const [activeTab, setActiveTab] = useState("많이 본 뉴스");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [popularArticles, setPopularArticles] = useState([]);
  const [latestArticles, setLatestArticles] = useState([]);
  const navigate = useNavigate();

  // 백엔드에서 기사 목록을 불러와 인기/최신 기사로 분리
  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const res = await fetch("/api/articles");
        if (!res.ok) {
          return;
        }
        const data = await res.json();
        // 본문 HTML에서 첫 번째 <img>를 찾은 기사만 사용
        const mapped = data
          .map((a) => {
            const imgMatch = a.content
              ? a.content.match(/<img[^>]+src="([^">]+)"/)
              : null;
            const firstImage = imgMatch && imgMatch[1] ? imgMatch[1] : null;
            return {
              id: a.id,
              title: a.title,
              img: firstImage,
              viewCount: a.viewCount || 0,
              regDate: a.regDate,
            };
          })
          .filter((a) => !!a.img); // 이미지가 있는 기사만 슬라이더에 노출

        const popular = [...mapped]
          .sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0))
          .slice(0, 5);
        const latest = [...mapped]
          .sort((a, b) => {
            const da = a.regDate || "";
            const db = b.regDate || "";
            return db.localeCompare(da);
          })
          .slice(0, 5);

        setPopularArticles(popular);
        setLatestArticles(latest);
        setCurrentIndex(0);
      } catch (e) {
        // ignore
      }
    };
    fetchArticles();
  }, []);

  const slideData = {
    "많이 본 뉴스": popularArticles,
    "실시간 급상승": latestArticles,
  };

  const currentArticles = slideData[activeTab] || [];

  useEffect(() => {
    if (!currentArticles.length) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % currentArticles.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [activeTab, currentArticles.length]);

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
              {current.title}
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
              • {item.title}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}