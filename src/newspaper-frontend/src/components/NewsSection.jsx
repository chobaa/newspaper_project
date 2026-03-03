import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; // ✅ 페이지 이동 훅 추가
import Widget from "./Widget";
import ArticleForm from "./ArticleForm";
import AdBanner from "./AdBanner";
import { getBrandSettings } from "../utils/brandSettings";

const PAGE_SIZE = 10;

export default function NewsSection({ category, categoryVersion, isAdmin, search }) {
  const [articles, setArticles] = useState([]);
  const [isWriting, setIsWriting] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
  const [page, setPage] = useState(1);
  const [pageInput, setPageInput] = useState("");
  const navigate = useNavigate(); // ✅ 이동 함수 생성
  const brand = getBrandSettings();

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
          // 헤드라인/리스트 모두에서 좀 더 긴 요약을 보여주기 위해 길이를 늘림
          const desc =
            plainText.length > 0
              ? plainText.slice(0, 300) + (plainText.length > 300 ? "..." : "")
              : "";
          // 본문 HTML에서 첫 번째 <img src="...">를 그대로 썸네일로 사용
          const imgMatch = a.content
            ? a.content.match(/<img[^>]+src="([^">]+)"/)
            : null;
          const firstImage = imgMatch && imgMatch[1] ? imgMatch[1] : null;
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
      const src = match[1];
      // data: 로 시작하는 인라인(base64) 이미지는 DB에 저장하지 않는다
      if (src && !src.startsWith("data:")) {
        urls.push(src);
      }
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
    try {
      const imageUrls = extractImageUrlsFromContent(updatedArticle.content);

      const res = await fetch(`/api/articles/${updatedArticle.id}`, {
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

    if (filtered.length === 0) {
      return (
        <Widget title={title}>
          <div className="h-32 flex items-center justify-center text-gray-400 text-sm bg-gray-50 rounded-lg">
            등록된 기사가 없습니다.
          </div>
        </Widget>
      );
    }

    const items = filtered.slice(0, 3);

    return (
      <Widget title={title}>
        <div className="space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              onClick={() => goDetail(item)}
              className="group flex gap-4 cursor-pointer rounded-xl border border-gray-100 bg-white hover:bg-gray-50 transition-colors p-3"
            >
              {item.img && (
                <div className="w-32 h-24 md:w-40 md:h-28 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                  <img
                    src={item.img}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
              )}
              <div className="flex-1 min-w-0 flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-sm md:text-base text-gray-900 mb-1 group-hover:text-blue-700 line-clamp-2 break-all">
                    {item.title}
                  </h4>
                  <p className="text-xs md:text-sm text-gray-500 line-clamp-2 break-all">
                    {item.desc}
                  </p>
                </div>
                <div className="mt-2 text-[11px] text-gray-400 flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold">
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
  // 카테고리별 전체 리스트 뷰
  // =================================================================
  const CategoryListView = () => {
    const keyword = (search || "").trim().toLowerCase();
    let filteredArticles = articles.filter(a => a.category === category);
    if (keyword) {
      filteredArticles = filteredArticles.filter((a) => {
        const title = a.title?.toLowerCase() || "";
        const desc = a.desc?.toLowerCase() || "";
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
            <span className="text-blue-600">{category}</span> 뉴스
          </h2>
          {isAdmin && !isWriting && (
            <button
              onClick={() => {
                setIsWriting(true);
                setEditingArticle(null);
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 shadow-md flex items-center gap-2 transition-transform hover:scale-105"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg> 새 기사 작성
            </button>
          )}
        </div>
        {isWriting ? (
          <ArticleForm
            initialArticle={editingArticle}
            onSave={editingArticle ? handleUpdateArticle : handleSaveArticle}
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
                    <img src={news.img} alt="news" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    <span className="absolute top-2 left-2 bg-blue-600/90 backdrop-blur-sm text-white text-[10px] px-2 py-1 rounded font-bold shadow-sm">{news.category}</span>
                  </div>
                )}
                <div className="flex-1 flex flex-col justify-between py-1">
                  <div>
                  <h3 className="font-bold text-xl text-gray-900 leading-tight mb-2 group-hover:text-blue-600 transition-colors break-all">
                    {news.title}
                  </h3>
                  <p className="text-sm text-gray-500 line-clamp-2 break-all">
                    {news.desc}
                  </p>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <div className="text-xs text-gray-400 font-medium"><span className="text-blue-500">{news.author}</span> • <span>{news.date}</span></div>
                    {isAdmin && (
                      <div className="flex gap-2">
                        <button
                          className="text-xs border border-gray-200 bg-white px-2 py-1 rounded hover:bg-blue-50 text-blue-600"
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
                          ? "bg-blue-600 text-white border-blue-600"
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
    const headline = articles[0];

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 auto-rows-[minmax(180px,auto)] animate-[fadeIn_0.3s_ease-out]">

        {/* 상단 헤드라인 위젯: 최신 기사 1건 (좌썸네일/우텍스트 레이아웃) */}
        <Widget className="lg:col-span-2 min-h-[260px] group cursor-pointer">
          {headline ? (
            <div
              onClick={() => goDetail(headline)}
              className="flex flex-col md:flex-row gap-6"
            >
              {headline.img && (
                <div className="w-full md:w-1/2 h-52 md:h-64 rounded-xl overflow-hidden bg-gray-200 flex-shrink-0">
                  <img
                    src={headline.img}
                    alt={headline.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
              )}
              <div className="flex-1 flex flex-col justify-between min-w-0">
                <div>
                  <span className="inline-block px-3 py-1 mb-3 text-xs font-bold text-white bg-blue-600 rounded-full">
                    HEADLINE · {headline.category}
                  </span>
                  <h2 className="text-2xl md:text-3xl font-black text-gray-900 mb-3 leading-tight line-clamp-2">
                    {headline.title}
                  </h2>
                  {/* 본문 요약은 여러 줄까지 아래로 자연스럽게 내려가도록. 긴 단어도 줄바꿈되게 처리 */}
                  <p className="text-sm md:text-base text-gray-600 break-all">
                    {headline.desc || "최신 헤드라인 기사를 확인해 보세요."}
                  </p>
                </div>
                <div className="mt-4 text-xs text-gray-400 flex items-center gap-3">
                  <span>{headline.author}</span>
                  <span className="w-px h-3 bg-gray-300" />
                  <span>{headline.date}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
              아직 등록된 기사가 없습니다.
            </div>
          )}
        </Widget>

        <GroupWidget title="정치 / 경제" targetCategories={["정치", "경제"]} />
        <GroupWidget title="사회 / 문화" targetCategories={["사회", "문화"]} />
        <GroupWidget title="교육" targetCategories={["교육"]} />
        <GroupWidget title="인터뷰 / 경기도소식" targetCategories={["인터뷰칼럼", "경기도소식"]} />

        {brand.showBottomBanner !== false && (
          <div className="lg:col-span-2">
            <AdBanner
              height="h-24"
              text={brand.bottomBannerText}
              imageUrl={brand.bottomBannerImageUrl}
            />
          </div>
        )}
      </div>
    );
  };

  return <>{category === "전체" ? <MainGridView /> : <CategoryListView />}</>;
}