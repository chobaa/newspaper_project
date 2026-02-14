import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; // ✅ 페이지 이동 훅 추가
import Widget from "./Widget";
import ArticleForm from "./ArticleForm";

export default function NewsSection({ category, isAdmin }) {
  const [articles, setArticles] = useState([]);
  const [isWriting, setIsWriting] = useState(false);
  const navigate = useNavigate(); // ✅ 이동 함수 생성

  useEffect(() => {
    // 백엔드에서 실제 기사 목록 불러오기
    const fetchArticles = async () => {
      try {
        const res = await fetch("/api/articles");
        if (!res.ok) {
          throw new Error("기사 목록을 불러오지 못했습니다.");
        }
        const data = await res.json();
        const mapped = data.map((a) => {
          const plainText = a.content ? a.content.replace(/<[^>]+>/g, "") : "";
          const desc =
            plainText.length > 0
              ? plainText.slice(0, 100) + (plainText.length > 100 ? "..." : "")
              : "";
          const firstImage = a.imageUrls && a.imageUrls.length > 0 ? a.imageUrls[0] : `https://picsum.photos/400/300?random=${a.id}`;
          const dateStr = a.regDate ? a.regDate.substring(0, 10) : "";
          return {
            id: a.id,
            category: a.category || "정치",
            title: a.title,
            desc,
            content: a.content,
            date: dateStr,
            author: a.writer || "기자",
            img: firstImage,
          };
        });
        setArticles(mapped);
      } catch (e) {
        console.error(e);
      }
    };

    fetchArticles();
  }, []);

  useEffect(() => {
    if (!isAdmin) setIsWriting(false);
  }, [isAdmin]);

  // 본문 내용에서 이미지 src 추출
  const extractImageUrlsFromContent = (html) => {
    const regex = /<img[^>]+src="([^">]+)"/g;
    const urls = [];
    let match;
    while ((match = regex.exec(html)) !== null) {
      urls.push(match[1]);
    }
    return urls;
  };

  const handleSaveArticle = async (newArticle) => {
    try {
      const imageUrls = extractImageUrlsFromContent(newArticle.content);

      const res = await fetch("/api/articles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: newArticle.title,
          category: newArticle.category,
          content: newArticle.content,
          writer: newArticle.author,
          imageUrls,
        }),
      });

      if (!res.ok) {
        throw new Error("기사 저장에 실패했습니다.");
      }

      const newId = await res.json();
      const savedArticle = { ...newArticle, id: newId };

      setArticles((prev) => [savedArticle, ...prev]);
      setIsWriting(false);
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

  // =================================================================
  // 그룹 위젯 (1개 크게 + 나머지 리스트)
  // =================================================================
  const GroupWidget = ({ title, targetCategories }) => {
    const filtered = articles.filter(a => targetCategories.includes(a.category));

    if (filtered.length === 0) {
      return (
        <Widget title={title}>
          <div className="h-48 flex items-center justify-center text-gray-400 text-sm bg-gray-50 rounded-lg">
            등록된 기사가 없습니다.
          </div>
        </Widget>
      );
    }

    const mainArticle = filtered[0];
    const subArticles = filtered.slice(1, 5);

    return (
      <Widget title={title}>
        <div className="flex flex-col h-full">

          {/* ✅ 메인 기사 클릭 시 이동 */}
          <div
            onClick={() => goDetail(mainArticle)}
            className="group cursor-pointer mb-5"
          >
            <div className="w-full h-48 overflow-hidden rounded-xl mb-3 relative">
              <img
                src={mainArticle.img}
                alt="main"
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
              <span className="absolute top-2 left-2 bg-blue-900 text-white text-[10px] px-2 py-1 rounded font-bold shadow-sm">
                {mainArticle.category}
              </span>
            </div>
            <h3 className="font-bold text-lg text-gray-900 leading-snug group-hover:text-blue-700 transition-colors mb-2">
              {mainArticle.title}
            </h3>
            <p className="text-sm text-gray-500 line-clamp-2">
              {mainArticle.desc}
            </p>
          </div>

          {/* ✅ 서브 기사 리스트 클릭 시 이동 */}
          {subArticles.length > 0 && (
            <ul className="space-y-3 border-t border-gray-100 pt-3 mt-auto">
              {subArticles.map((sub) => (
                <li
                  key={sub.id}
                  onClick={() => goDetail(sub)}
                  className="group flex items-start justify-between cursor-pointer"
                >
                  <span className="text-gray-700 text-sm group-hover:text-blue-600 group-hover:underline line-clamp-1 flex-1">
                    · {sub.title}
                  </span>
                </li>
              ))}
            </ul>
          )}

        </div>
      </Widget>
    );
  };


  // =================================================================
  // 카테고리별 전체 리스트 뷰
  // =================================================================
  const CategoryListView = () => {
    const filteredArticles = category === "전체" ? articles : articles.filter(a => a.category === category);
    const displayList = filteredArticles.length > 0 ? filteredArticles : articles;

    return (
      <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
        <div className="flex justify-between items-end border-b-2 border-gray-900 pb-3 mb-6">
          <h2 className="text-3xl font-black text-gray-900"><span className="text-blue-600">{category}</span> 뉴스</h2>
          {isAdmin && !isWriting && (
            <button onClick={() => setIsWriting(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 shadow-md flex items-center gap-2 transition-transform hover:scale-105">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg> 새 기사 작성
            </button>
          )}
        </div>
        {isWriting ? (
          <ArticleForm onSave={handleSaveArticle} onCancel={() => setIsWriting(false)} />
        ) : (
          <div className="space-y-6">
            {displayList.map((news) => (
              // ✅ 리스트 아이템 클릭 시 이동
              <div
                key={news.id}
                onClick={() => goDetail(news)}
                className="flex flex-col sm:flex-row gap-6 group cursor-pointer border-b border-gray-100 pb-6 last:border-0 hover:bg-gray-50/50 p-2 rounded-xl transition-colors"
              >
                <div className="w-full sm:w-48 h-32 bg-gray-200 rounded-lg overflow-hidden shrink-0 relative">
                  <img src={news.img} alt="news" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  <span className="absolute top-2 left-2 bg-blue-600/90 backdrop-blur-sm text-white text-[10px] px-2 py-1 rounded font-bold shadow-sm">{news.category}</span>
                </div>
                <div className="flex-1 flex flex-col justify-between py-1">
                  <div>
                    <h3 className="font-bold text-xl text-gray-900 leading-tight mb-2 group-hover:text-blue-600 transition-colors">{news.title}</h3>
                    <p className="text-sm text-gray-500 line-clamp-2">{news.desc}</p>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <div className="text-xs text-gray-400 font-medium"><span className="text-blue-500">{news.author}</span> • <span>{news.date}</span></div>
                    {isAdmin && (
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="text-xs border border-gray-200 bg-white px-2 py-1 rounded hover:bg-blue-50 text-blue-600">수정</button>
                        <button onClick={(e) => handleDeleteArticle(e, news.id)} className="text-xs border border-gray-200 bg-white px-2 py-1 rounded hover:bg-red-50 text-red-600">삭제</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {displayList.length === 0 && <div className="text-center py-20 text-gray-400">등록된 기사가 없습니다.</div>}
          </div>
        )}
      </div>
    );
  };

  const MainGridView = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 auto-rows-[minmax(180px,auto)] animate-[fadeIn_0.3s_ease-out]">

       {/* 상단 헤드라인 위젯 (임시로 첫 번째 기사로 연결) */}
       <Widget className="lg:col-span-2 min-h-[400px] flex flex-col justify-end relative overflow-hidden group cursor-pointer">
        <div
          onClick={() => goDetail(articles[0] || {})}
          className="absolute inset-0 w-full h-full"
        >
          <div className="absolute inset-0 bg-gray-300 group-hover:scale-105 transition-transform duration-500">
            <img src="https://picsum.photos/800/600" alt="headline" className="w-full h-full object-cover" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
          <div className="relative z-10 text-white p-6">
             <span className="bg-blue-600 text-xs font-bold px-2 py-1 rounded mb-3 inline-block">HEADLINE</span>
             <h2 className="text-3xl md:text-4xl font-bold leading-tight mb-3">NEWSPAPER 메인 레이아웃 개편</h2>
             <p className="text-gray-200 text-lg line-clamp-2">이제 각 섹션의 중요 기사는 크게, 나머지 기사는 리스트로 한눈에 볼 수 있습니다.</p>
          </div>
        </div>
      </Widget>

      <GroupWidget title="정치 / 경제" targetCategories={["정치", "경제"]} />
      <GroupWidget title="사회 / 문화" targetCategories={["사회", "문화"]} />
      <GroupWidget title="교육" targetCategories={["교육"]} />
      <GroupWidget title="인터뷰 / 경기도소식" targetCategories={["인터뷰칼럼", "경기도소식"]} />

      <div className="lg:col-span-2 h-24 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center text-blue-400 font-bold shadow-sm">
        하단 띠 배너 광고 영역
      </div>
    </div>
  );

  return <>{category === "전체" ? <MainGridView /> : <CategoryListView />}</>;
}