import { useState, useEffect } from "react";
import { getDisplaySettings, saveDisplaySettings } from "../utils/displaySettings";
import { getBrandConfig } from "../config/brandConfig";
import { useBrandSettings } from "../context/BrandSettingsContext";
import { authFetch } from "../api/http";

export default function AdminPanel() {
  // Display settings (editable form)
  const [display, setDisplay] = useState(getDisplaySettings());
  const [displayForm, setDisplayForm] = useState(getDisplaySettings());
  const [displayDirty, setDisplayDirty] = useState(false);

  // Brand / banner settings (API)
  const { settings: brand, save: saveBrandToApi } = useBrandSettings();
  const [brandBase] = useState(getBrandConfig());
  const [brandForm, setBrandForm] = useState({});
  const [brandDirty, setBrandDirty] = useState(false);
  const [uploading, setUploading] = useState(false);

  // 배너 3개씩 설정용 로컬 상태 (JSON 문자열로 저장되는 값 파싱)
  const [sidebarTopBanners, setSidebarTopBanners] = useState([]);
  const [sidebarLongBanners, setSidebarLongBanners] = useState([]);
  const [bottomBannerBanners, setBottomBannerBanners] = useState([]);

  // 이미지 정리 실행 상태
  const [cleanupRunning, setCleanupRunning] = useState(false);


  const runImageCleanup = async () => {
    if (!window.confirm("DB에 연결되지 않은 이미지 파일을 버킷에서 정리합니다.\n브랜드 배너/로고 등도 함께 고려되지만,\n실행 전 반드시 최신 백업을 권장합니다.\n계속하시겠습니까?")) {
      return;
    }
    setCleanupRunning(true);
    try {
      const res = await authFetch("/api/admin/cleanup-orphan-images", {
        method: "POST",
      });
      if (!res.ok) {
        throw new Error("정리 API 호출 실패");
      }
      const data = await res.json().catch(() => ({}));
      const deleted = data.deleted ?? 0;
      alert(`이미지 정리가 완료되었습니다.\n삭제된 객체: ${deleted}개`);
    } catch (e) {
      alert("이미지 정리 중 오류가 발생했습니다: " + (e.message || ""));
    } finally {
      setCleanupRunning(false);
    }
  };

  const handleDisplayFormChange = (key, value) => {
    setDisplayForm(prev => ({ ...prev, [key]: value }));
    setDisplayDirty(true);
  };

  const saveDisplayConfig = () => {
    setDisplay(displayForm);
    saveDisplaySettings(displayForm);
    setDisplayDirty(false);
    alert("표시 설정이 저장되었습니다.");
  };

  const handleBrandFormChange = (key, value) => {
    setBrandForm(prev => ({ ...prev, [key]: value }));
    setBrandDirty(true);
  };

  const saveBrandConfigLocal = async () => {
    try {
      await saveBrandToApi(brandForm);
      setBrandDirty(false);
      alert("브랜드 / 배너 설정이 저장되었습니다.");
    } catch (e) {
      alert("저장 실패: " + e.message);
    }
  };

  useEffect(() => {
    if (Object.keys(brand).length > 0) {
      setBrandForm(brand);
      // 기존 문자열 or JSON 문자열을 배열로 변환
      const parseBannerList = (raw, fallbackText) => {
        if (!raw) return [];
        if (Array.isArray(raw)) {
          return raw.map((b) => ({
            imageUrl: b.imageUrl || "",
            linkUrl: b.linkUrl || "",
            text: b.text || fallbackText || "",
            show: b.show !== false,
          }));
        }
        if (typeof raw === "string") {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              return parsed.map((b) => ({
                imageUrl: b.imageUrl || "",
                linkUrl: b.linkUrl || "",
                text: b.text || fallbackText || "",
                show: b.show !== false,
              }));
            }
          } catch {
            // 예전 방식: 이미지 URL 문자열 하나만 있을 때
            return [{
              imageUrl: raw,
              text: fallbackText || "",
              linkUrl: "",
              show: true,
            }];
          }
        }
        return [];
      };

      const ensureFive = (list, fallbackText) => {
        const arr = [...list];
        while (arr.length < 5) {
          arr.push({
            imageUrl: "",
            linkUrl: "",
            text: fallbackText || "",
            show: false,
          });
        }
        return arr.slice(0, 5);
      };

      setSidebarTopBanners(
        ensureFive(parseBannerList(brand.sidebarTopImageUrl, brand.sidebarTopText), brand.sidebarTopText)
      );
      setSidebarLongBanners(parseBannerList(brand.sidebarLongImageUrl, brand.sidebarLongText));
      setBottomBannerBanners(parseBannerList(brand.bottomBannerImageUrl, brand.bottomBannerText));
    }
  }, [brand]);

  const handleBannerImageUpload = async (fieldKey, file) => {
    if (!file) return;
    try {
      setUploading(true);
      const formData = new FormData();
      // 배너 위치에 따라 파일 이름에 키워드를 넣어준다
      let baseName = "banner";
      if (fieldKey === "logoImageUrl") baseName = "logo";
      else if (fieldKey === "sidebarTopImageUrl") baseName = "sidebar-top";
      else if (fieldKey === "sidebarLongImageUrl") baseName = "sidebar-long";
      else if (fieldKey === "bottomBannerImageUrl") baseName = "bottom-banner";

      const ext = file.name && file.name.includes(".") ? file.name.substring(file.name.lastIndexOf(".")) : "";
      const renamed = new File([file], `${baseName}${ext || ".png"}`, { type: file.type || "image/png" });

      formData.append("file", renamed);
      const res = await authFetch("/api/admin/brand-assets", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        throw new Error("업로드 실패");
      }
      const data = await res.json();
      const url = data.url;
      setBrandForm(prev => ({ ...prev, [fieldKey]: url }));
      setBrandDirty(true);
      alert("배너 이미지가 업로드되었습니다.");
    } catch (e) {
      alert("이미지 업로드 오류: " + e.message);
    } finally {
      setUploading(false);
    }
  };

  // 개별 배너 슬롯용 업로드 헬퍼
  const uploadMultiBannerImage = async (position, index, file) => {
    if (!file) return;
    try {
      setUploading(true);
      const formData = new FormData();
      const ext = file.name && file.name.includes(".") ? file.name.substring(file.name.lastIndexOf(".")) : "";
      const baseName = `${position}-${index + 1}`;
      const renamed = new File([file], `${baseName}${ext || ".png"}`, { type: file.type || "image/png" });
      formData.append("file", renamed);

      const res = await authFetch("/api/admin/brand-assets", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        throw new Error("업로드 실패");
      }
      const data = await res.json();
      const url = data.url;

      if (position === "sidebar-top") {
        setSidebarTopBanners(prev =>
          prev.map((b, i) => (i === index ? { ...b, imageUrl: url } : b))
        );
      } else if (position === "sidebar-long") {
        setSidebarLongBanners(prev =>
          prev.map((b, i) => (i === index ? { ...b, imageUrl: url } : b))
        );
      } else if (position === "bottom-banner") {
        setBottomBannerBanners(prev =>
          prev.map((b, i) => (i === index ? { ...b, imageUrl: url } : b))
        );
      }

      setBrandDirty(true);
      alert("배너 이미지가 업로드되었습니다.");
    } catch (e) {
      alert("이미지 업로드 오류: " + e.message);
    } finally {
      setUploading(false);
    }
  };

  // 개별 배너 이미지 삭제 헬퍼
  const deleteMultiBannerImage = async (position, index) => {
    try {
      let list = [];
      if (position === "sidebar-top") {
        list = sidebarTopBanners;
      } else if (position === "sidebar-long") {
        list = sidebarLongBanners;
      } else if (position === "bottom-banner") {
        list = bottomBannerBanners;
      }
      const target = list[index];
      const url = target?.imageUrl;

      if (!url) {
        // URL 이 없으면 프론트 상태만 비운다
        if (position === "sidebar-top") {
          setSidebarTopBanners(prev =>
            prev.map((b, i) => (i === index ? { ...b, imageUrl: "", show: false } : b))
          );
        } else if (position === "sidebar-long") {
          setSidebarLongBanners(prev =>
            prev.map((b, i) => (i === index ? { ...b, imageUrl: "", show: false } : b))
          );
        } else if (position === "bottom-banner") {
          setBottomBannerBanners(prev =>
            prev.map((b, i) => (i === index ? { ...b, imageUrl: "", show: false } : b))
          );
        }
        setBrandDirty(true);
        return;
      }

      if (!window.confirm("이 배너 이미지를 삭제하시겠습니까?")) return;

      await authFetch("/api/admin/brand-assets?url=" + encodeURIComponent(url), {
        method: "DELETE",
      }).catch(() => {});

      if (position === "sidebar-top") {
        setSidebarTopBanners(prev =>
          prev.map((b, i) => (i === index ? { ...b, imageUrl: "", show: false } : b))
        );
      } else if (position === "sidebar-long") {
        setSidebarLongBanners(prev =>
          prev.map((b, i) => (i === index ? { ...b, imageUrl: "", show: false } : b))
        );
      } else if (position === "bottom-banner") {
        setBottomBannerBanners(prev =>
          prev.map((b, i) => (i === index ? { ...b, imageUrl: "", show: false } : b))
        );
      }
      setBrandDirty(true);
      alert("배너 이미지가 삭제되었습니다.");
    } catch (e) {
      alert("이미지 삭제 오류: " + (e.message || ""));
    }
  };


  return (
    <div className="max-w-5xl mx-auto bg-white p-8 rounded-2xl border border-gray-200 shadow-sm space-y-10">
      <h2 className="text-2xl font-black text-gray-900 border-b pb-4">
        관리자 설정
      </h2>

      {/* ===== 표시 설정 ===== */}
      <section>
        <h3 className="text-lg font-bold text-gray-800 mb-2">기사 표시 설정</h3>
        <p className="text-sm text-gray-500 mb-4">
          기사 상세 페이지의 글꼴, 글씨 크기, 이미지 크기, 줄간격을 조절합니다.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">글꼴</label>
            <select
              value={displayForm.fontFamily}
              onChange={(e) => handleDisplayFormChange("fontFamily", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="inherit">기본</option>
              <option value="'Noto Sans KR', sans-serif">Noto Sans KR</option>
              <option value="'Nanum Myeongjo', serif">나눔명조</option>
              <option value="Georgia, serif">Georgia</option>
              <option value="'Malgun Gothic', sans-serif">맑은 고딕</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">글씨 크기</label>
            <select
              value={displayForm.fontSize}
              onChange={(e) => handleDisplayFormChange("fontSize", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="0.625rem">최소 (10px)</option>
              <option value="0.75rem">최소 (12px)</option>
              <option value="0.875rem">작게 (14px)</option>
              <option value="1rem">보통 (16px)</option>
              <option value="1.125rem">기본 (18px)</option>
              <option value="1.25rem">크게 (20px)</option>
              <option value="1.5rem">아주 크게 (24px)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">이미지 최대 너비</label>
            <select
              value={displayForm.imageMaxWidth}
              onChange={(e) => handleDisplayFormChange("imageMaxWidth", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="100%">전체 (100%)</option>
              <option value="80%">80%</option>
              <option value="1000px">1000px</option>
              <option value="900px">900px</option>
              <option value="800px">800px</option>
              <option value="700px">700px</option>
              <option value="600px">600px</option>
              <option value="500px">500px</option>
              <option value="400px">400px</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">줄간격</label>
            <select
              value={displayForm.lineHeight}
              onChange={(e) => handleDisplayFormChange("lineHeight", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="1.4">좁게 (1.4)</option>
              <option value="1.6">보통 (1.6)</option>
              <option value="1.8">기본 (1.8)</option>
              <option value="2">넓게 (2)</option>
              <option value="2.2">아주 넓게 (2.2)</option>
            </select>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button
            onClick={saveDisplayConfig}
            disabled={!displayDirty}
            className={`px-5 py-2 rounded-lg font-bold text-white ${displayDirty ? "bg-[var(--brand-600)] hover:bg-[var(--brand-700)]" : "bg-gray-300 cursor-not-allowed"}`}
          >
            표시 설정 저장
          </button>
          {displayDirty && <span className="text-sm text-orange-600 self-center">✱ 변경사항이 있습니다.</span>}
        </div>
      </section>

      {/* ===== 이미지 정리 ===== */}
      <section>
        <h3 className="text-lg font-bold text-gray-800 mb-2">이미지 정리</h3>
        <p className="text-sm text-gray-500 mb-3">
          DB(기사 이미지 및 브랜드 설정)에 연결되어 있지 않은 S3/MinIO 객체를 찾아 일괄 삭제합니다.
          주기적으로 실행하면 더미 데이터로 인한 저장소 낭비를 줄일 수 있습니다.
        </p>
        <button
          type="button"
          onClick={runImageCleanup}
          disabled={cleanupRunning}
          className={`px-5 py-2 rounded-lg font-bold text-white ${
            cleanupRunning
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-red-600 hover:bg-red-700"
          }`}
        >
          {cleanupRunning ? "이미지 정리 중..." : "이미지 정리 실행"}
        </button>
        <p className="mt-2 text-xs text-gray-400">
          * 실행 전 데이터베이스/S3 백업을 권장합니다. 현재 연결된 기사/배너에서 사용 중인 URL은 삭제되지 않습니다.
        </p>
      </section>

      {/* ===== 브랜드 / 배너 설정 ===== */}
      <section>
        <h3 className="text-lg font-bold text-gray-800 mb-2">브랜드 / 배너 설정</h3>
        <p className="text-sm text-gray-500 mb-4">
          현재 설정은 브랜드(사이트)별로 서버에 저장됩니다. 로고 및 광고 배너를 편집합니다.
        </p>
        <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-4">
          <div className="text-xs text-gray-500 mb-2">
            현재 브랜드: <span className="font-semibold text-gray-700">{brandBase.siteName} ({brandBase.id})</span>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">사이트 이름 (헤더 배너)</label>
            <input
              type="text"
              value={brandForm.siteName ?? brand?.siteName ?? ""}
              onChange={(e) => handleBrandFormChange("siteName", e.target.value)}
              placeholder={brandBase.siteName}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">기본 기자명</label>
            <input
              type="text"
              value={brandForm.defaultReporterName ?? brand?.defaultReporterName ?? "기자"}
              onChange={(e) => handleBrandFormChange("defaultReporterName", e.target.value)}
              placeholder="예: 홍길동"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
            <p className="text-xs text-gray-500 mt-1">새 기사 작성 시 기본으로 들어갈 기자명을 설정합니다.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">헤더 로고 이미지</label>
            <p className="text-xs text-gray-500 mb-2">로고와 사이트 이름이 함께 있는 이미지를 올리세요. 업로드 시 기존 아이콘·텍스트 대신 이 이미지만 표시됩니다.</p>
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={brandForm.logoImageUrl || ""}
                onChange={(e) => handleBrandFormChange("logoImageUrl", e.target.value)}
                placeholder="https://example.com/logo.png"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-xs"
              />
              <input
                type="file"
                accept="image/*"
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleBannerImageUpload("logoImageUrl", file);
                    e.target.value = "";
                  }
                }}
                className="text-xs text-gray-600 file:mr-2 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:text-white file:text-xs disabled:opacity-50 file:bg-[var(--brand-600)] hover:file:bg-[var(--brand-700)]"
              />
            </div>
            {brandForm.logoImageUrl && (
              <div className="mt-2 flex items-center gap-2">
                <div className="w-12 h-10 bg-gray-100 rounded overflow-hidden flex items-center justify-center">
                  <img src={brandForm.logoImageUrl} alt="로고 미리보기" className="max-h-full max-w-full object-contain" />
                </div>
                <button
                  type="button"
                  onClick={() => handleBrandFormChange("logoImageUrl", "")}
                  className="text-xs px-2 py-1 border border-gray-300 rounded text-red-600 hover:bg-red-50"
                >
                  제거
                </button>
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">상단 광고 배너 문구</label>
              <input
                type="text"
                value={brandForm.sidebarTopText ?? brand?.sidebarTopText ?? ""}
                onChange={(e) => handleBrandFormChange("sidebarTopText", e.target.value)}
                placeholder={brandBase.adTexts.sidebarTop}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
              <div className="mt-2 flex items-center gap-2">
                <input
                  id="show-sidebar-top"
                  type="checkbox"
                  checked={brandForm.showSidebarTop ?? brand?.showSidebarTop ?? true}
                  onChange={(e) => handleBrandFormChange("showSidebarTop", e.target.checked)}
                  className="h-4 w-4 border-gray-300 rounded text-[var(--brand-600)]"
                />
                <label htmlFor="show-sidebar-top" className="text-xs text-gray-700">이 상단 배너를 화면에 표시</label>
              </div>
              {/* 상단 배너: 5개 고정 슬롯 */}
              <div className="mt-4 space-y-3">
                <div className="text-xs font-semibold text-gray-600">상단 광고 배너 (최대 5개)</div>
                {sidebarTopBanners.map((b, idx) => (
                  <div key={idx} className="p-3 bg-white border border-gray-200 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-700">상단 배너 {idx + 1}</span>
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-1 text-[11px] text-gray-600">
                          <input
                            type="checkbox"
                            checked={b.show !== false}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setSidebarTopBanners(prev =>
                                prev.map((item, i) => (i === idx ? { ...item, show: checked } : item))
                              );
                              setBrandDirty(true);
                            }}
                            className="h-3 w-3 border-gray-300 rounded text-[var(--brand-600)]"
                          />
                          표시
                        </label>
                      </div>
                    </div>
                    {b.imageUrl && (
                      <div className="w-full flex items-center gap-3">
                        <div className="flex-1 h-16 bg-white rounded overflow-hidden flex items-center justify-center border border-gray-200">
                          <img
                            src={b.imageUrl}
                            alt={`상단 배너 ${idx + 1}`}
                            className="max-h-full max-w-full object-contain"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => deleteMultiBannerImage("sidebar-top", idx)}
                          className="text-[11px] px-2 py-1 border border-gray-300 rounded text-red-600 hover:bg-red-50"
                        >
                          이미지 삭제
                        </button>
                      </div>
                    )}
                    <input
                      type="text"
                      value={b.imageUrl || ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        setSidebarTopBanners(prev =>
                          prev.map((item, i) => (i === idx ? { ...item, imageUrl: value } : item))
                        );
                        setBrandDirty(true);
                      }}
                      placeholder="이미지 URL"
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs"
                    />
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploading}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          uploadMultiBannerImage("sidebar-top", idx, file);
                          e.target.value = "";
                        }
                      }}
                      className="block w-full text-xs text-gray-600 file:mr-2 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:text-white file:text-xs disabled:opacity-50 file:bg-[var(--brand-600)] hover:file:bg-[var(--brand-700)]"
                    />
                    <input
                      type="text"
                      value={b.linkUrl || ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        setSidebarTopBanners(prev =>
                          prev.map((item, i) => (i === idx ? { ...item, linkUrl: value } : item))
                        );
                        setBrandDirty(true);
                      }}
                      placeholder="배너 클릭 시 이동할 링크 URL (예: https://example.com)"
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs"
                    />
                  </div>
                ))}
              </div>
            </div>
            {false && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">세로 긴 광고 배너 문구</label>
              <input
                type="text"
                value={brandForm.sidebarLongText ?? brand?.sidebarLongText ?? ""}
                onChange={(e) => handleBrandFormChange("sidebarLongText", e.target.value)}
                placeholder={brandBase.adTexts.sidebarLong}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
              <div className="mt-2 flex items-center gap-2">
                <input
                  id="show-sidebar-long"
                  type="checkbox"
                  checked={brandForm.showSidebarLong ?? brand?.showSidebarLong ?? true}
                  onChange={(e) => handleBrandFormChange("showSidebarLong", e.target.checked)}
                  className="h-4 w-4 border-gray-300 rounded text-[var(--brand-600)]"
                />
                <label htmlFor="show-sidebar-long" className="text-xs text-gray-700">이 세로형 배너를 화면에 표시</label>
              </div>
              <label className="block text-xs font-medium text-gray-500 mt-2 mb-1">세로 긴 광고 이미지 URL (선택)</label>
              <input
                type="text"
                value={brandForm.sidebarLongImageUrl ?? ""}
                onChange={(e) => handleBrandFormChange("sidebarLongImageUrl", e.target.value)}
                placeholder="https://example.com/banner-long.jpg"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
              />
              <div className="mt-2">
                <label className="block text-xs font-medium text-gray-500 mb-1">세로 긴 광고 이미지 업로드</label>
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleBannerImageUpload("sidebarLongImageUrl", file);
                      e.target.value = "";
                    }
                  }}
                  className="block w-full text-xs text-gray-600 file:mr-2 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:text-white file:text-xs disabled:opacity-50 file:bg-[var(--brand-600)] hover:file:bg-[var(--brand-700)]"
                />
              </div>
              {/* 세로형 배너: 여러 개 추가/삭제 가능 */}
              <div className="mt-4 space-y-3">
                <div className="text-xs font-semibold text-gray-600">세로 긴 광고 배너 (여러 개)</div>
                {sidebarLongBanners.map((b, idx) => (
                  <div key={idx} className="p-3 bg-white border border-gray-200 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-700">세로 배너 {idx + 1}</span>
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-1 text-[11px] text-gray-600">
                          <input
                            type="checkbox"
                            checked={b.show !== false}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setSidebarLongBanners(prev =>
                                prev.map((item, i) => (i === idx ? { ...item, show: checked } : item))
                              );
                              setBrandDirty(true);
                            }}
                            className="h-3 w-3 border-gray-300 rounded text-[var(--brand-600)]"
                          />
                          표시
                        </label>
                        <button
                          type="button"
                          className="text-[11px] text-red-600 hover:underline"
                          onClick={() => {
                            setSidebarLongBanners(prev => prev.filter((_, i) => i !== idx));
                            setBrandDirty(true);
                          }}
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                    {b.imageUrl && (
                      <div className="w-full h-20 bg-gray-100 rounded overflow-hidden flex items-center justify-center">
                        <img
                          src={b.imageUrl}
                          alt={`세로 배너 ${idx + 1}`}
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                    )}
                    <input
                      type="text"
                      value={b.imageUrl || ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        setSidebarLongBanners(prev =>
                          prev.map((item, i) => (i === idx ? { ...item, imageUrl: value } : item))
                        );
                        setBrandDirty(true);
                      }}
                      placeholder="이미지 URL"
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs"
                    />
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploading}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          uploadMultiBannerImage("sidebar-long", idx, file);
                          e.target.value = "";
                        }
                      }}
                      className="block w-full text-xs text-gray-600 file:mr-2 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:text-white file:text-xs disabled:opacity-50 file:bg-[var(--brand-600)] hover:file:bg-[var(--brand-700)]"
                    />
                    <input
                      type="text"
                      value={b.linkUrl || ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        setSidebarLongBanners(prev =>
                          prev.map((item, i) => (i === idx ? { ...item, linkUrl: value } : item))
                        );
                        setBrandDirty(true);
                      }}
                      placeholder="배너 클릭 시 이동할 링크 URL (예: https://example.com)"
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs"
                    />
                  </div>
                ))}
                <button
                  type="button"
                  className="px-3 py-1.5 border border-dashed border-gray-300 rounded-lg text-xs text-gray-600 hover:bg-gray-50"
                  onClick={() => {
                    setSidebarLongBanners(prev => [
                      ...prev,
                      { imageUrl: "", linkUrl: "", text: brandForm.sidebarLongText || "", show: true },
                    ]);
                    setBrandDirty(true);
                  }}
                >
                  + 세로형 배너 추가
                </button>
              </div>
            </div>
            )}
          </div>
          
          {false && (
          <div className="mt-6 border-t border-gray-200 pt-4 space-y-3">
            <h4 className="text-sm font-bold text-gray-800">하단 띠 배너 설정</h4>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">하단 띠 배너 문구</label>
              <input
                type="text"
                value={brandForm.bottomBannerText ?? brand?.bottomBannerText ?? ""}
                onChange={(e) => handleBrandFormChange("bottomBannerText", e.target.value)}
                placeholder="하단 띠 배너 광고"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                id="show-bottom-banner"
                type="checkbox"
                checked={brandForm.showBottomBanner ?? brand?.showBottomBanner ?? true}
                onChange={(e) => handleBrandFormChange("showBottomBanner", e.target.checked)}
                className="h-4 w-4 border-gray-300 rounded text-[var(--brand-600)]"
              />
              <label htmlFor="show-bottom-banner" className="text-xs text-gray-700">이 하단 띠 배너를 화면에 표시</label>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">하단 띠 배너 이미지 URL (선택)</label>
              <input
                type="text"
                value={brandForm.bottomBannerImageUrl ?? ""}
                onChange={(e) => handleBrandFormChange("bottomBannerImageUrl", e.target.value)}
                placeholder="https://example.com/banner-bottom.jpg"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
              />
            </div>
            {/* 하단 띠 배너: 여러 개 추가/삭제 가능 */}
            <div className="mt-4 space-y-3">
              <div className="text-xs font-semibold text-gray-600">하단 띠 배너 (여러 개)</div>
              {bottomBannerBanners.map((b, idx) => (
                <div key={idx} className="p-3 bg-white border border-gray-200 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-700">하단 배너 {idx + 1}</span>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1 text-[11px] text-gray-600">
                        <input
                          type="checkbox"
                          checked={b.show !== false}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setBottomBannerBanners(prev =>
                              prev.map((item, i) => (i === idx ? { ...item, show: checked } : item))
                            );
                            setBrandDirty(true);
                          }}
                          className="h-3 w-3 border-gray-300 rounded text-[var(--brand-600)]"
                        />
                        표시
                      </label>
                      <button
                        type="button"
                        className="text-[11px] text-red-600 hover:underline"
                        onClick={() => {
                          setBottomBannerBanners(prev => prev.filter((_, i) => i !== idx));
                          setBrandDirty(true);
                        }}
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                  {b.imageUrl && (
                    <div className="w-full h-16 bg-gray-100 rounded overflow-hidden flex items-center justify-center">
                      <img
                        src={b.imageUrl}
                        alt={`하단 배너 ${idx + 1}`}
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                  )}
                  <input
                    type="text"
                    value={b.imageUrl || ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      setBottomBannerBanners(prev =>
                        prev.map((item, i) => (i === idx ? { ...item, imageUrl: value } : item))
                      );
                      setBrandDirty(true);
                    }}
                    placeholder="이미지 URL"
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs"
                  />
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        uploadMultiBannerImage("bottom-banner", idx, file);
                        e.target.value = "";
                      }
                    }}
                    className="block w-full text-xs text-gray-600 file:mr-2 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:text-white file:text-xs disabled:opacity-50 file:bg-[var(--brand-600)] hover:file:bg-[var(--brand-700)]"
                  />
                  <input
                    type="text"
                    value={b.linkUrl || ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      setBottomBannerBanners(prev =>
                        prev.map((item, i) => (i === idx ? { ...item, linkUrl: value } : item))
                      );
                      setBrandDirty(true);
                    }}
                    placeholder="배너 클릭 시 이동할 링크 URL (예: https://example.com)"
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs"
                  />
                </div>
              ))}
              <button
                type="button"
                className="px-3 py-1.5 border border-dashed border-gray-300 rounded-lg text-xs text-gray-600 hover:bg-gray-50"
                onClick={() => {
                  setBottomBannerBanners(prev => [
                    ...prev,
                    { imageUrl: "", linkUrl: "", text: brandForm.bottomBannerText || "", show: true },
                  ]);
                  setBrandDirty(true);
                }}
              >
                + 하단 배너 추가
              </button>
            </div>
          </div>
          )}

          {/* 현재 사용 중인 배너 이미지 리스트 (로고/단일 배너 미리보기) - 필요 시 다시 활성화 */}
          {false && (
          <div className="mt-6 border-t border-gray-200 pt-4">
            <h4 className="text-sm font-bold text-gray-800 mb-2">배너 / 로고 이미지 목록</h4>
            <p className="text-xs text-gray-500 mb-3">현재 각 배너 및 로고에 설정된 이미지 목록입니다.</p>
            <div className="space-y-3">
              {/* 헤더 로고 */}
              {brandForm.logoImageUrl && (
                <div className="flex items-center gap-3 p-2 bg-white rounded-lg border border-gray-200">
                  <div className="w-16 h-10 bg-gray-100 rounded overflow-hidden flex items-center justify-center">
                    <img src={brandForm.logoImageUrl} alt="헤더 로고" className="max-h-full max-w-full object-contain" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-gray-800">헤더 로고</div>
                    <div className="text-[10px] text-gray-500 truncate">{brandForm.logoImageUrl}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleBrandFormChange("logoImageUrl", "")}
                    className="text-xs px-2 py-1 border border-gray-300 rounded text-red-600 hover:bg-red-50"
                  >
                    제거
                  </button>
                </div>
              )}
              {/* 상단 배너 */}
              {brandForm.sidebarTopImageUrl && (
                <div className="flex items-center gap-3 p-2 bg-white rounded-lg border border-gray-200">
                  <div className="w-16 h-10 bg-gray-100 rounded overflow-hidden flex items-center justify-center">
                    <img src={brandForm.sidebarTopImageUrl} alt="상단 배너" className="max-h-full max-w-full object-contain" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-gray-800">상단 광고 배너</div>
                    <div className="text-[10px] text-gray-500 truncate">{brandForm.sidebarTopImageUrl}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleBrandFormChange("sidebarTopImageUrl", "")}
                    className="text-xs px-2 py-1 border border-gray-300 rounded text-red-600 hover:bg-red-50"
                  >
                    제거
                  </button>
                </div>
              )}

              {/* 세로 배너 */}
              {brandForm.sidebarLongImageUrl && (
                <div className="flex items-center gap-3 p-2 bg-white rounded-lg border border-gray-200">
                  <div className="w-16 h-10 bg-gray-100 rounded overflow-hidden flex items-center justify-center">
                    <img src={brandForm.sidebarLongImageUrl} alt="세로 배너" className="max-h-full max-w-full object-contain" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-gray-800">세로 긴 광고 배너</div>
                    <div className="text-[10px] text-gray-500 truncate">{brandForm.sidebarLongImageUrl}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleBrandFormChange("sidebarLongImageUrl", "")}
                    className="text-xs px-2 py-1 border border-gray-300 rounded text-red-600 hover:bg-red-50"
                  >
                    제거
                  </button>
                </div>
              )}

              {/* 하단 띠 배너 */}
              {brandForm.bottomBannerImageUrl && (
                <div className="flex items-center gap-3 p-2 bg-white rounded-lg border border-gray-200">
                  <div className="w-16 h-10 bg-gray-100 rounded overflow-hidden flex items-center justify-center">
                    <img src={brandForm.bottomBannerImageUrl} alt="하단 띠 배너" className="max-h-full max-w-full object-contain" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-gray-800">하단 띠 배너</div>
                    <div className="text-[10px] text-gray-500 truncate">{brandForm.bottomBannerImageUrl}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleBrandFormChange("bottomBannerImageUrl", "")}
                    className="text-xs px-2 py-1 border border-gray-300 rounded text-red-600 hover:bg-red-50"
                  >
                    제거
                  </button>
                </div>
              )}

              {!brandForm.logoImageUrl && !brandForm.sidebarTopImageUrl && !brandForm.sidebarLongImageUrl && !brandForm.bottomBannerImageUrl && (
                <div className="text-xs text-gray-400">등록된 배너/로고 이미지가 없습니다.</div>
              )}
            </div>
          </div>
          )}
          <div className="mt-2 flex gap-2">
            <button
              onClick={async () => {
                // 배너 리스트를 JSON 문자열로 변환해서 기존 필드에 저장
                const clean = (list) =>
                  list
                    .filter((b) => b && (b.imageUrl || b.linkUrl || b.text))
                    .map((b) => ({
                      imageUrl: b.imageUrl || "",
                      linkUrl: b.linkUrl || "",
                      text: b.text || "",
                      show: b.show !== false,
                    }));

                const payload = {
                  ...brandForm,
                  sidebarTopImageUrl: JSON.stringify(clean(sidebarTopBanners)),
                  sidebarLongImageUrl: JSON.stringify(clean(sidebarLongBanners)),
                  bottomBannerImageUrl: JSON.stringify(clean(bottomBannerBanners)),
                };

                try {
                  await saveBrandToApi(payload);
                  setBrandDirty(false);
                  alert("브랜드 / 배너 설정이 저장되었습니다.");
                } catch (e) {
                  alert("저장 실패: " + e.message);
                }
              }}
              disabled={!brandDirty}
              className={`px-5 py-2 rounded-lg font-bold text-white ${brandDirty ? "bg-[var(--brand-600)] hover:bg-[var(--brand-700)]" : "bg-gray-300 cursor-not-allowed"}`}
            >
              브랜드 / 배너 설정 저장
            </button>
            {brandDirty && <span className="text-sm text-orange-600 self-center">✱ 변경사항이 있습니다.</span>}
          </div>
        </div>
      </section>
    </div>
  );
}