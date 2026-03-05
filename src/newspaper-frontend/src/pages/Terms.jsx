import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import Footer from "../components/Footer";

export default function Terms() {
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
              서비스이용약관
            </h1>
            <p className="text-sm text-gray-500">시행일자: 2026년 3월 5일</p>
          </header>

          <section className="space-y-4 text-sm text-gray-700 leading-relaxed">
            {/* 제1조 */}
            <div>
              <h2 className="font-bold text-base text-gray-900 mb-2">제1조 (목적)</h2>
              <p>1. 본 이용약관은 이용자가 <strong>뉴스앤피플</strong>에서 제공하는 인터넷 관련 서비스를 이용함에 있어, 이용자와 뉴스앤피플의 권리, 의무 및 책임 사항을 규정함을 목적으로 합니다.</p>
              <p>2. 이용자가 되고자 하는 자가 뉴스앤피플이 정한 소정의 절차를 거쳐 "등록하기" 또는 "동의" 버튼을 누르면 본 약관에 동의하는 것으로 간주합니다.</p>
            </div>

            {/* 제2조 */}
            <div>
              <h2 className="font-bold text-base text-gray-900 mb-2">제2조 (이용자의 정의)</h2>
              <p>"이용자"란 뉴스앤피플 홈페이지에 접속하여 본 약관에 따라 회원으로 가입하고 뉴스앤피플이 제공하는 서비스를 받는 자를 말합니다.</p>
            </div>

            {/* 제3조 */}
            <div>
              <h2 className="font-bold text-base text-gray-900 mb-2">제3조 (회원가입)</h2>
              <ul className="list-disc list-inside space-y-1">
                <li>뉴스앤피플 홈페이지 회원은 본인 가입을 원칙으로 합니다.</li>
                <li>회원 가입 및 서비스 이용은 기본적으로 무료입니다.</li>
                <li>회원은 가입 시 기재한 회원정보에 변경이 발생한 경우, 즉시 회원정보 수정 등을 통해 변경사항을 반영해야 합니다.</li>
                <li>타인의 명의를 도용하거나 허위 정보를 기재할 경우 서비스 이용이 제한되거나 회원 자격이 상실될 수 있습니다.</li>
              </ul>
            </div>

            {/* 제4조 */}
            <div>
              <h2 className="font-bold text-base text-gray-900 mb-2">제4조 (회원정보의 보호 및 활용)</h2>
              <p>가입 시 입력한 신상정보는 서비스 제공 목적 외의 용도로 사용되지 않으며, 외부로 유출하지 않습니다. 단, 법령에 의거하여 수사기관의 요청이 있는 경우 등 관련 법 규정에 의한 경우에는 예외로 합니다.</p>
            </div>

            {/* 제5조 */}
            <div>
              <h2 className="font-bold text-base text-gray-900 mb-2">제5조 (회원의 의무)</h2>
              <p>1. ID와 비밀번호의 관리 책임은 회원 본인에게 있으며, 이를 타인에게 이용하게 해서는 안 됩니다.</p>
              <p>2. 게시판 이용 시 타인의 이메일 주소를 무단 취득하여 스팸 메일을 발송하는 등 타인에게 피해를 주는 행위를 해서는 안 됩니다.</p>
            </div>

            {/* 제6조 ~ 제7조 (중략된 핵심내용) */}
            <div>
              <h2 className="font-bold text-base text-gray-900 mb-2">제6조 (저작권)</h2>
              <p>뉴스앤피플이 작성한 모든 콘텐츠의 저작권은 회사에 있으며, 사전 동의 없는 무단 복제, 전재 및 배포를 금합니다.</p>
            </div>

            {/* 제8조 */}
            <div>
              <h2 className="font-bold text-base text-gray-900 mb-2">제8조 (회원자격 중지 및 탈퇴)</h2>
              <p>뉴스앤피플은 허위 가입, 음란물 게재, 불법 상행위, 타인 비방 등 부적절한 행위를 한 회원의 자격을 별도 통보 없이 정지하거나 박탈할 수 있습니다.</p>
            </div>

            {/* 제9조 ~ 제12조 */}
            <div>
              <h2 className="font-bold text-base text-gray-900 mb-2">제12조 (관할법원)</h2>
              <p>본 약관과 관련하여 발생한 분쟁에 관한 소송은 뉴스앤피플 소재지를 관할하는 법원을 전담 관할법원으로 합니다.</p>
            </div>

            <div className="pt-6 border-t border-gray-100 text-gray-500 italic">
              [부칙] 본 약관은 2026년 3월 5일부터 적용됩니다.
            </div>
          </section>
        </div>

        <aside className="lg:col-span-3">
          <Sidebar />
        </aside>
      </main>
      <Footer />
    </div>
  );
}