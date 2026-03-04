import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { getBrandConfig } from "../config/brandConfig";

const BrandSettingsContext = createContext(null);

const buildDefaults = (brand) => ({
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
});

export function BrandSettingsProvider({ children }) {
  const brand = getBrandConfig();
  const [settings, setSettings] = useState(() => buildDefaults(brand));
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch(`/api/brand-settings/${brand.id}`);
      if (res.ok) {
        const data = await res.json();
        setSettings({
          ...buildDefaults(brand),
          ...data,
        });
      } else {
        setSettings(buildDefaults(brand));
      }
    } catch (e) {
      console.error("Brand settings fetch failed:", e);
      setSettings(buildDefaults(brand));
    } finally {
      setLoading(false);
    }
  }, [brand.id]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const saveSettings = useCallback(
    async (newSettings) => {
      const payload = { brandId: brand.id, ...newSettings };
      const res = await fetch("/api/admin/brand-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "저장 실패");
      }
      const data = await res.json();
      setSettings((prev) => ({ ...prev, ...data }));
      return data;
    },
    [brand.id]
  );

  const value = { settings, loading, refetch: fetchSettings, save: saveSettings };
  return (
    <BrandSettingsContext.Provider value={value}>
      {children}
    </BrandSettingsContext.Provider>
  );
}

export function useBrandSettings() {
  const ctx = useContext(BrandSettingsContext);
  if (!ctx) {
    const brand = getBrandConfig();
    return {
      settings: buildDefaults(brand),
      loading: false,
      refetch: () => {},
      save: async () => {},
    };
  }
  return ctx;
}
