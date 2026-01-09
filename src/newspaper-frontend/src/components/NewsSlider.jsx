import { useState, useEffect } from "react";

export default function NewsSlider() {
  const [activeTab, setActiveTab] = useState("많이 본 뉴스");
  const [currentIndex, setCurrentIndex] = useState(0);

  const slideData = {
    "많이 본 뉴스": [
      { id: 1, title: "삼성전자, 역대급 실적 발표 예상", img: "https://picsum.photos/400/250?random=1" },
      { id: 2, title: "서울 아파트값 3주 연속 상승세", img: "https://picsum.photos/400/250?random=2" },
      { id: 3, title: "주말 날씨: 전국 맑고 포근", img: "https://picsum.photos/400/250?random=3" },
    ],
    "실시간 급상승": [
      { id: 4, title: "손흥민 시즌 10호골 폭발", img: "https://picsum.photos/400/250?random=4" },
      { id: 5, title: "비트코인 1억 돌파 눈앞", img: "https://picsum.photos/400/250?random=5" },
      { id: 6, title: "새로운 AI 모델 공개", img: "https://picsum.photos/400/250?random=6" },
    ],
  };

  const currentArticles = slideData[activeTab];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % currentArticles.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [activeTab, currentArticles.length]);

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden mb-6">
      <div className="flex border-b border-gray-100">
        {Object.keys(slideData).map((tab) => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setCurrentIndex(0); }}
            className={`flex-1 py-3 text-sm font-bold transition-colors ${
              activeTab === tab ? "bg-blue-600 text-white" : "bg-white text-gray-500 hover:bg-gray-50"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
      <div className="p-4">
        <div className="relative overflow-hidden rounded-xl h-48 mb-3 group">
          <img 
            src={currentArticles[currentIndex].img} 
            alt="news" 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
            {currentIndex + 1} / {currentArticles.length}
          </div>
        </div>
        <h4 className="font-bold text-lg leading-snug text-gray-800 hover:text-blue-600 cursor-pointer transition-colors">
          {currentArticles[currentIndex].title}
        </h4>
      </div>
      <div className="px-4 pb-4 space-y-2">
        {currentArticles.map((item, idx) => (
          <div 
            key={item.id} 
            onClick={() => setCurrentIndex(idx)}
            className={`text-sm cursor-pointer truncate p-2 rounded transition-colors ${
              idx === currentIndex ? "font-bold text-blue-600 bg-blue-50" : "text-gray-500 hover:bg-gray-50"
            }`}
          >
             • {item.title}
          </div>
        ))}
      </div>
    </div>
  );
}