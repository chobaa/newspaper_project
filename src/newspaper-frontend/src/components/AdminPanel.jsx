import { useState, useEffect } from "react";
import { getDisplaySettings, saveDisplaySettings } from "../utils/displaySettings";
import { getBrandConfig } from "../config/brandConfig";
import { getBrandSettings, saveBrandSettings } from "../utils/brandSettings";

export default function AdminPanel() {
  const [config, setConfig] = useState({ allowedSenders: [], modificationKeywords: [] });
  const [senderInput, setSenderInput] = useState("");
  const [keywordInput, setKeywordInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch state
  const [fetching, setFetching] = useState(false);

  // Schedule config (editable form state)
  const [scheduleConfig, setScheduleConfig] = useState(null);
  const [scheduleForm, setScheduleForm] = useState(null);
  const [scheduleLoading, setScheduleLoading] = useState(true);
  const [scheduleDirty, setScheduleDirty] = useState(false);

  // Mail process logs
  const [mailLogs, setMailLogs] = useState([]);
  const [mailLogsLoading, setMailLogsLoading] = useState(false);

  // Display settings (editable form)
  const [display, setDisplay] = useState(getDisplaySettings());
  const [displayForm, setDisplayForm] = useState(getDisplaySettings());
  const [displayDirty, setDisplayDirty] = useState(false);

  // Brand / banner settings (per brand, localStorage)
  const [brandBase] = useState(getBrandConfig());
  const [brand, setBrand] = useState(getBrandSettings());
  const [brandForm, setBrandForm] = useState(getBrandSettings());
  const [brandDirty, setBrandDirty] = useState(false);
  const [uploading, setUploading] = useState(false);

  // AI summary loading state per log
  const [summaryLoading, setSummaryLoading] = useState({});

  const fetchConfig = async () => {
    try {
      setError(null);
      const res = await fetch("/api/admin/agent-config");
      if (!res.ok) throw new Error("설정을 불러오지 못했습니다.");
      const data = await res.json();
      setConfig({
        allowedSenders: data.allowedSenders || [],
        modificationKeywords: data.modificationKeywords || [],
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchScheduleConfig = async () => {
    try {
      const res = await fetch("/api/admin/schedule-config");
      if (res.ok) {
        const data = await res.json();
        setScheduleConfig(data);
        setScheduleForm(data);
        setScheduleDirty(false);
      }
    } catch (e) {
      console.error("Schedule config load failed:", e);
    } finally {
      setScheduleLoading(false);
    }
  };

  const saveScheduleConfig = async () => {
    try {
      const res = await fetch("/api/admin/schedule-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(scheduleForm),
      });
      if (res.ok) {
        const data = await res.json();
        setScheduleConfig(data);
        setScheduleForm(data);
        setScheduleDirty(false);
        alert("스케줄 설정이 저장되었습니다.");
      }
    } catch (e) {
      alert("스케줄 설정 저장 실패: " + e.message);
    }
  };

  const handleScheduleChange = (key, value) => {
    setScheduleForm(prev => ({ ...prev, [key]: value }));
    setScheduleDirty(true);
  };

  const fetchMailLogs = async () => {
    try {
      setMailLogsLoading(true);
      const res = await fetch("/api/admin/mail-process-logs?limit=50");
      if (res.ok) {
        const data = await res.json();
        setMailLogs(data);
      }
    } catch (e) {
      console.error("Mail logs load failed:", e);
    } finally {
      setMailLogsLoading(false);
    }
  };

  const clearMailLogs = async () => {
    if (!window.confirm("메일 처리 로그를 모두 지우시겠습니까?")) return;
    try {
      await fetch("/api/admin/mail-process-logs", { method: "DELETE" });
      setMailLogs([]);
    } catch (e) {
      alert("로그 삭제 실패: " + e.message);
    }
  };

  const runFetchNow = async () => {
    setFetching(true);
    try {
      const res = await fetch("/api/agent/fetch", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      await fetchMailLogs();
      await fetchScheduleConfig();

      const message = `완료!\n총 처리: ${data.totalProcessed || 0}개\n성공: ${data.successCount || 0}개\n실패: ${data.failureCount || 0}개`;
      alert(message);
    } catch (e) {
      alert("실행 중 오류: " + e.message);
    } finally {
      setFetching(false);
    }
  };

  const runAiSummary = async (logId) => {
    setSummaryLoading(prev => ({ ...prev, [logId]: true }));
    try {
      const imgWidth = encodeURIComponent(displayForm.imageMaxWidth || "400px");
      const res = await fetch("/api/agent/ai-summary/" + logId + "?imageMaxWidth=" + imgWidth, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        alert("AI 기사 생성 완료!\n제목: " + (data.title || ""));
        await fetchMailLogs();
      } else {
        const errData = await res.json().catch(() => ({}));
        alert("AI 요약 실패: " + (errData.error || "알 수 없는 오류"));
      }
    } catch (e) {
      alert("AI 요약 오류: " + e.message);
    } finally {
      setSummaryLoading(prev => ({ ...prev, [logId]: false }));
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

  const saveBrandConfigLocal = () => {
    setBrand(brandForm);
    saveBrandSettings(brandForm);
    setBrandDirty(false);
    alert("브랜드 / 배너 설정이 저장되었습니다.");
  };

  const handleBannerImageUpload = async (fieldKey, file) => {
    if (!file) return;
    try {
      setUploading(true);
      const formData = new FormData();
      // 배너 위치에 따라 파일 이름에 키워드를 넣어준다
      let baseName = "banner";
      if (fieldKey === "sidebarTopImageUrl") baseName = "sidebar-top";
      else if (fieldKey === "sidebarLongImageUrl") baseName = "sidebar-long";
      else if (fieldKey === "bottomBannerImageUrl") baseName = "bottom-banner";

      const ext = file.name && file.name.includes(".") ? file.name.substring(file.name.lastIndexOf(".")) : "";
      const renamed = new File([file], `${baseName}${ext || ".png"}`, { type: file.type || "image/png" });

      formData.append("file", renamed);
      const res = await fetch("/api/admin/brand-assets", {
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

  useEffect(() => {
    fetchConfig();
  }, []);

  const addSender = async (e) => {
    e.preventDefault();
    const email = senderInput.trim();
    if (!email) return;
    try {
      const res = await fetch("/api/admin/agent-config/senders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error("추가 실패");
      setSenderInput("");
      await fetchConfig();
    } catch (e) {
      alert(e.message);
    }
  };

  const removeSender = async (id) => {
    if (!window.confirm("삭제하시겠습니까?")) return;
    try {
      await fetch("/api/admin/agent-config/senders/" + id, { method: "DELETE" });
      await fetchConfig();
    } catch (e) {
      alert(e.message);
    }
  };

  const addKeyword = async (e) => {
    e.preventDefault();
    const keyword = keywordInput.trim();
    if (!keyword) return;
    try {
      const res = await fetch("/api/admin/agent-config/modification-keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword }),
      });
      if (!res.ok) throw new Error("추가 실패");
      setKeywordInput("");
      await fetchConfig();
    } catch (e) {
      alert(e.message);
    }
  };

  const removeKeyword = async (id) => {
    if (!window.confirm("삭제하시겠습니까?")) return;
    try {
      await fetch("/api/admin/agent-config/modification-keywords/" + id, { method: "DELETE" });
      await fetchConfig();
    } catch (e) {
      alert(e.message);
    }
  };

  if (loading) return <div className="p-8 text-gray-500">로딩 중...</div>;
  if (error) return <div className="p-8 text-red-600">{error}</div>;

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
            className={`px-5 py-2 rounded-lg font-bold text-white ${displayDirty ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-300 cursor-not-allowed"}`}
          >
            표시 설정 저장
          </button>
          {displayDirty && <span className="text-sm text-orange-600 self-center">✱ 변경사항이 있습니다.</span>}
        </div>
      </section>

      {/* ===== 브랜드 / 배너 설정 ===== */}
      <section>
        <h3 className="text-lg font-bold text-gray-800 mb-2">브랜드 / 배너 설정</h3>
        <p className="text-sm text-gray-500 mb-4">
          현재 설정은 브랜드(사이트)별로 로컬에 저장됩니다. 목소리 및 광고 배너를 편집합니다.
        </p>
        <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-4">
          <div className="text-xs text-gray-500 mb-2">
            현재 브랜드: <span className="font-semibold text-gray-700">{brandBase.siteName} ({brandBase.id})</span>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">사이트 이름 (헤더 배너)</label>
            <input
              type="text"
              value={brandForm.siteName}
              onChange={(e) => handleBrandFormChange("siteName", e.target.value)}
              placeholder={brandBase.siteName}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">상단 광고 배너 문구</label>
              <input
                type="text"
                value={brandForm.sidebarTopText}
                onChange={(e) => handleBrandFormChange("sidebarTopText", e.target.value)}
                placeholder={brandBase.adTexts.sidebarTop}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
              <div className="mt-2 flex items-center gap-2">
                <input
                  id="show-sidebar-top"
                  type="checkbox"
                  checked={brandForm.showSidebarTop}
                  onChange={(e) => handleBrandFormChange("showSidebarTop", e.target.checked)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                />
                <label htmlFor="show-sidebar-top" className="text-xs text-gray-700">이 상단 배너를 화면에 표시</label>
              </div>
              <label className="block text-xs font-medium text-gray-500 mt-2 mb-1">상단 광고 이미지 URL (선택)</label>
              <input
                type="text"
                value={brandForm.sidebarTopImageUrl}
                onChange={(e) => handleBrandFormChange("sidebarTopImageUrl", e.target.value)}
                placeholder="https://example.com/banner-top.jpg"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
              />
              <div className="mt-2">
                <label className="block text-xs font-medium text-gray-500 mb-1">상단 광고 이미지 업로드</label>
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleBannerImageUpload("sidebarTopImageUrl", file);
                      e.target.value = "";
                    }
                  }}
                  className="block w-full text-xs text-gray-600 file:mr-2 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white file:text-xs hover:file:bg-blue-700 disabled:opacity-50"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">세로 긴 광고 배너 문구</label>
              <input
                type="text"
                value={brandForm.sidebarLongText}
                onChange={(e) => handleBrandFormChange("sidebarLongText", e.target.value)}
                placeholder={brandBase.adTexts.sidebarLong}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
              <div className="mt-2 flex items-center gap-2">
                <input
                  id="show-sidebar-long"
                  type="checkbox"
                  checked={brandForm.showSidebarLong}
                  onChange={(e) => handleBrandFormChange("showSidebarLong", e.target.checked)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                />
                <label htmlFor="show-sidebar-long" className="text-xs text-gray-700">이 세로형 배너를 화면에 표시</label>
              </div>
              <label className="block text-xs font-medium text-gray-500 mt-2 mb-1">세로 긴 광고 이미지 URL (선택)</label>
              <input
                type="text"
                value={brandForm.sidebarLongImageUrl}
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
                  className="block w-full text-xs text-gray-600 file:mr-2 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white file:text-xs hover:file:bg-blue-700 disabled:opacity-50"
                />
              </div>
            </div>
          </div>

          <div className="mt-6 border-t border-gray-200 pt-4 space-y-3">
            <h4 className="text-sm font-bold text-gray-800">하단 띠 배너 설정</h4>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">하단 띠 배너 문구</label>
              <input
                type="text"
                value={brandForm.bottomBannerText}
                onChange={(e) => handleBrandFormChange("bottomBannerText", e.target.value)}
                placeholder="하단 띠 배너 광고"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                id="show-bottom-banner"
                type="checkbox"
                checked={brandForm.showBottomBanner}
                onChange={(e) => handleBrandFormChange("showBottomBanner", e.target.checked)}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded"
              />
              <label htmlFor="show-bottom-banner" className="text-xs text-gray-700">이 하단 띠 배너를 화면에 표시</label>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">하단 띠 배너 이미지 URL (선택)</label>
              <input
                type="text"
                value={brandForm.bottomBannerImageUrl}
                onChange={(e) => handleBrandFormChange("bottomBannerImageUrl", e.target.value)}
                placeholder="https://example.com/banner-bottom.jpg"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
              />
            </div>
          </div>

          {/* 현재 사용 중인 배너 이미지 리스트 */}
          <div className="mt-6 border-t border-gray-200 pt-4">
            <h4 className="text-sm font-bold text-gray-800 mb-2">배너 이미지 목록</h4>
            <p className="text-xs text-gray-500 mb-3">현재 각 배너에 설정된 이미지 목록입니다.</p>
            <div className="space-y-3">
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

              {!brandForm.sidebarTopImageUrl && !brandForm.sidebarLongImageUrl && !brandForm.bottomBannerImageUrl && (
                <div className="text-xs text-gray-400">등록된 배너 이미지가 없습니다.</div>
              )}
            </div>
          </div>
          <div className="mt-2 flex gap-2">
            <button
              onClick={saveBrandConfigLocal}
              disabled={!brandDirty}
              className={`px-5 py-2 rounded-lg font-bold text-white ${brandDirty ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-300 cursor-not-allowed"}`}
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