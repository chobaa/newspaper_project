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
    private String sidebarTopImageUrl;
    private String sidebarLongText;
    private String sidebarLongImageUrl;
    private Boolean showSidebarTop = true;
    private Boolean showSidebarLong = true;
    private String bottomBannerText;
    private String bottomBannerImageUrl;
    private Boolean showBottomBanner = true;

    public BrandSettings(String brandId, String siteName, String sidebarTopText, String sidebarLongText, String bottomBannerText) {
        this.brandId = brandId;
        this.siteName = siteName;
        this.sidebarTopText = sidebarTopText;
        this.sidebarLongText = sidebarLongText;
        this.bottomBannerText = bottomBannerText != null ? bottomBannerText : "하단 띠 배너 광고";
    }

    public void update(String siteName, String logoImageUrl,
                       String sidebarTopText, String sidebarTopImageUrl, Boolean showSidebarTop,
                       String sidebarLongText, String sidebarLongImageUrl, Boolean showSidebarLong,
                       String bottomBannerText, String bottomBannerImageUrl, Boolean showBottomBanner) {
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
    }
}
