import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import Footer from "../components/Footer";

export default function Info() {
  const location = useLocation();

  useEffect(() => {
    if (!location.hash) return;
    const id = location.hash.substring(1);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [location.hash]);
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header onSelectCategory={() => {}} showLogin={false} />

      <main className="flex-grow max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-10 gap-8 w-full">
        <div className="lg:col-span-7 bg-white p-6 md:p-10 rounded-xl shadow-sm border border-gray-100 space-y-10">
          <section id="company">
            <h1 className="text-2xl md:text-3xl font-black text-gray-900 mb-4">
              회사소개 (Company Profile)
            </h1>
            <p className="text-sm text-gray-700 leading-relaxed mb-3">
              뉴스앤피플은 지역 사회의 생생한 목소리를 담아내고, 시민들의 알 권리를
              충족시키기 위해 설립된 지역 전문 언론사입니다.
            </p>
            <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
              <li>
                <strong className="font-semibold">설립 목적:</strong>{" "}
                지역 자치 실현 및 공동체 활성화를 위한 공정한 보도
              </li>
              <li>
                <strong className="font-semibold">보도 원칙:</strong>{" "}
                사실(Fact)에 기반한 객관적 보도와 사회적 약자의 목소리 대변
              </li>
              <li>
                <strong className="font-semibold">주요 사업:</strong>{" "}
                지역 뉴스 보도, 지자체 정책 감시, 지역 문화 행사 및 캠페인 주최
              </li>
              <li>
                <strong className="font-semibold">임직원 윤리강령:</strong>{" "}
                금품 수수 금지 및 취재원 보호 등 기자 윤리강령을 철저히 준수
              </li>
            </ul>
          </section>

          <section id="tos">
            <h2 className="text-xl md:text-2xl font-black text-gray-900 mb-3">
              서비스이용약관 (Terms of Service)
            </h2>
            <h3 className="font-bold text-gray-800 mb-1">제1조. 목적</h3>
            <p className="text-sm text-gray-700 leading-relaxed mb-2">
              본 약관은 이용자가 뉴스앤피플에서 제공하는 인터넷 관련 서비스를
              이용함에 있어 회사와 이용자의 권리 및 의무를 규정함을 목적으로
              합니다.
            </p>
            <h3 className="font-bold text-gray-800 mb-1">제2조. 회원가입 및 정보 변경</h3>
            <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 mb-2">
              <li>회원은 본인 가입을 원칙으로 하며, 허위 정보 입력 시 서비스 이용이 제한될 수 있습니다.</li>
              <li>회원은 개인정보 변경 시 지체 없이 수정하여 최신 상태를 유지해야 합니다.</li>
            </ul>
            <h3 className="font-bold text-gray-800 mb-1">제3조. 저작권 및 이용 제한</h3>
            <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
              <li>뉴스앤피플이 작성한 모든 콘텐츠의 저작권은 회사에 있으며, 무단 복제 및 전재를 금합니다.</li>
              <li>타인의 명예를 훼손하거나 불법 정보를 게시하는 회원은 사전 통보 없이 자격이 정지될 수 있습니다.</li>
            </ul>
          </section>

          <section id="privacy">
            <h2 className="text-xl md:text-2xl font-black text-gray-900 mb-3">
              개인정보처리방침 (Privacy Policy)
            </h2>
            <h3 className="font-bold text-gray-800 mb-1">제1조. 개인정보 수집 및 이용 목적</h3>
            <p className="text-sm text-gray-700 leading-relaxed mb-2">
              회사는 회원 관리, 뉴스레터 발송, 서비스 개선 등을 위해 최소한의
              개인정보를 수집합니다.
            </p>
            <h3 className="font-bold text-gray-800 mb-1">제2조. 수집 항목 및 보유 기간</h3>
            <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 mb-2">
              <li>필수 항목: 아이디, 비밀번호, 이름, 이메일 주소</li>
              <li>보유 기간: 회원 탈퇴 시까지 (단, 관련 법령에 의한 경우 해당 기간까지)</li>
            </ul>
            <h3 className="font-bold text-gray-800 mb-1">제3조. 제3자 제공 및 위탁</h3>
            <p className="text-sm text-gray-700 leading-relaxed">
              회사는 이용자의 동의 없이 개인정보를 외부에 제공하지 않습니다.
              다만, 수사 기관의 정당한 요청이 있는 경우 법률에 따라 제공할 수
              있습니다.
            </p>
          </section>

          <section id="posting">
            <h2 className="text-xl md:text-2xl font-black text-gray-900 mb-3">
              게시물 게재 원칙 (Posting Principles)
            </h2>
            <h3 className="font-bold text-gray-800 mb-1">제1조. 목적</h3>
            <p className="text-sm text-gray-700 leading-relaxed mb-2">
              본 원칙은 독자가 뉴스앤피플 홈페이지에 게시하는 글의 신뢰성을
              유지하고 건전한 토론 문화를 조성하는 데 목적이 있습니다.
            </p>
            <h3 className="font-bold text-gray-800 mb-1">제2조. 게시물 제한 기준</h3>
            <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
              <li>특정 개인이나 단체를 비방하거나 명예를 훼손하는 내용</li>
              <li>공공질서 및 미풍양속에 반하는 음란성 내용</li>
              <li>영리를 목적으로 하는 광고성 게시물</li>
              <li>확인되지 않은 허위 사실을 유포하여 혼란을 야기하는 내용</li>
            </ul>
          </section>

          <section id="youth">
            <h2 className="text-xl md:text-2xl font-black text-gray-900 mb-3">
              청소년 보호 정책 (Youth Protection Policy)
            </h2>
            <h3 className="font-bold text-gray-800 mb-1">제1조. 목적 및 기본 원칙</h3>
            <p className="text-sm text-gray-700 leading-relaxed mb-2">
              뉴스앤피플은 관련 법령에 따라 청소년이 건전한 인격체로 성장할 수
              있도록 유해 정보로부터 보호하기 위한 조치를 시행합니다.
            </p>
            <h3 className="font-bold text-gray-800 mb-1">제2조. 청소년 유해 정보 차단 및 관리</h3>
            <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 mb-2">
              <li>유해 매체물에 대한 모니터링을 강화하여 불법 콘텐츠를 즉시 삭제합니다.</li>
              <li>청소년이 접근 가능한 공간에 성인용 광고나 음란물을 게시하는 것을 금지합니다.</li>
            </ul>
            <h3 className="font-bold text-gray-800 mb-1">제3조. 청소년보호책임자</h3>
            <p className="text-sm text-gray-700 leading-relaxed">
              성명, 직위 및 연락처 등 청소년보호책임자 정보는 별도의 공지 또는
              고객센터 안내를 통해 제공합니다.
            </p>
          </section>

          <section id="placement">
            <h2 className="text-xl md:text-2xl font-black text-gray-900 mb-3">
              기사 배열 기본 방침 (Article Placement Policy)
            </h2>
            <h3 className="font-bold text-gray-800 mb-1">제1조. 목적</h3>
            <p className="text-sm text-gray-700 leading-relaxed mb-2">
              이 방침은 뉴스앤피플이 제공하는 기사의 배열 기준을 투명하게 공개하여
              보도의 중립성과 공정성을 확보하는 것을 목적으로 합니다.
            </p>
            <h3 className="font-bold text-gray-800 mb-1">제2조. 기사 배열 원칙</h3>
            <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 mb-2">
              <li>공정성: 특정 세력이나 이익 집단에 편향되지 않도록 다양한 시각을 균형 있게 반영합니다.</li>
              <li>공익성: 지역 사회의 발전과 시민의 삶의 질 향상에 기여하는 뉴스를 우선 배치합니다.</li>
              <li>독립성: 편집권의 독립을 보장하며, 외부의 부당한 압력에 굴하지 않습니다.</li>
            </ul>
            <h3 className="font-bold text-gray-800 mb-1">제3조. 기사 수정 및 정정</h3>
            <p className="text-sm text-gray-700 leading-relaxed">
              보도된 내용 중 명백한 오류가 발견된 경우, 즉시 수정하고 정정 보도문을
              게재하여 독자의 알 권리를 보장합니다.
            </p>
          </section>
        </div>

        <div className="lg:col-span-3">
          <Sidebar />
        </div>
      </main>

      <Footer />
    </div>
  );
}

