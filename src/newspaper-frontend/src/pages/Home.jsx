// 1. 우리가 만든 부품들을 가져옵니다 (Import)
import Header from "../components/Header";
import NewsSection from "../components/NewsSection"; // 👈 방금 만든 기사 영역
import Sidebar from "../components/Sidebar";         // 👈 방금 만든 사이드바

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      
      {/* 1. 헤더 조립 */}
      <Header />

      {/* 2. 메인 레이아웃 조립 (7:3 비율) */}
      <main className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-10 gap-8">
        
        {/* [왼쪽 70%] 기사 영역 부품 끼우기 */}
        <div className="lg:col-span-7">
          <NewsSection /> 
        </div>

        {/* [오른쪽 30%] 사이드바 부품 끼우기 */}
        <div className="lg:col-span-3">
          <Sidebar />
        </div>

      </main>
    </div>
  );
}