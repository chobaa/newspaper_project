import { BrowserRouter, Routes, Route } from "react-router-dom";
import { getBrandConfig } from "./config/brandConfig";
import { BrandSettingsProvider } from "./context/BrandSettingsContext";
import Home from "./pages/Home";
import ArticleDetail from "./pages/ArticleDetail";

export default function App() {
  const brandId = getBrandConfig().id;
  return (
    <BrandSettingsProvider>
      <div data-brand={brandId}>
      <BrowserRouter>
        <Routes>
        {/* 메인 화면 (http://localhost:5173/) */}
        <Route path="/" element={<Home />} />

        {/* 기사 상세 화면 (http://localhost:5173/article/123) */}
        <Route path="/article/:id" element={<ArticleDetail />} />
        </Routes>
      </BrowserRouter>
      </div>
    </BrandSettingsProvider>
  );
}