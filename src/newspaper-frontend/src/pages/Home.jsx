import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import Header from "../components/Header";
import NewsSection from "../components/NewsSection";
import Sidebar from "../components/Sidebar";
import LoginModal from "../components/LoginModal";
import Footer from "../components/Footer";
import AdminPanel from "../components/AdminPanel";

export const SEARCH_TYPES = { TITLE: "title", CONTENT: "content", TITLE_AND_CONTENT: "titleAndContent" };

export default function Home() {
  const location = useLocation();
  const [category, setCategory] = useState("전체");
  const [categoryVersion, setCategoryVersion] = useState(0);
  const [isAdmin, setIsAdmin] = useState(() => {
    return localStorage.getItem("isAdmin") === "true";
  });
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchType, setSearchType] = useState(SEARCH_TYPES.TITLE_AND_CONTENT);

  useEffect(() => {
    localStorage.setItem("isAdmin", isAdmin ? "true" : "false");
  }, [isAdmin]);

  const handleLoginClick = () => {
    if (isAdmin) {
      if (window.confirm("로그아웃 하시겠습니까?")) setIsAdmin(false);
    } else {
      setIsLoginModalOpen(true);
    }
  };

  const handleSelectCategory = (nextCategory) => {
    // 기사 작성 중(임시 전역 플래그)이라면 경고 후 이동 여부 결정
    if (window.__articleDirty) {
      const ok = window.confirm("작성 중인 기사가 저장되지 않습니다. 이동하시겠습니까?");
      if (!ok) {
        return;
      }
      window.__articleDirty = false;
    }
    // 카테고리를 바꾸면 검색어는 초기화
    setSearch("");
    setCategory(nextCategory);
    // 동일 카테고리를 다시 눌러도 리스트 뷰로 돌아가도록 버전 증가
    setCategoryVersion((v) => v + 1);
  };

  // 약관/정책 페이지 등에서 카테고리 선택 후 돌아올 때 처리
  useEffect(() => {
    const stateCategory = location.state && location.state.category;
    if (!stateCategory) return;
    handleSelectCategory(stateCategory);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state && location.state.category]);

  // 검색창에서 엔터 시 검색 결과 화면으로 이동
  const handleSearchSubmit = () => {
    setCategory("검색결과");
    setCategoryVersion((v) => v + 1);
    setIsSearchOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col relative">

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLogin={() => setIsAdmin(true)}
      />

      <Header
        onSelectCategory={handleSelectCategory}
        isAdmin={isAdmin}
        onSearchChange={setSearch}
        isSearchOpen={isSearchOpen}
        onSearchOpenChange={setIsSearchOpen}
        searchType={searchType}
        onSearchTypeChange={setSearchType}
        onSearchSubmit={handleSearchSubmit}
      />

      <main className="flex-grow max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-10 gap-8 w-full">
        <div className="lg:col-span-7">
          {category === "관리자" && isAdmin ? (
            <AdminPanel />
          ) : (
            <NewsSection
              category={category}
              categoryVersion={categoryVersion}
              isAdmin={isAdmin}
              search={search}
              searchType={searchType}
            />
          )}
        </div>
        <div className="lg:col-span-3">
          <Sidebar />
        </div>
      </main>

      <Footer onLoginClick={handleLoginClick} isAdmin={isAdmin} />

    </div>
  );
}