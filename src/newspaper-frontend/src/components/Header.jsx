import { useState } from "react";

export default function Header({ onSelectCategory, onLoginClick, isAdmin }) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // ✅ 요청하신 8개 카테고리로 변경
  const menus = [
    "정치", "경제", "사회", "문화", "교육", "인터뷰칼럼", "경기도소식", "동영상"
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        
        {/* 왼쪽: 로고 영역 */}
        <div className="flex items-center gap-8">
          <div 
            onClick={() => onSelectCategory("전체")}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="h-10 w-10 bg-blue-900 rounded-lg flex items-center justify-center text-white shadow-sm overflow-hidden group-hover:shadow-md transition-all group-hover:rotate-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
            </div>
            <h1 className="text-2xl font-black text-blue-900 tracking-tighter leading-none group-hover:text-blue-700 transition-colors">
              NEWSPAPER
            </h1>
          </div>

          {/* 중앙: 네비게이션 메뉴 (8개) */}
          <nav className="hidden md:flex items-center space-x-1">
            {menus.map((menu) => (
              <button 
                key={menu} 
                onClick={() => onSelectCategory(menu)}
                className="px-3 py-2 rounded-full text-gray-600 font-medium transition-all hover:bg-gray-100 hover:text-blue-700 text-sm lg:text-base whitespace-nowrap"
              >
                {menu}
              </button>
            ))}
          </nav>
        </div>

        {/* 오른쪽: 아이콘 & 로그인 버튼 */}
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className={`p-2 rounded-full transition-colors ${isSearchOpen ? 'bg-gray-100 text-blue-600' : 'hover:bg-gray-100'}`}
          >
            {isSearchOpen ? (
               <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            ) : (
               <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            )}
          </button>

          <button 
            onClick={onLoginClick}
            className={`hidden sm:block px-4 py-2 rounded-full text-sm font-bold transition ml-2 whitespace-nowrap ${
              isAdmin 
                ? "bg-gray-200 text-gray-700 hover:bg-gray-300"
                : "bg-black text-white hover:bg-gray-800"
            }`}
          >
            {isAdmin ? "로그아웃" : "관리자 로그인"}
          </button>
        </div>
      </div>

      {/* 검색창 */}
      <div className={`bg-gray-50 border-b border-gray-200 overflow-hidden transition-all duration-300 ease-in-out ${isSearchOpen ? "max-h-24 opacity-100" : "max-h-0 opacity-0"}`}>
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="relative">
            <input type="text" placeholder="관심있는 뉴스를 검색해보세요..." className="w-full pl-12 pr-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"/>
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}