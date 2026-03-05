import { BrowserRouter, Routes, Route } from "react-router-dom";
import { getBrandConfig } from "./config/brandConfig";
import { BrandSettingsProvider } from "./context/BrandSettingsContext";
import Home from "./pages/Home";
import ArticleDetail from "./pages/ArticleDetail";
import Company from "./pages/Company";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Posting from "./pages/Posting";
import Youth from "./pages/Youth";
import Placement from "./pages/Placement";

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

            {/* 회사소개 / 약관 / 정책 페이지 */}
            <Route path="/company" element={<Company />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/posting" element={<Posting />} />
            <Route path="/youth" element={<Youth />} />
            <Route path="/placement" element={<Placement />} />
          </Routes>
        </BrowserRouter>
      </div>
    </BrandSettingsProvider>
  );
}