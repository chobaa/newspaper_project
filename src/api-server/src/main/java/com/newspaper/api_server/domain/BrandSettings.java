package com.newspaper.api_server.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "brand_settings")
@Getter
@NoArgsConstructor
public class BrandSettings {

    @Id
    @Column(name = "brand_id", length = 50)
    private String brandId;

    private String siteName;
    private String logoImageUrl;
    private String sidebarTopText;

    // 여러 개 배너 정보를 JSON 문자열로 저장하므로 TEXT 컬럼으로 확장
    @Lob
    @Column(columnDefinition = "TEXT")
    private String sidebarTopImageUrl;

    private String sidebarLongText;

    @Lob
    @Column(columnDefinition = "TEXT")
    private String sidebarLongImageUrl;
    private Boolean showSidebarTop = true;
    private Boolean showSidebarLong = true;
    private String bottomBannerText;

    @Lob
    @Column(columnDefinition = "TEXT")
    private String bottomBannerImageUrl;
    private Boolean showBottomBanner = true;
    private String defaultReporterName;

    public BrandSettings(String brandId, String siteName, String sidebarTopText, String sidebarLongText, String bottomBannerText, String defaultReporterName) {
        this.brandId = brandId;
        this.siteName = siteName;
        this.sidebarTopText = sidebarTopText;
        this.sidebarLongText = sidebarLongText;
        this.bottomBannerText = bottomBannerText != null ? bottomBannerText : "하단 띠 배너 광고";
        this.defaultReporterName = defaultReporterName;
    }

    public void update(String siteName, String logoImageUrl,
                       String sidebarTopText, String sidebarTopImageUrl, Boolean showSidebarTop,
                       String sidebarLongText, String sidebarLongImageUrl, Boolean showSidebarLong,
                       String bottomBannerText, String bottomBannerImageUrl, Boolean showBottomBanner,
                       String defaultReporterName) {
        if (siteName != null) this.siteName = siteName;
        if (logoImageUrl != null) this.logoImageUrl = logoImageUrl;
        if (sidebarTopText != null) this.sidebarTopText = sidebarTopText;
        if (sidebarTopImageUrl != null) this.sidebarTopImageUrl = sidebarTopImageUrl;
        if (showSidebarTop != null) this.showSidebarTop = showSidebarTop;
        if (sidebarLongText != null) this.sidebarLongText = sidebarLongText;
        if (sidebarLongImageUrl != null) this.sidebarLongImageUrl = sidebarLongImageUrl;
        if (showSidebarLong != null) this.showSidebarLong = showSidebarLong;
        if (bottomBannerText != null) this.bottomBannerText = bottomBannerText;
        if (bottomBannerImageUrl != null) this.bottomBannerImageUrl = bottomBannerImageUrl;
        if (showBottomBanner != null) this.showBottomBanner = showBottomBanner;
        if (defaultReporterName != null) this.defaultReporterName = defaultReporterName;
    }
}
