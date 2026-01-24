import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import ArticleDetail from "./pages/ArticleDetail";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 메인 화면 (http://localhost:5173/) */}
        <Route path="/" element={<Home />} />

        {/* 기사 상세 화면 (http://localhost:5173/article/123) */}
        <Route path="/article/:id" element={<ArticleDetail />} />
      </Routes>
    </BrowserRouter>
  );
}