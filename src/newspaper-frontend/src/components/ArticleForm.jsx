import { useState, useMemo, useRef, useEffect } from "react";
import ReactQuill, { Quill } from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";

import { getDisplaySettings } from "../utils/displaySettings";
import BlotFormatter from 'quill-blot-formatter';
Quill.register('modules/blotFormatter', BlotFormatter);

const Size = Quill.import("attributors/style/size");
const fontSizeArr = ["10px", "11px", "12px", "13px", "14px", "16px", "18px", "20px", "24px", "30px"];
Size.whitelist = fontSizeArr;
Quill.register(Size, true);

// 글꼴 whitelist 등록 (관리자 보기 설정과 동일한 글꼴)
const Font = Quill.import("attributors/class/font");
const fontArr = ["", "noto-sans-kr", "nanum-myeongjo", "georgia", "malgun-gothic"];
Font.whitelist = fontArr;
Quill.register(Font, true);

// 글 간격(줄간격) - 등록 실패 시 앱은 정상 동작 (try-catch)
const lineHeightArr = ["", "1.4", "1.6", "1.8", "2", "2.2"];
let lineHeightOk = false;
try {
  const Parchment = Quill.import("parchment");
  const LineHeightStyle = new Parchment.Attributor.Style("lineHeight", "line-height", {
    scope: Parchment.Scope.INLINE,
    whitelist: lineHeightArr.filter(Boolean),
  });
  Quill.register(LineHeightStyle, true);
  lineHeightOk = true;
} catch (_) {
  /* 줄간격 툴바 없이 계속 진행 */
}

