const BRANDS = {
  primary: {
    id: "primary",
    siteName: "NEWSPAPER",
    adTexts: {
      sidebarTop: "스퀘어 배너 광고 1",
      sidebarLong: "세로형 긴 배너 광고",
    },
  },
  secondary: {
    id: "secondary",
    siteName: "DAILY FOCUS",
    adTexts: {
      sidebarTop: "FOCUS 스페셜 광고",
      sidebarLong: "DAILY FOCUS 메인 캠페인",
    },
  },
};

export function getBrandConfig() {
  const brandKey = import.meta.env.VITE_BRAND || "primary";
  return BRANDS[brandKey] || BRANDS.primary;
}

