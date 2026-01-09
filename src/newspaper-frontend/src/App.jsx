import { useState } from "react";
import Header from "./components/Header";
import NewsSection from "./components/NewsSection";
import Sidebar from "./components/Sidebar";
import LoginModal from "./components/LoginModal";
import Footer from "./components/Footer"; // [추가] 👈 푸터 불러오기

export default function App() {
  const [category, setCategory] = useState("전체");
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const handleLoginClick = () => {
    if (isAdmin) {
      if(window.confirm("로그아웃 하시겠습니까?")) setIsAdmin(false);
    } else {
      setIsLoginModalOpen(true);
    }
  };

  return (
    // flex-col과 min-h-screen을 줘서 내용이 적어도 푸터가 바닥에 붙게 함
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

      {/* flex-grow: 남은 공간을 다 차지하게 해서 푸터를 아래로 밀어냄 */}
      <main className="flex-grow max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-10 gap-8 w-full">
        <div className="lg:col-span-7">
          <NewsSection category={category} isAdmin={isAdmin} /> 
        </div>
        <div className="lg:col-span-3">
          <Sidebar />
        </div>
      </main>

      {/* [추가] 👈 여기에 푸터 추가 */}
      <Footer />
      
    </div>
  );
}