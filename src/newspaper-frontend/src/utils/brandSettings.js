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

