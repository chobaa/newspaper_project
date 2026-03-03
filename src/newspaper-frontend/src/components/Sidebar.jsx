import AdBanner from "./AdBanner";
import NewsSlider from "./NewsSlider";
import { getBrandSettings } from "../utils/brandSettings";

export default function Sidebar() {
  const brand = getBrandSettings();

  return (
    <aside className="space-y-6">
      {/* 1. 광고 배너(항상 상단) */}
      <AdBanner
        height="h-[250px]"
        text={brand.sidebarTopText}
        imageUrl={brand.sidebarTopImageUrl}
      />
      <AdBanner
        height="h-[600px]"
        text={brand.sidebarLongText}
        imageUrl={brand.sidebarLongImageUrl}
      />

      {/* 2. 뉴스 슬라이더 */}
      <NewsSlider />
    </aside>
  );
}