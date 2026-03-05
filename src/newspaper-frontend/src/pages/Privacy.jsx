import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import Footer from "../components/Footer";

export default function Privacy() {
  const navigate = useNavigate();

  const handleSelectCategory = (nextCategory) => {
    navigate("/", { state: { category: nextCategory } });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header onSelectCategory={handleSelectCategory} showLogin={false} />
      <main className="flex-grow max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-10 gap-8 w-full">
        <div className="lg:col-span-7 bg-white p-6 md:p-10 rounded-xl shadow-sm border border-gray-100 space-y-6">
          
          <header className="border-b border-gray-100 pb-4 mb-6">
            <h1 className="text-2xl md:text-3xl font-black text-gray-900 mb-2">
              개인정보처리방침 (Privacy Policy)
            </h1>
            <p className="text-xs text-gray-400">시행일자: 2026년 3월 5일</p>
          </header>

          <section className="text-sm text-gray-700 leading-relaxed space-y-6">
            <p>
              <strong>뉴스앤피플</strong>(이하 '회사')은 고객님의 개인정보를 중요시하며, "개인정보보호법" 및 "정보통신망 이용촉진 및 정보보호"에 관한 법률을 준수하고 있습니다.
            </p>

            {/* 제1조 */}
            <div>
              <h2 className="font-bold text-gray-900 text-base mb-2">제1조. 개인정보 수집 항목 및 방법</h2>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="mb-2">회사는 서비스 제공을 위해 아래와 같은 개인정보를 수집하고 있습니다.</p>
                <ul className="list-disc list-inside space-y-1">
                  <li><strong>수집항목:</strong> 이름, 로그인ID, 비밀번호, 이메일, 휴대전화번호, 필명, 자기소개, 서비스 이용기록, 접속 로그, 쿠키, 접속 IP 정보</li>
                  <li><strong>수집방법:</strong> 홈페이지 회원가입, 구독신청, 기사제보</li>
                </ul>
              </div>
            </div>

            {/* 제2조 */}
            <div>
              <h2 className="font-bold text-gray-900 text-base mb-2">제2조. 개인정보의 수집 및 이용 목적</h2>
              <ul className="list-disc list-inside space-y-1">
                <li>콘텐츠 제공, 본인 인증, 서비스 제공에 따른 요금 정산</li>
                <li>회원제 서비스 이용에 따른 본인 식별 및 불량 회원의 부정이용 방지</li>
                <li>신규 서비스 개발, 이벤트 등 광고성 정보 전달 및 마케팅 활용</li>
              </ul>
            </div>

            {/* 제3조 */}
            <div>
              <h2 className="font-bold text-gray-900 text-base mb-2">제3조. 개인정보의 보유 및 이용 기간</h2>
              <p className="mb-2">원칙적으로 개인정보 수집 및 이용목적이 달성된 후에는 해당 정보를 지체 없이 파기합니다. 단, 관계법령의 규정에 의하여 보존할 필요가 있는 경우 아래와 같이 일정 기간 보관합니다.</p>
              <ul className="list-disc list-inside space-y-1 text-xs bg-gray-50 p-4 rounded-lg">
                <li>계약 또는 청약철회 등에 관한 기록: <strong>5년</strong></li>
                <li>대금결제 및 재화 등의 공급에 관한 기록: <strong>5년</strong></li>
                <li>소비자의 불만 또는 분쟁처리에 관한 기록: <strong>3년</strong></li>
              </ul>
            </div>

            {/* 제4조 */}
            <div>
              <h2 className="font-bold text-gray-900 text-base mb-2">제4조. 개인정보의 파기절차 및 방법</h2>
              <p>회사는 전자적 파일형태로 저장된 개인정보는 기록을 재생할 수 없는 기술적 방법을 사용하여 삭제하며, 종이에 출력된 개인정보는 분쇄기로 분쇄하여 파기합니다.</p>
            </div>

            {/* 제5조 */}
            <div>
              <h2 className="font-bold text-gray-900 text-base mb-2">제5조. 개인정보 취급 위탁</h2>
              <p className="mb-2">회사는 원활한 서비스 이행을 위해 아래와 같이 외부 전문업체에 위탁하여 운영하고 있습니다.</p>
              <div className="border border-gray-200 rounded-md p-3">
                <p><strong>수탁업체:</strong> 인포랜드</p>
                <p><strong>위탁업무:</strong> 홈페이지 유지보수 및 전산 시스템 관리</p>
              </div>
            </div>

            {/* 제6조 */}
            <div>
              <h2 className="font-bold text-gray-900 text-base mb-2">제6조. 개인정보 보호책임자</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border border-gray-100 rounded-lg">
                  <p className="font-bold text-gray-800">[개인정보 관리책임자]</p>
                  <p>성명: 송종명</p>
                  <p>이메일: fishwoww@naver.com</p>
                  <p>연락처: 010-9124-2848</p>
                </div>
                <div className="p-4 border border-gray-100 rounded-lg">
                  <p className="font-bold text-gray-800">[고객서비스 담당부서]</p>
                  <p>부서: 인터넷팀</p>
                  <p>전화번호: 010-9124-2848</p>
                </div>
              </div>
            </div>
          </section>

          <footer className="pt-8 text-[11px] text-gray-400">
            귀하는 회사의 서비스를 이용하시며 발생하는 모든 개인정보보호 관련 민원을 개인정보관리책임자 혹은 담당부서로 신고하실 수 있습니다.
          </footer>
        </div>

        <div className="lg:col-span-3">
          <Sidebar />
        </div>
      </main>
      <Footer />
    </div>
  );
}