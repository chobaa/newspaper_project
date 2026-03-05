import { Link } from "react-router-dom";

export default function Footer() {
  // 상단 메뉴 리스트
  const footerLinks = [
    { name: "회사소개", bold: false, path: "/company" },
    { name: "서비스이용약관", bold: false, path: "/terms" },
    { name: "개인정보처리방침", bold: false, path: "/privacy" },
    { name: "게시물게재원칙", bold: false, path: "/posting" },
    { name: "청소년보호정책", bold: false, path: "/youth" },
    { name: "기사배열기본방침", bold: false, path: "/placement" },
  ];

  return (
    <footer className="bg-gray-100 border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-8">
        
        {/* 1. 상단 링크 메뉴 (약관 등) */}
        <div className="flex flex-wrap justify-center md:justify-start items-center gap-x-0 mb-6 text-sm text-gray-600">
          {footerLinks.map((link, index) => (
            <div key={link.name} className="flex items-center">
              <Link
                to={link.path}
                className={`
                  hover:underline px-3 py-1 cursor-pointer transition-colors hover:text-[var(--brand-600)]
                  ${link.bold ? "font-bold text-gray-800" : ""}
                `}
              >
                {link.name}
              </Link>
              {/* 마지막 항목이 아닐 때만 구분선(|) 표시 */}
              {index !== footerLinks.length - 1 && (
                <span className="text-gray-300 text-[10px]">|</span>
              )}
            </div>
          ))}
        </div>

        {/* 2. 하단 회사 정보 */}
        <div className="text-xs text-gray-500 space-y-2 leading-relaxed border-t border-gray-200 pt-6">
          <p>
            <span className="font-bold mr-2">주소 :</span> 경기도 성남시 중원구 둔촌대로 193 성남동현대아파트 102동 1116호 &nbsp;|&nbsp; 
            <span className="font-bold mx-2">관리자 등록번호 :</span> 경기 아51809 &nbsp;|&nbsp; 
            <span className="font-bold mx-2">등록일 :</span> 2026년 1월 9일
          </p>
          <p>
            <span className="font-bold mr-2">제호 :</span> 뉴스앤피플 &nbsp;|&nbsp; 
            <span className="font-bold mx-2">직통전화 :</span> 010-4313-8961 &nbsp;|&nbsp; 
            <span className="font-bold mx-2">발행인·편집인 :</span> 김경희
          </p>
          <p>
            <span className="font-bold mr-2">개인정보관리책임자 :</span> 김경희 &nbsp;|&nbsp; 
            <span className="font-bold mx-2">청소년보호책임자 :</span> 김경희
          </p>

          <div className="mt-4 flex flex-col md:flex-row md:items-center gap-2">
            <p className="font-bold text-gray-700">
              Copyright © 2026 NEWSNPEOPLE. All rights reserved.
            </p>
            <p>
              mail to <a href="newsnpeoples@naver.com" className="font-bold text-black hover:text-[var(--brand-600)]">newsnpeoples@naver.com</a>
            </p>
          </div>
        </div>

      </div>
    </footer>
  );
}