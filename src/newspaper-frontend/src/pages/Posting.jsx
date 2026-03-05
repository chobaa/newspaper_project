import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import Footer from "../components/Footer";

export default function Posting() {
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
              게시물 게재 원칙
            </h1>
            <p className="text-sm text-gray-500">
              뉴스앤피플은 자유와 참여, 공유의 정신을 바탕으로 건강한 정보 공유의 장을 지향합니다.
            </p>
          </header>

          <section className="text-sm text-gray-700 leading-relaxed space-y-8">
            
            {/* 제1조 목적 */}
            <div>
              <h2 className="font-bold text-gray-900 text-base mb-2">제1조 (목적)</h2>
              <p>
                본 원칙은 <strong>뉴스앤피플</strong>이 제공하는 웹사이트 서비스를 통해 게시물을 등록하거나 이용함에 있어, 사용자에게 무해하고 건전한 정보 환경을 제공하는 것을 목적으로 합니다.
              </p>
            </div>

            {/* 제2조 게시물 관리 */}
            <div>
              <h2 className="font-bold text-gray-900 text-base mb-2">제2조 (게시물의 관리 및 책임)</h2>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>뉴스앤피플 회원은 누구나 자유롭게 게시물을 작성할 수 있습니다.</li>
                <li>게시물로 인해 발생하는 모든 책임은 작성자 본인에게 있으며, 관련 법령에 따른 민·형사상 책임을 집니다.</li>
                <li>회사는 약관 및 본 원칙에 위배되는 게시물을 사전 통지 없이 삭제하거나 서비스 이용을 제한할 수 있습니다.</li>
              </ul>
            </div>

            {/* 제3조 저작권 (CCL 강조) */}
            <div className="bg-blue-50 p-5 rounded-lg border border-blue-100">
              <h2 className="font-bold text-blue-900 text-base mb-3">제3조 (게시물의 저작권 및 라이선스)</h2>
              <p className="mb-3 text-blue-800 font-medium">뉴스앤피플의 게시물은 CCL(Creative Commons License)을 적용받습니다.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-3 rounded border border-blue-200">
                  <p className="font-bold text-gray-900 text-xs mb-1">BY (저작자표시)</p>
                  <p className="text-xs text-gray-600">저작물 이용 시 원저작자를 반드시 표시해야 합니다.</p>
                </div>
                <div className="bg-white p-3 rounded border border-blue-200">
                  <p className="font-bold text-gray-900 text-xs mb-1">SA (동일조건변경허락)</p>
                  <p className="text-xs text-gray-600">2차 저작물 작성 시 원저작물과 동일한 라이선스를 적용해야 합니다.</p>
                </div>
              </div>
            </div>

            {/* 제4조 불량 게시물 규제 기준 */}
            <div>
              <h2 className="font-bold text-gray-900 text-base mb-4">제4조 (금지 게시물 규제 기준)</h2>
              <div className="grid grid-cols-1 gap-3">
                {[
                  { title: "도배 및 장난성", desc: "동일 내용 반복 게시, 무의미한 내용, 타 사이트 강제 이동 태그 포함 등" },
                  { title: "명예훼손 및 비방", desc: "개인의 사생활 침해, 특정인/단체 비방, 욕설 및 저속한 표현을 통한 인격 모독" },
                  { title: "미풍양속 저해", desc: "범죄 유발/조장, 사회적 약자 비하, 공포심이나 혐오감을 주는 내용" },
                  { title: "상업적 홍보", desc: "사전 협의 없는 영리 목적의 광고, 불법 피라미드 영업, 사행심 조장 등" },
                  { title: "지식재산권 침해", desc: "저작권자의 동의 없는 무단 게재, 시리얼 번호 공유, 와레즈 사이트 안내 등" },
                  { title: "음란 및 폭력성", desc: "노골적인 성적 표현, 폭력 미화, 청소년 유해 정보 및 성매매 유도" }
                ].map((item, index) => (
                  <div key={index} className="flex gap-4 p-3 border-b border-gray-50 last:border-0">
                    <span className="font-bold text-gray-900 min-w-[100px] text-xs">· {item.title}</span>
                    <span className="text-xs text-gray-600">{item.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 제5조 시스템 보호 */}
            <div>
              <h2 className="font-bold text-gray-900 text-base mb-2">제5조 (시스템 장애 유도 금지)</h2>
              <p>악성코드 유포, 자동 팝업 생성, 페이지 디자인 변형 등 정상적인 서비스 이용을 방해하는 행위는 엄격히 금지되며 법적 조치를 받을 수 있습니다.</p>
            </div>
          </section>

          <footer className="pt-8 border-t border-gray-100 text-[11px] text-gray-400">
            본 원칙은 2026년 3월 5일부터 적용됩니다. 관련 문의는 뉴스앤피플 인터넷팀으로 연락 주시기 바랍니다.
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