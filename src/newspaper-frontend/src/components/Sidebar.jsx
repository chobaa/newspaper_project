import AdBanner from "./AdBanner";
import NewsSlider from "./NewsSlider";
import { useBrandSettings } from "../context/BrandSettingsContext";

export default function Sidebar() {
  const { settings: brand } = useBrandSettings();

  return (
    <aside className="space-y-6">
      {/* 1. 광고 배너 (표시 여부는 관리자 설정에 따름) */}
      {brand.showSidebarTop !== false && (
        <AdBanner
          height="h-[250px]"
          text={brand.sidebarTopText}
          imageUrl={brand.sidebarTopImageUrl}
        />
      )}
      {brand.showSidebarLong !== false && (
        <AdBanner
          height="h-[600px]"
          text={brand.sidebarLongText}
          imageUrl={brand.sidebarLongImageUrl}
        />
      )}

      {/* 2. 뉴스 슬라이더 */}
      <NewsSlider />
    </aside>
  );
}