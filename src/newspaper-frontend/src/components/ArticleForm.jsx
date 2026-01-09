import { useState, useMemo } from "react";
import ReactQuill, { Quill } from "react-quill-new"; 
import "react-quill-new/dist/quill.snow.css"; 

const Size = Quill.import("attributors/style/size");
const fontSizeArr = ["10px", "11px", "12px", "13px", "14px", "16px", "18px", "20px", "24px", "30px"];
Size.whitelist = fontSizeArr;
Quill.register(Size, true);

export default function ArticleForm({ onSave, onCancel }) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("정치");
  const [content, setContent] = useState(""); 

  const modules = useMemo(() => ({
    toolbar: {
      container: [
        [{ 'size': fontSizeArr }], 
        [{ 'font': [] }],          
        ['bold', 'italic', 'underline', 'strike'], 
        [{ 'color': [] }, { 'background': [] }], 
        [{ 'list': 'ordered'}, { 'list': 'bullet' }], 
        [{ 'align': [] }],                   
        ['link', 'image', 'video'],          
        ['clean']                            
      ],
    }
  }), []);

  const handleSubmit = (e) => {
    e.preventDefault();
    const plainText = content.replace(/<[^>]+>/g, ''); 
    
    if (!title || plainText.trim().length === 0) {
      alert("제목과 내용을 모두 입력해주세요.");
      return;
    }

    onSave({
      title,
      category,
      desc: plainText.slice(0, 100) + (plainText.length > 100 ? "..." : ""),
      content: content,
      date: new Date().toLocaleDateString(),
      author: "관리자",
      img: `https://picsum.photos/300/200?random=${Date.now()}`
    });
  };

  return (
    <div className="max-w-4xl mx-auto bg-white p-8 rounded-2xl border border-gray-200 shadow-sm animate-[fadeIn_0.3s_ease-out]">
      <h2 className="text-2xl font-black text-gray-900 mb-6 border-b pb-4">기사 작성</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* 카테고리 & 제목 입력 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-1">
            <label className="block text-sm font-bold text-gray-700 mb-2">카테고리</label>
            <select 
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {/* ✅ 요청하신 8개 카테고리로 옵션 변경 */}
              <option value="정치">정치</option>
              <option value="경제">경제</option>
              <option value="사회">사회</option>
              <option value="문화">문화</option>
              <option value="교육">교육</option>
              <option value="인터뷰칼럼">인터뷰칼럼</option>
              <option value="경기도소식">경기도소식</option>
              <option value="동영상">동영상</option>
            </select>
          </div>
          <div className="md:col-span-3">
            <label className="block text-sm font-bold text-gray-700 mb-2">기사 제목</label>
            <input 
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="제목을 입력하세요"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-lg"
            />
          </div>
        </div>

        {/* 에디터 영역 (코드 유지) */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">기사 내용</label>
          <div className="h-[500px] mb-12">
            <ReactQuill 
              theme="snow" 
              value={content} 
              onChange={setContent} 
              modules={modules}
              className="h-full"
              placeholder="내용을 작성해주세요..."
            />
          </div>
        </div>

        {/* 버튼 영역 (코드 유지) */}
        <div className="flex justify-end gap-3 pt-4 border-t mt-12">
          <button type="button" onClick={onCancel} className="px-6 py-3 rounded-lg font-bold text-gray-600 hover:bg-gray-100 transition">취소</button>
          <button type="submit" className="px-8 py-3 rounded-lg font-bold bg-blue-900 text-white hover:bg-blue-800 shadow-md transition transform hover:scale-105">기사 발행하기</button>
        </div>
      </form>

      {/* 스타일 설정 (코드 유지) */}
      <style>{`
        .ql-container { font-size: 11px; border-bottom-left-radius: 0.5rem; border-bottom-right-radius: 0.5rem; }
        .ql-toolbar { border-top-left-radius: 0.5rem; border-top-right-radius: 0.5rem; }
        .ql-editor { min-height: 300px; font-family: sans-serif; line-height: 1.6; color: #333; }
        ${fontSizeArr.map(size => `.ql-snow .ql-picker.ql-size .ql-picker-label[data-value="${size}"]::before, .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="${size}"]::before { content: '${size.replace('px', '')}'; }`).join('')}
        .ql-snow .ql-picker.ql-size .ql-picker-label::before { content: '11'; }
      `}</style>
    </div>
  );
}