export default function ArticleForm({ onSave, onCancel, initialArticle }) {
  const [title, setTitle] = useState(initialArticle?.title || "");
  const [category, setCategory] = useState(initialArticle?.category || "정치");
  const [content, setContent] = useState(initialArticle?.content || "");

  // 관리자 보기 설정 적용 (기본값: inherit, 1.125rem, 100%, 1.8)
  const display = getDisplaySettings();

  // 에디터 접근을 위한 Ref
  const quillRef = useRef(null);

  // 이미지 선택 상태 및 크기 값 (디폴트값 설정을 위해 width, height 상태 관리)
  const [selectedImage, setSelectedImage] = useState(null);
  const [imgSize, setImgSize] = useState({ width: "", height: "" });
  const [keepRatio, setKeepRatio] = useState(true);

  const modules = useMemo(() => ({
    toolbar: {
      container: [
        [{ 'size': fontSizeArr }],
        [{ 'font': fontArr }],
        ...(lineHeightOk ? [[{ 'lineHeight': lineHeightArr }]] : []),
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        [{ 'align': [] }],
        ['link', 'image', 'video'],
        ['clean']
      ],
    },
    blotFormatter: {}
  }), []);

  // 수정 모드에서 initialArticle 이 바뀌면 폼 값도 동기화
  useEffect(() => {
    if (initialArticle) {
      setTitle(initialArticle.title || "");
      setCategory(initialArticle.category || "정치");
      setContent(initialArticle.content || "");
    }
  }, [initialArticle]);

  // 폼에 내용이 있으면 전역 플래그로 "작성 중" 표시 (탭 이동 시 경고용)
  useEffect(() => {
    const plainText = content.replace(/<[^>]+>/g, "").trim();
    const dirty = !!(title || plainText);
    window.__articleDirty = dirty;
    return () => {
      window.__articleDirty = false;
    };
  }, [title, content]);

  useEffect(() => {
    const editor = quillRef.current?.getEditor();
    if (!editor) return;

    // 붙여넣기 시 관리자 설정(글꼴/크기/줄간격)으로 자동 정규화 (bold 등 외부 서식 제거)
    const Delta = Quill.import("delta");
    const fontMap = {
      "inherit": "",
      "'Noto Sans KR', sans-serif": "noto-sans-kr",
      "'Nanum Myeongjo', serif": "nanum-myeongjo",
      "Georgia, serif": "georgia",
      "'Malgun Gothic', sans-serif": "malgun-gothic",
    };
    const sizeMap = {
      "0.625rem": "10px", "0.75rem": "12px", "0.875rem": "14px",
      "1rem": "16px", "1.125rem": "18px", "1.25rem": "20px", "1.5rem": "24px",
    };

    const pasteMatcher = (node, delta) => {
      const display = getDisplaySettings();
      const attrs = {};
      const fontVal = fontMap[display.fontFamily];
      if (fontVal !== undefined && fontVal !== "") attrs.font = fontVal;
      const sizeVal = sizeMap[display.fontSize];
      if (sizeVal) attrs.size = sizeVal;
      if (lineHeightOk && display.lineHeight) attrs.lineHeight = display.lineHeight;

      const ops = delta.ops.map((op) => {
        if (typeof op.insert === "string") {
          return { insert: op.insert, attributes: Object.keys(attrs).length ? attrs : undefined };
        }
        return op; // 이미지 등 embed는 그대로
      });
      return new Delta({ ops });
    };

    editor.clipboard.addMatcher(Node.ELEMENT_NODE, pasteMatcher);
  }, []);

  useEffect(() => {
    const editor = quillRef.current?.getEditor();
    if (!editor) return;

    // 클릭 핸들러: 클릭된 요소가 이미지인지 즉시 확인
    const handleClick = (e) => {
      // e.target은 실제 클릭된 DOM 요소를 가리킴
      if (e.target.tagName === "IMG") {
        const img = e.target;
        setSelectedImage(img);

        setImgSize({
                  width: parseInt(img.style.width) || img.width || img.naturalWidth,
                  height: parseInt(img.style.height) || img.height || img.naturalHeight
        });
      } else {
        // 이미지가 아닌 영역을 클릭하면 컨트롤러 숨김
        setSelectedImage(null);
        setImgSize({ width: "", height: "" });
      }
    };

    // 에디터의 루트 영역(작성 공간)에 클릭 리스너 등록
    editor.root.addEventListener("click", handleClick);

    // 컴포넌트가 사라질 때 리스너 정리 (메모리 누수 방지)
    return () => {
      editor.root.removeEventListener("click", handleClick);
    };
  }, []); // 빈 배열: 컴포넌트가 처음 나타날 때 한 번만 실행

  // 입력창 값 변경 시 이미지 크기 실시간 적용
  const handleSizeChange = (e) => {
    const { name, value } = e.target;
    setImgSize((prev) => ({ ...prev, [name]: value }));

    if (selectedImage) {
       if (name === "width") {
               selectedImage.setAttribute("width", value);
               selectedImage.style.width = value + "px"; // CSS 스타일 강제 적용

               if (keepRatio && selectedImage.naturalWidth) {
                 const ratio = selectedImage.naturalHeight / selectedImage.naturalWidth;
                 const newHeight = Math.round(value * ratio); // 비율에 맞춰 계산

                 selectedImage.style.height = newHeight + "px"; // CSS 적용
                 selectedImage.setAttribute("height", newHeight); // 속성 적용
                 setImgSize(prev => ({ ...prev, height: newHeight })); // 입력창 숫자도 자동 변경
               }
       }
       if (name === "height") {
            selectedImage.setAttribute("height", value);
            selectedImage.style.height = value + "px"; // CSS 스타일 강제 적용 (height: auto 무시)

            if (keepRatio && selectedImage.naturalHeight) {
              const ratio = selectedImage.naturalWidth / selectedImage.naturalHeight;
              const newWidth = Math.round(value * ratio);

              selectedImage.style.width = newWidth + "px";
              selectedImage.setAttribute("width", newWidth);
              setImgSize(prev => ({ ...prev, width: newWidth })); // 입력창 숫자도 자동 변경
          }
       }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const plainText = content.replace(/<[^>]+>/g, '');

    if (!title || plainText.trim().length === 0) {
      alert("제목과 내용을 모두 입력해주세요.");
      return;
    }

    onSave({
      id: initialArticle?.id,
      title,
      category,
      desc: plainText.slice(0, 100) + (plainText.length > 100 ? "..." : ""),
      content,
      date: initialArticle?.date || new Date().toLocaleDateString(),
      author: initialArticle?.author || "관리자",
    });
  };

  const handleCancelClick = () => {
    const plainText = content.replace(/<[^>]+>/g, "").trim();
    const dirty = !!(title || plainText);
    if (dirty) {
      const ok = window.confirm("작성 중인 내용이 저장되지 않습니다. 나가시겠습니까?");
      if (!ok) {
        return;
      }
    }
    window.__articleDirty = false;
    onCancel();
  };

  return (
    <div className="max-w-4xl mx-auto bg-white p-8 rounded-2xl border border-gray-200 shadow-sm animate-[fadeIn_0.3s_ease-out]">
      <h2 className="text-2xl font-black text-gray-900 mb-6 border-b pb-4">
        {initialArticle ? "기사 수정" : "기사 작성"}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-1">
            <label className="block text-sm font-bold text-gray-700 mb-2">카테고리</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-500)]"
            >
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
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-500)] font-bold text-lg"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">기사 내용</label>
          <div className="article-form-editor h-[500px] mb-12">
            <ReactQuill
              ref={quillRef}
              theme="snow"
              value={content}
              onChange={setContent}
              modules={modules}
              className="h-full"
              placeholder="내용을 작성해주세요..."
            />
          </div>
        </div>

        {/* 이미지 크기 조절 컨트롤러 */}
        {selectedImage && (
          <div className="mt-2 p-3 bg-gray-100 rounded border border-gray-300 flex items-center gap-4 animate-fade-in-up transition-all duration-200">
            <span className="text-sm font-bold text-gray-700">🖼 이미지 크기 조절 (px):</span>
            <div className="flex items-center gap-1 border-r pr-4 border-gray-300">
                <input
                  type="checkbox"
                  id="ratioCheck"
                  checked={keepRatio}
                  onChange={(e) => setKeepRatio(e.target.checked)}
                  className="w-4 h-4 cursor-pointer"
                />
                <label htmlFor="ratioCheck" className="text-sm cursor-pointer select-none font-medium text-[var(--brand-800)]">
                  비율 유지 (Auto)
                </label>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm">가로(W):</label>
              <input
                type="number"
                name="width"
                value={imgSize.width}
                onChange={handleSizeChange}
                placeholder="너비"
                className="border p-1 w-20 rounded text-center focus:ring-2 focus:ring-[var(--brand-500)] outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm">세로(H):</label>
              <input
                type="number"
                name="height"
                value={imgSize.height}
                onChange={handleSizeChange}
                placeholder="높이"
                className="border p-1 w-20 rounded text-center focus:ring-2 focus:ring-[var(--brand-500)] outline-none"
              />
            </div>
            <p className="text-xs text-gray-500 ml-auto">* 값을 입력하면 즉시 반영됩니다.</p>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t mt-12">
          <button type="button" onClick={handleCancelClick} className="px-6 py-3 rounded-lg font-bold text-gray-600 hover:bg-gray-100 transition">취소</button>
          <button type="submit" className="px-8 py-3 rounded-lg font-bold text-white shadow-md transition transform hover:scale-105 bg-[var(--brand-900)] hover:bg-[var(--brand-800)]">기사 발행하기</button>
        </div>
      </form>

      <style>{`
        .ql-container { font-size: 11px; border-bottom-left-radius: 0.5rem; border-bottom-right-radius: 0.5rem; }
        .ql-toolbar { border-top-left-radius: 0.5rem; border-top-right-radius: 0.5rem; }
        .article-form-editor .ql-editor {
          min-height: 300px;
          font-family: ${display.fontFamily};
          font-size: ${display.fontSize};
          line-height: ${display.lineHeight};
          color: #333;
        }
        .article-form-editor .ql-editor img {
          max-width: ${display.imageMaxWidth};
          height: auto;
        }
        ${fontSizeArr.map(size => `.ql-snow .ql-picker.ql-size .ql-picker-label[data-value="${size}"]::before, .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="${size}"]::before { content: '${size.replace('px', '')}'; }`).join('')}
        .ql-snow .ql-picker.ql-size .ql-picker-label::before { content: '11'; }
        /* 글꼴 드롭다운 라벨 */
        .ql-snow .ql-picker.ql-font .ql-picker-label[data-value=""]::before,
        .ql-snow .ql-picker.ql-font .ql-picker-item[data-value=""]::before { content: '기본'; }
        .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="noto-sans-kr"]::before,
        .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="noto-sans-kr"]::before { content: 'Noto Sans KR'; font-family: 'Noto Sans KR', sans-serif; }
        .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="nanum-myeongjo"]::before,
        .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="nanum-myeongjo"]::before { content: '나눔명조'; font-family: 'Nanum Myeongjo', serif; }
        .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="georgia"]::before,
        .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="georgia"]::before { content: 'Georgia'; font-family: Georgia, serif; }
        .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="malgun-gothic"]::before,
        .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="malgun-gothic"]::before { content: '맑은 고딕'; font-family: 'Malgun Gothic', sans-serif; }
        /* 글 간격 드롭다운 */
        .ql-snow .ql-picker.ql-lineHeight .ql-picker-label[data-value=""]::before,
        .ql-snow .ql-picker.ql-lineHeight .ql-picker-item[data-value=""]::before { content: '기본'; }
        .ql-snow .ql-picker.ql-lineHeight .ql-picker-label[data-value="1.4"]::before,
        .ql-snow .ql-picker.ql-lineHeight .ql-picker-item[data-value="1.4"]::before { content: '좁게 (1.4)'; }
        .ql-snow .ql-picker.ql-lineHeight .ql-picker-label[data-value="1.6"]::before,
        .ql-snow .ql-picker.ql-lineHeight .ql-picker-item[data-value="1.6"]::before { content: '보통 (1.6)'; }
        .ql-snow .ql-picker.ql-lineHeight .ql-picker-label[data-value="1.8"]::before,
        .ql-snow .ql-picker.ql-lineHeight .ql-picker-item[data-value="1.8"]::before { content: '기본 (1.8)'; }
        .ql-snow .ql-picker.ql-lineHeight .ql-picker-label[data-value="2"]::before,
        .ql-snow .ql-picker.ql-lineHeight .ql-picker-item[data-value="2"]::before { content: '넓게 (2)'; }
        .ql-snow .ql-picker.ql-lineHeight .ql-picker-label[data-value="2.2"]::before,
        .ql-snow .ql-picker.ql-lineHeight .ql-picker-item[data-value="2.2"]::before { content: '아주 넓게 (2.2)'; }
        /* 에디터 본문 글꼴 적용 */
        .ql-font-noto-sans-kr { font-family: 'Noto Sans KR', sans-serif; }
        .ql-font-nanum-myeongjo { font-family: 'Nanum Myeongjo', serif; }
        .ql-font-georgia { font-family: Georgia, serif; }
        .ql-font-malgun-gothic { font-family: 'Malgun Gothic', sans-serif; }
      `}</style>
    </div>
  );
}