import AdBanner from "./AdBanner";
import NewsSlider from "./NewsSlider";
import { useBrandSettings } from "../context/BrandSettingsContext";

export default function Sidebar() {
  const { settings: brand } = useBrandSettings();

  const parseBannerList = (raw, fallbackText) => {
    if (!raw) return [];
    if (Array.isArray(raw)) {
      return raw.map((b) => ({
        imageUrl: b.imageUrl || "",
        linkUrl: b.linkUrl || "",
        text: b.text || fallbackText || "",
        show: b.show !== false,
      }));
    }
    if (typeof raw === "string") {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.map((b) => ({
            imageUrl: b.imageUrl || "",
            linkUrl: b.linkUrl || "",
            text: b.text || fallbackText || "",
            show: b.show !== false,
          }));
        }
      } catch {
        // 문자열 하나만 있는 기존 방식 지원
        return [{
          imageUrl: raw,
          text: fallbackText,
          linkUrl: "",
          show: true,
        }];
      }
    }
    return [];
  };

  const topBanners = parseBannerList(brand.sidebarTopImageUrl, brand.sidebarTopText);

  return (
    <aside className="space-y-6">
      {/* 1. 광고 배너 (표시 여부는 관리자 설정에 따름) */}
      {brand.showSidebarTop !== false && topBanners.length > 0 && (
        <AdBanner
          text={brand.sidebarTopText}
          banners={topBanners}
        />
      )}
      {/* 2. 뉴스 슬라이더 */}
      <NewsSlider />
    </aside>
  );
}