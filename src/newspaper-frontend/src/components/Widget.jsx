// src/components/Widget.jsx
export default function Widget({ title, children, className = "" }) {
  return (
    <div className={`bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all ${className}`}>
      {/* 제목이 있을 때만 표시 */}
      {title && <h3 className="font-bold text-lg mb-3 text-gray-800">{title}</h3>}
      
      {/* 실제 내용이 들어갈 자리 */}
      <div className="text-gray-600">
        {children}
      </div>
    </div>
  );
}