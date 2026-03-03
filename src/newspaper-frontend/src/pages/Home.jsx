import { useState, useEffect } from "react";
import Header from "../components/Header";
import NewsSection from "../components/NewsSection";
import Sidebar from "../components/Sidebar";
import LoginModal from "../components/LoginModal";
import Footer from "../components/Footer";
import AdminPanel from "../components/AdminPanel";

export default function Home() {
  const [category, setCategory] = useState("전체");
  const [isAdmin, setIsAdmin] = useState(() => {
    return localStorage.getItem("isAdmin") === "true";
  });
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [search, setSearch] = useState("");

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
        onLoginClick={handleLoginClick}
        isAdmin={isAdmin}
        onSearchChange={setSearch}
      />

      <main className="flex-grow max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-10 gap-8 w-full">
        <div className="lg:col-span-7">
          {category === "관리자" && isAdmin ? (
            <AdminPanel />
          ) : (
            <NewsSection category={category} isAdmin={isAdmin} search={search} />
          )}
        </div>
        <div className="lg:col-span-3">
          <Sidebar />
        </div>
      </main>

      <Footer />

    </div>
  );
}