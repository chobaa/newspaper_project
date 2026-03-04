import { getBrandConfig } from "../config/brandConfig";

/**
 * @deprecated Use useBrandSettings() hook instead.
 * 동기 기본값 반환 (API 기반은 BrandSettingsProvider/useBrandSettings 사용)
 */
const buildDefault = () => {
  const brand = getBrandConfig();
  return {
    siteName: brand.siteName,
    logoImageUrl: "",
    sidebarTopText: brand.adTexts.sidebarTop,
    sidebarTopImageUrl: "",
    sidebarLongText: brand.adTexts.sidebarLong,
    sidebarLongImageUrl: "",
    showSidebarTop: true,
    showSidebarLong: true,
    bottomBannerText: "하단 띠 배너 광고",
    bottomBannerImageUrl: "",
    showBottomBanner: true,
  };
};

export function getBrandSettings() {
  return buildDefault();
}

/**
 * @deprecated Use useBrandSettings().save() instead.
 * API 기반 저장은 AdminPanel에서 saveBrandConfigApi 사용
 */
export function saveBrandSettings() {
  console.warn("saveBrandSettings is deprecated, use useBrandSettings().save()");
}
