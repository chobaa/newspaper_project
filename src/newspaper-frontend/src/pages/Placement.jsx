import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import Footer from "../components/Footer";

export default function Placement() {
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
              기사배열 기본방침
            </h1>
            <p className="text-sm text-gray-500 italic">
              뉴스앤피플은 신문의 진흥에 관한 법률 제10조에 의거하여 기사배열의 공정성을 준수합니다.
            </p>
          </header>

          <section className="text-sm text-gray-700 leading-relaxed space-y-8">
            <p>
              <strong>뉴스앤피플</strong>은 독자들에게 신속하고 정확한 정보를 전달하며, 편집의 독립성을 지키기 위해 다음과 같은 기사배열 기본방침을 수립하여 시행하고 있습니다.
            </p>

            {/* 제1조 5대 원칙 - 그리드 레이아웃으로 시각화 */}
            <div>
              <h2 className="font-bold text-gray-900 text-base mb-4 flex items-center">
                <span className="w-1 h-5 bg-blue-600 mr-2 rounded-full"></span>
                기사배열 5대 원칙
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { title: "정확성과 신속성", desc: "정치, 행정, 사회 각 분야의 뉴스를 왜곡 없이 사실에 기반하여 빠르게 보도합니다." },
                  { title: "상업성 배제", desc: "단순 홍보성 기사, 선정적인 내용, 사행심을 조장하는 기사는 엄격히 배제합니다." },
                  { title: "정치적 중립성", desc: "어떠한 외부 압력에도 흔들리지 않으며, 특정 이해관계에 편향되지 않은 독립적 편집권을 유지합니다." },
                  { title: "인권 및 권익 보호", desc: "객관적 근거 없는 비방을 금하며, 개인의 인격과 명예, 초상권을 철저히 보호합니다." },
                  { title: "건전한 토론 문화", desc: "열린 공론의 장을 마련하여 독자들의 건강한 비판과 토론이 이루어지는 커뮤니티를 육성합니다." }
                ].map((item, idx) => (
                  <div key={idx} className="p-4 border border-gray-50 bg-gray-50/50 rounded-lg">
                    <h3 className="font-bold text-gray-900 mb-1">0{idx + 1}. {item.title}</h3>
                    <p className="text-xs text-gray-600">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* 제2조 기사 수정 및 정정 */}
            <div>
              <h2 className="font-bold text-gray-900 text-base mb-2">기사 수정 및 의견 수렴</h2>
              <p>
                보도된 내용 중 명백한 오류가 발견되거나 타인의 권리를 침해하는 경우, 뉴스앤피플은 즉시 정정 보도문을 게재하거나 내용을 수정하여 독자의 알 권리와 피해자의 권익을 보호합니다.
              </p>
            </div>

            {/* 기사배열 책임자 정보 - 앞선 페이지와 통일된 카드 스타일 */}
            <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 shadow-sm">
              <h2 className="font-bold text-blue-900 text-lg mb-4 flex items-center">
                <span className="mr-2">📝</span> 기사배열 책임자 정보
              </h2>
              <p className="text-xs text-blue-700 mb-4 leading-normal">
                뉴스앤피플은 기사배열에 대한 의견 수렴 및 불편 사항 처리를 위해 책임자를 선임하고 있습니다. 
                전화, 전자메일 등을 통해 소중한 의견을 접수해 주시면 신속히 답변드리겠습니다.
              </p>
              <div className="space-y-3">
                <div className="flex border-b border-blue-200/50 pb-2">
                  <span className="w-24 font-bold text-blue-800 text-xs uppercase tracking-wider">성명(직위)</span>
                  <span className="text-gray-900 font-medium">송종명</span>
                </div>
                <div className="flex border-b border-blue-200/50 pb-2">
                  <span className="w-24 font-bold text-blue-800 text-xs uppercase tracking-wider">전화번호</span>
                  <a href="tel:010-9124-2848" className="text-gray-900 hover:text-blue-700 transition-colors">010-9124-2848</a>
                </div>
                <div className="flex">
                  <span className="w-24 font-bold text-blue-800 text-xs uppercase tracking-wider">E-mail</span>
                  <a href="mailto:fishwoww@naver.com" className="text-gray-900 hover:text-blue-700 underline decoration-blue-200">fishwoww@naver.com</a>
                </div>
              </div>
            </div>
          </section>

          <footer className="pt-8 border-t border-gray-100 text-[11px] text-gray-400">
            [부칙] 본 방침은 2026년 3월 5일부터 시행됩니다. 뉴스앤피플은 독자와 함께 성장하는 미디어가 되겠습니다.
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