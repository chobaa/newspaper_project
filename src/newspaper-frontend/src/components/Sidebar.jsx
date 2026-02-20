import AdBanner from "./AdBanner";
import NewsSlider from "./NewsSlider";

export default function Sidebar() {
  return (
    <aside className="space-y-6">
      {/* 1. 슬라이더 */}
      <NewsSlider />

      {/* 2. 광고들 */}
      <AdBanner height="h-[250px]" text="스퀘어 배너 광고 1" />
      <AdBanner height="h-[600px]" text="세로형 긴 배너 광고" />
    </aside>
  );
}