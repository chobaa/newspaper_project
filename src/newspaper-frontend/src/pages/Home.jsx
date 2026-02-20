import { useState } from "react";
import Header from "../components/Header";
import NewsSection from "../components/NewsSection";
import Sidebar from "../components/Sidebar";
import LoginModal from "../components/LoginModal";
import Footer from "../components/Footer";
import AdminPanel from "../components/AdminPanel";

export default function Home() {
  const [category, setCategory] = useState("전체");
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const handleLoginClick = () => {
    if (isAdmin) {
      if (window.confirm("로그아웃 하시겠습니까?")) setIsAdmin(false);
    } else {
      setIsLoginModalOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col relative">

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLogin={() => setIsAdmin(true)}
      />

      <Header
        onSelectCategory={setCategory}
        onLoginClick={handleLoginClick}
        isAdmin={isAdmin}
      />

      <main className="flex-grow max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-10 gap-8 w-full">
        <div className="lg:col-span-7">
          {category === "관리자" && isAdmin ? (
            <AdminPanel />
          ) : (
            <NewsSection category={category} isAdmin={isAdmin} />
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