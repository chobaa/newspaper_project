import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import Footer from "../components/Footer";

export default function Company() {
  const navigate = useNavigate();

  const handleSelectCategory = (nextCategory) => {
    navigate("/", { state: { category: nextCategory } });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header onSelectCategory={handleSelectCategory} showLogin={false} />
      <main className="flex-grow max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-10 gap-8 w-full">
        <div className="lg:col-span-7 bg-white p-6 md:p-10 rounded-xl shadow-sm border border-gray-100 space-y-12">
          
          {/* 헤더 섹션 */}
          <header className="text-center space-y-4">
            <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">
              사람과 세상을 잇는 공감 미디어 <br/>
              <span className="text-blue-600">뉴스앤피플</span>
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
              뉴스앤피플은 지역 사회의 생생한 목소리를 담아내고, <br className="hidden md:block"/>
              시민들의 알 권리를 충족시키기 위해 정진하는 지역 전문 언론사입니다.
            </p>
          </header>

          {/* 핵심 가치 섹션 (3가지 기둥) */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { title: "현장 중심", desc: "가장 가까운 곳에서 생생한 소식을 전달합니다.", icon: "📍" },
              { title: "공정 보도", desc: "치우침 없는 객관적 시각으로 진실을 말합니다.", icon: "⚖️" },
              { title: "시민 참여", desc: "독자와 함께 소통하며 건강한 담론을 만듭니다.", icon: "🤝" }
            ].map((value, idx) => (
              <div key={idx} className="p-6 bg-gray-50 rounded-2xl text-center hover:bg-white hover:shadow-md transition-all border border-transparent hover:border-gray-100">
                <div className="text-3xl mb-3">{value.icon}</div>
                <h3 className="font-bold text-gray-900 mb-2">{value.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{value.desc}</p>
              </div>
            ))}
          </section>

          {/* 주요 사업 및 원칙 */}
          <section className="space-y-6 bg-white">
            <div className="border-l-4 border-blue-600 pl-4">
              <h2 className="text-xl font-bold text-gray-900">우리의 사명과 역할</h2>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              <div className="flex items-start gap-4 p-4 rounded-lg border border-gray-50">
                <span className="bg-blue-100 text-blue-600 font-bold px-3 py-1 rounded-full text-xs mt-1">Mission</span>
                <div>
                  <h4 className="font-bold text-gray-800 text-sm">지역 자치 실현 및 공동체 활성화</h4>
                  <p className="text-sm text-gray-600 mt-1">단순한 정보 전달을 넘어 지자체 정책 감시와 시민 사회의 건강한 비판을 통해 지역 사회의 발전을 이끕니다.</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-lg border border-gray-50">
                <span className="bg-green-100 text-green-600 font-bold px-3 py-1 rounded-full text-xs mt-1">Value</span>
                <div>
                  <h4 className="font-bold text-gray-800 text-sm">사회적 약자의 목소리 대변</h4>
                  <p className="text-sm text-gray-600 mt-1">소외된 이웃의 고충에 귀 기울이며, 차별 없는 정보 공유를 통해 공익적 가치를 실현합니다.</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-lg border border-gray-50">
                <span className="bg-purple-100 text-purple-600 font-bold px-3 py-1 rounded-full text-xs mt-1">Ethics</span>
                <div>
                  <h4 className="font-bold text-gray-800 text-sm">철저한 기자 윤리 준수</h4>
                  <p className="text-sm text-gray-600 mt-1">금품 수수 금지, 취재원 보호 등 임직원 윤리강령을 철저히 준수하여 독자가 신뢰할 수 있는 매체를 만듭니다.</p>
                </div>
              </div>
            </div>
          </section>

          {/* 마무리 멘트 */}
          <footer className="text-center pt-4">
            <p className="text-sm text-gray-400 italic">
              "뉴스앤피플은 언제나 시민 여러분 곁에서, <br className="md:hidden"/> 함께 호흡하고 고민하겠습니다."
            </p>
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