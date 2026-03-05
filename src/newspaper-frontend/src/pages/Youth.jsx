import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import Footer from "../components/Footer";

export default function Youth() {
  const navigate = useNavigate();

  const handleSelectCategory = (nextCategory) => {
    navigate("/", { state: { category: nextCategory } });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header onSelectCategory={handleSelectCategory} showLogin={false} />
      <main className="flex-grow max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-10 gap-8 w-full">
        <div className="lg:col-span-7 bg-white p-6 md:p-10 rounded-xl shadow-sm border border-gray-100 space-y-8">
          
          <header className="border-b border-gray-100 pb-6">
            <h1 className="text-2xl md:text-3xl font-black text-gray-900 mb-2">
              청소년 보호 정책
            </h1>
            <p className="text-sm text-gray-500">
              뉴스앤피플은 청소년이 건전한 인격체로 성장할 수 있도록 안전한 온라인 환경을 조성합니다.
            </p>
          </header>

          <section className="text-sm text-gray-700 leading-relaxed space-y-8">
            <p>
              <strong>뉴스앤피플</strong>(이하 ‘회사’라 함)은 각종 청소년 유해 정보로부터 청소년을 보호하고자 관련 법률에 따라 19세 미만의 청소년들이 유해 정보에 접근할 수 없도록 청소년 보호 정책을 마련하여 시행하고 있습니다.
            </p>

            {/* 제1장 */}
            <div>
              <h2 className="font-bold text-gray-900 text-base mb-2">제1조 (유해 정보로부터의 보호 계획)</h2>
              <p className="mb-2">회사는 청소년이 제한 없이 유해 정보에 노출되지 않도록 다음과 같은 예방 차원의 조치를 강구합니다.</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>청소년 유해 매체물에 대한 별도의 인증 장치 마련 및 적용</li>
                <li>청소년 유해 정보 노출 방지를 위한 실시간 모니터링 강화</li>
                <li>정보통신 업무 담당자에 대한 청소년 보호 관련 법령 및 매뉴얼 교육 실시</li>
              </ul>
            </div>

            {/* 제2장 */}
            <div>
              <h2 className="font-bold text-gray-900 text-base mb-2">제2조 (유해 정보 접근 제한 및 관리)</h2>
              <p>회사는 청소년 유해 매체물에 대해 별도의 성인 인증 장치를 적용하며, 청소년이 유해한 환경에 노출되지 않도록 기술적·관리적 보호 조치를 지속적으로 업데이트합니다.</p>
            </div>

            {/* 제3장 */}
            <div>
              <h2 className="font-bold text-gray-900 text-base mb-2">제3조 (피해 상담 및 고충 처리)</h2>
              <p>회사는 청소년 유해 정보로 인한 피해 상담 및 고충 처리를 위한 전문 인력을 배치하여 피해가 확산되지 않도록 노력하고 있습니다. 하단에 명시된 책임자에게 전화나 이메일을 통해 상담을 요청하실 수 있습니다.</p>
            </div>

            {/* 제4장 책임자 정보 - 카드 스타일 */}
            <div className="bg-green-50 p-6 rounded-xl border border-green-100 shadow-sm">
              <h2 className="font-bold text-green-900 text-lg mb-4 flex items-center">
                <span className="mr-2">🛡️</span> 청소년 보호 책임자 및 담당자
              </h2>
              <div className="space-y-3">
                <div className="flex border-b border-green-200/50 pb-2">
                  <span className="w-24 font-bold text-green-800 text-xs uppercase tracking-wider">성명(직위)</span>
                  <span className="text-gray-900 font-medium">송종명</span>
                </div>
                <div className="flex border-b border-green-200/50 pb-2">
                  <span className="w-24 font-bold text-green-800 text-xs uppercase tracking-wider">전화번호</span>
                  <a href="tel:010-9124-2848" className="text-gray-900 hover:text-green-700 transition-colors">010-9124-2848</a>
                </div>
                <div className="flex">
                  <span className="w-24 font-bold text-green-800 text-xs uppercase tracking-wider">E-mail</span>
                  <a href="mailto:fishwoww@naver.com" className="text-gray-900 hover:text-green-700 underline decoration-green-200">fishwoww@naver.com</a>
                </div>
              </div>
            </div>
          </section>

          <footer className="pt-8 border-t border-gray-100 text-[11px] text-gray-400">
            [부칙] 본 청소년 보호 정책은 2026년 3월 5일부터 적용됩니다.
          </footer>
        </div>

        <aside className="lg:col-span-3">
          <Sidebar />
        </aside>
      </main>
      <Footer />
    </div>
  );
}