package com.newspaper.api_server.service;

import com.newspaper.api_server.domain.BrandSettings;
import com.newspaper.api_server.repository.BrandSettingsRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class BrandSettingsService {

    private static final String PRIMARY_SITE_NAME = "NEWSPAPER";
    private static final String PRIMARY_SIDEBAR_TOP = "스퀘어 배너 광고 1";
    private static final String PRIMARY_SIDEBAR_LONG = "세로형 긴 배너 광고";
    private static final String SECONDARY_SITE_NAME = "DAILY FOCUS";
    private static final String SECONDARY_SIDEBAR_TOP = "FOCUS 스페셜 광고";
    private static final String SECONDARY_SIDEBAR_LONG = "DAILY FOCUS 메인 캠페인";

    private final BrandSettingsRepository repository;

    public Map<String, Object> getSettings(String brandId) {
        BrandSettings settings = repository.findById(brandId).orElse(null);
        if (settings == null) {
            return buildDefaults(brandId);
        }
        Map<String, Object> m = new HashMap<>();
        m.put("siteName", nullToEmpty(settings.getSiteName()));
        m.put("logoImageUrl", nullToEmpty(settings.getLogoImageUrl()));
        m.put("sidebarTopText", nullToEmpty(settings.getSidebarTopText()));
        m.put("sidebarTopImageUrl", nullToEmpty(settings.getSidebarTopImageUrl()));
        m.put("showSidebarTop", settings.getShowSidebarTop() != null ? settings.getShowSidebarTop() : true);
        m.put("sidebarLongText", nullToEmpty(settings.getSidebarLongText()));
        m.put("sidebarLongImageUrl", nullToEmpty(settings.getSidebarLongImageUrl()));
        m.put("showSidebarLong", settings.getShowSidebarLong() != null ? settings.getShowSidebarLong() : true);
        m.put("bottomBannerText", nullToEmpty(settings.getBottomBannerText()));
        m.put("bottomBannerImageUrl", nullToEmpty(settings.getBottomBannerImageUrl()));
        m.put("showBottomBanner", settings.getShowBottomBanner() != null ? settings.getShowBottomBanner() : true);
        return m;
    }

    @Transactional
    public Map<String, Object> updateSettings(String brandId, Map<String, Object> body) {
        BrandSettings settings = repository.findById(brandId).orElseGet(() -> {
            BrandSettings newSettings = createDefault(brandId);
            return repository.save(newSettings);
        });

        String siteName = getString(body, "siteName");
        String logoImageUrl = getString(body, "logoImageUrl");
        String sidebarTopText = getString(body, "sidebarTopText");
        String sidebarTopImageUrl = getString(body, "sidebarTopImageUrl");
        Boolean showSidebarTop = getBoolean(body, "showSidebarTop");
        String sidebarLongText = getString(body, "sidebarLongText");
        String sidebarLongImageUrl = getString(body, "sidebarLongImageUrl");
        Boolean showSidebarLong = getBoolean(body, "showSidebarLong");
        String bottomBannerText = getString(body, "bottomBannerText");
        String bottomBannerImageUrl = getString(body, "bottomBannerImageUrl");
        Boolean showBottomBanner = getBoolean(body, "showBottomBanner");

        settings.update(siteName, logoImageUrl,
                sidebarTopText, sidebarTopImageUrl, showSidebarTop,
                sidebarLongText, sidebarLongImageUrl, showSidebarLong,
                bottomBannerText, bottomBannerImageUrl, showBottomBanner);

        repository.save(settings);
        return getSettings(brandId);
    }

    private Map<String, Object> buildDefaults(String brandId) {
        String siteName;
        String sidebarTop;
        String sidebarLong;
        if ("secondary".equals(brandId)) {
            siteName = SECONDARY_SITE_NAME;
            sidebarTop = SECONDARY_SIDEBAR_TOP;
            sidebarLong = SECONDARY_SIDEBAR_LONG;
        } else {
            siteName = PRIMARY_SITE_NAME;
            sidebarTop = PRIMARY_SIDEBAR_TOP;
            sidebarLong = PRIMARY_SIDEBAR_LONG;
        }
        Map<String, Object> m = new HashMap<>();
        m.put("siteName", siteName);
        m.put("logoImageUrl", "");
        m.put("sidebarTopText", sidebarTop);
        m.put("sidebarTopImageUrl", "");
        m.put("showSidebarTop", true);
        m.put("sidebarLongText", sidebarLong);
        m.put("sidebarLongImageUrl", "");
        m.put("showSidebarLong", true);
        m.put("bottomBannerText", "하단 띠 배너 광고");
        m.put("bottomBannerImageUrl", "");
        m.put("showBottomBanner", true);
        return m;
    }

    private BrandSettings createDefault(String brandId) {
        if ("secondary".equals(brandId)) {
            return new BrandSettings(brandId, SECONDARY_SITE_NAME, SECONDARY_SIDEBAR_TOP, SECONDARY_SIDEBAR_LONG, "하단 띠 배너 광고");
        }
        return new BrandSettings(brandId, PRIMARY_SITE_NAME, PRIMARY_SIDEBAR_TOP, PRIMARY_SIDEBAR_LONG, "하단 띠 배너 광고");
    }

    private static String nullToEmpty(String s) {
        return s != null ? s : "";
    }

    private static String getString(Map<String, Object> map, String key) {
        Object v = map.get(key);
        return v != null ? v.toString() : null;
    }

    private static Boolean getBoolean(Map<String, Object> map, String key) {
        Object v = map.get(key);
        if (v == null) return null;
        if (v instanceof Boolean) return (Boolean) v;
        if (v instanceof String) return Boolean.parseBoolean((String) v);
        return null;
    }
}
