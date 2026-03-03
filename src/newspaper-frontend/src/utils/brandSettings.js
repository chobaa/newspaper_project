import { getBrandConfig } from "../config/brandConfig";

const STORAGE_PREFIX = "brandSettings:";

const buildDefault = () => {
  const brand = getBrandConfig();
  return {
    siteName: brand.siteName,
    sidebarTopText: brand.adTexts.sidebarTop,
    sidebarTopImageUrl: "",
    sidebarLongText: brand.adTexts.sidebarLong,
    sidebarLongImageUrl: "",
    // 배너 기본 표시 여부
    showSidebarTop: true,
    showSidebarLong: true,
    // 하단 띠 배너 기본 값
    bottomBannerText: "하단 띠 배너 광고",
    bottomBannerImageUrl: "",
    showBottomBanner: true,
  };
};

export function getBrandSettings() {
  const brand = getBrandConfig();
  const key = STORAGE_PREFIX + brand.id;
  const defaults = buildDefault();
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      return { ...defaults, ...JSON.parse(raw) };
    }
  } catch (_) {}
  return defaults;
}

export function saveBrandSettings(settings) {
  const brand = getBrandConfig();
  const key = STORAGE_PREFIX + brand.id;
  localStorage.setItem(key, JSON.stringify(settings));
}

