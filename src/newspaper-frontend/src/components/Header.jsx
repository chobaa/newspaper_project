import { useState, useRef, useEffect } from "react";
import { useBrandSettings } from "../context/BrandSettingsContext";

const SEARCH_TYPES = { TITLE: "title", CONTENT: "content", TITLE_AND_CONTENT: "titleAndContent" };
const SEARCH_TYPE_LABELS = {
  [SEARCH_TYPES.TITLE]: "제목",
  [SEARCH_TYPES.CONTENT]: "내용",
  [SEARCH_TYPES.TITLE_AND_CONTENT]: "제목 + 내용",
};

export default function Header({
  onSelectCategory,
  onLoginClick,
  isAdmin,
  onSearchChange,
  showLogin = true,
  isSearchOpen = false,
  onSearchOpenChange,
  searchType = SEARCH_TYPES.TITLE_AND_CONTENT,
  onSearchTypeChange,
  onSearchSubmit,
}) {
  const [internalSearchOpen, setInternalSearchOpen] = useState(false);
  const isSearchControlled = typeof isSearchOpen === "boolean" && typeof onSearchOpenChange === "function";
  const isOpen = isSearchControlled ? isSearchOpen : internalSearchOpen;
  const setIsOpen = isSearchControlled ? (onSearchOpenChange || (() => {})) : setInternalSearchOpen;
  const [keyword, setKeyword] = useState("");
  const searchInputRef = useRef(null);
  const { settings: brand } = useBrandSettings();

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // ✅ 요청하신 8개 카테고리로 변경
  const menus = [
    "정치", "경제", "사회", "문화", "교육", "인터뷰칼럼", "경기도소식", "동영상"
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200">
      <div className="relative max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">

        {/* 왼쪽: 로고 영역 */}
        <div className="flex-shrink-0 z-10">
          <div
            onClick={() => onSelectCategory("전체")}
            className="flex items-center gap-3 cursor-pointer group"
          >
            {brand.logoImageUrl ? (
              <div className="h-16 max-w-[400px] flex-shrink-0 transition-all group-hover:scale-[1.02]">
                <img src={brand.logoImageUrl} alt={brand.siteName} className="h-full w-auto max-w-full object-contain object-left" />
              </div>
            ) : (
              <>
                <div className="h-10 w-10 rounded-lg flex items-center justify-center text-white overflow-hidden transition-all group-hover:rotate-3 bg-[var(--brand-900)]">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                  </svg>
                </div>
                <h1 className="text-2xl font-black tracking-tighter leading-none transition-colors text-[var(--brand-900)] group-hover:text-[var(--brand-700)]">
                  {brand.siteName}
                </h1>
              </>
            )}
          </div>
        </div>

        {/* 중앙: 네비게이션 (화면 정중앙) */}
        <nav className="absolute left-1/2 -translate-x-1/2 flex items-center h-16 space-x-1 overflow-x-auto scrollbar-none">
          {menus.map((menu) => (
            <button
              key={menu}
              onClick={() => onSelectCategory(menu)}
              className="px-3 py-2 rounded-full text-black font-bold transition-all hover:bg-gray-100 text-sm lg:text-base whitespace-nowrap hover:text-[var(--brand-700)]"
            >
              {menu}
            </button>
          ))}
          {isAdmin && (
            <button
              onClick={() => onSelectCategory("관리자")}
              className="px-3 py-2 rounded-full text-black font-bold transition-all hover:bg-gray-100 text-sm lg:text-base whitespace-nowrap border bg-[var(--brand-50)]/50 border-[var(--brand-200)] hover:text-[var(--brand-700)]"
            >
              관리자
            </button>
          )}
        </nav>

        {/* 오른쪽: 검색 아이콘 */}
        <div className="flex-shrink-0 z-10 flex items-center gap-2">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`p-2 rounded-full transition-colors ${isOpen ? 'bg-gray-100 text-[var(--brand-600)]' : 'hover:bg-gray-100'}`}
          >
            {isOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            )}
          </button>
        </div>
      </div>

      {/* 검색창 */}
      <div className={`bg-gray-50 border-b border-gray-200 overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? "max-h-32 opacity-100" : "max-h-0 opacity-0"}`}>
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            {/* 왼쪽: 검색 유형 선택 */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-sm font-medium text-gray-600 whitespace-nowrap">검색 범위:</span>
              <div className="flex rounded-lg border border-gray-200 bg-white p-0.5">
                {Object.entries(SEARCH_TYPE_LABELS).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => onSearchTypeChange && onSearchTypeChange(value)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                      searchType === value
                        ? "bg-[var(--brand-600)] text-white"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {/* 오른쪽: 검색 입력 */}
            <div className="relative flex-1 min-w-0">
              <input
                ref={searchInputRef}
                type="text"
                value={keyword}
                onChange={(e) => {
                  const v = e.target.value;
                  setKeyword(v);
                  onSearchChange && onSearchChange(v);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    onSearchSubmit?.();
                  }
                }}
                placeholder="관심있는 뉴스를 검색해보세요..."
                className="w-full pl-11 pr-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--brand-500)] shadow-sm"
              />
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}