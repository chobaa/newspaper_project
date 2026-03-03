// src/components/LoginModal.jsx
import { useState } from "react";

export default function LoginModal({ isOpen, onClose, onLogin }) {
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");

  if (!isOpen) return null; // 창이 닫혀있으면 아무것도 안 그림

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, password }),
      });

      if (!res.ok) {
        throw new Error("아이디 또는 비밀번호가 틀렸습니다.");
      }

      alert("관리자로 로그인되었습니다.");
      onLogin();
      onClose();
    } catch (err) {
      alert(err.message || "로그인에 실패했습니다.");
    }
  };

  return (
    // 배경 (검은색 반투명) - 배경 클릭하면 닫힘
    <div 
      className="fixed inset-0 z-[999] bg-black/50 backdrop-blur-sm flex items-center justify-center animate-[fadeIn_0.2s_ease-out]"
      onClick={onClose}
    >
      {/* 로그인 박스 - 여기 클릭했을 땐 안 닫히게 막음(stopPropagation) */}
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 relative transform transition-all scale-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 닫기 버튼 (X) */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        <div className="text-center mb-8">
          <h2 className="text-2xl font-black text-blue-900">관리자 로그인</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">아이디</label>
            <input 
              type="text" 
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              placeholder="admin"
              value={id}
              onChange={(e) => setId(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">비밀번호</label>
            <input 
              type="password" 
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              placeholder="••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          
          <button 
            type="submit"
            className="w-full bg-blue-900 text-white font-bold py-3 rounded-lg hover:bg-blue-800 transition-colors shadow-lg mt-4"
          >
            로그인하기
          </button>
        </form>
      </div>
    </div>
  );
}