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
      if (!res.ok) throw new Error("\uC124\uC815\uC744 \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.");
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
        alert("\uC2A4\uCF00\uC904 \uC124\uC815\uC774 \uC800\uC7A5\uB418\uC5C8\uC2B5\uB2C8\uB2E4.");
      }
    } catch (e) {
      alert("\uC2A4\uCF00\uC904 \uC124\uC815 \uC800\uC7A5 \uC2E4\uD328: " + e.message);
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
    if (!window.confirm("\uBA54\uC77C \uCC98\uB9AC \uB85C\uADF8\uB97C \uBAA8\uB450 \uC9C0\uC6B0\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?")) return;
    try {
      await fetch("/api/admin/mail-process-logs", { method: "DELETE" });
      setMailLogs([]);
    } catch (e) {
      alert("\uB85C\uADF8 \uC0AD\uC81C \uC2E4\uD328: " + e.message);
    }
  };

  const runFetchNow = async () => {
    setFetching(true);
    try {
      const res = await fetch("/api/agent/fetch", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      await fetchMailLogs();
      await fetchScheduleConfig();

      const message = "\uC644\uB8CC!\n\uCD1D \uCC98\uB9AC: " + (data.totalProcessed || 0)
        + "\uAC1C\n\uC131\uACF5: " + (data.successCount || 0)
        + "\uAC1C\n\uC2E4\uD328: " + (data.failureCount || 0) + "\uAC1C";
      alert(message);
    } catch (e) {
      alert("\uC2E4\uD589 \uC911 \uC624\uB958: " + e.message);
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
        alert("AI \uAE30\uC0AC \uC0DD\uC131 \uC644\uB8CC!\n\uC81C\uBAA9: " + (data.title || ""));
        await fetchMailLogs();
      } else {
        const errData = await res.json().catch(() => ({}));
        alert("AI \uC694\uC57D \uC2E4\uD328: " + (errData.error || "\uC54C \uC218 \uC5C6\uB294 \uC624\uB958"));
      }
    } catch (e) {
      alert("AI \uC694\uC57D \uC624\uB958: " + e.message);
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
    alert("\uD45C\uC2DC \uC124\uC815\uC774 \uC800\uC7A5\uB418\uC5C8\uC2B5\uB2C8\uB2E4.");
  };

  const handleBrandFormChange = (key, value) => {
    setBrandForm(prev => ({ ...prev, [key]: value }));
    setBrandDirty(true);
  };

  const saveBrandConfigLocal = () => {
    setBrand(brandForm);
    saveBrandSettings(brandForm);
    setBrandDirty(false);
    alert("\uBE0C\uB79C\uB4DC / \uBC30\uB108 \uC124\uC815\uC774 \uC800\uC7A5\uB418\uC5C8\uC2B5\uB2C8\uB2E4.");
  };

  const handleBannerImageUpload = async (fieldKey, file) => {
    if (!file) return;
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/brand-assets", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        throw new Error("\uC5C5\uB85C\uB4DC \uC2E4\uD328");
      }
      const data = await res.json();
      const url = data.url;
      setBrandForm(prev => ({ ...prev, [fieldKey]: url }));
      setBrandDirty(true);
      alert("\uBC30\uB108 \uC774\uBBF8\uC9C0\uAC00 \uC5C5\uB85C\uB4DC\uB418\uC5C8\uC2B5\uB2C8\uB2E4.");
    } catch (e) {
      alert("\uC774\uBBF8\uC9C0 \uC5C5\uB85C\uB4DC \uC624\uB958: " + e.message);
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
      if (!res.ok) throw new Error("\uCD94\uAC00 \uC2E4\uD328");
      setSenderInput("");
      await fetchConfig();
    } catch (e) {
      alert(e.message);
    }
  };

  const removeSender = async (id) => {
    if (!window.confirm("\uC0AD\uC81C\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?")) return;
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
      if (!res.ok) throw new Error("\uCD94\uAC00 \uC2E4\uD328");
      setKeywordInput("");
      await fetchConfig();
    } catch (e) {
      alert(e.message);
    }
  };

  const removeKeyword = async (id) => {
    if (!window.confirm("\uC0AD\uC81C\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?")) return;
    try {
      await fetch("/api/admin/agent-config/modification-keywords/" + id, { method: "DELETE" });
      await fetchConfig();
    } catch (e) {
      alert(e.message);
    }
  };

  if (loading) return <div className="p-8 text-gray-500">{"\uB85C\uB529 \uC911..."}</div>;
  if (error) return <div className="p-8 text-red-600">{error}</div>;

  return (
    <div className="max-w-5xl mx-auto bg-white p-8 rounded-2xl border border-gray-200 shadow-sm space-y-10">
      <h2 className="text-2xl font-black text-gray-900 border-b pb-4">
        {"\uAD00\uB9AC\uC790 \uC124\uC815"}
      </h2>

      {/* ===== Display Settings ===== */}
      <section>
        <h3 className="text-lg font-bold text-gray-800 mb-2">{"\uAE30\uC0AC \uD45C\uC2DC \uC124\uC815"}</h3>
        <p className="text-sm text-gray-500 mb-4">
          {"\uAE30\uC0AC \uC0C1\uC138 \uD398\uC774\uC9C0\uC758 \uAE00\uAF34, \uAE00\uC528 \uD06C\uAE30, \uC774\uBBF8\uC9C0 \uD06C\uAE30, \uC904\uAC04\uACA9\uC744 \uC870\uC808\uD569\uB2C8\uB2E4."}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{"\uAE00\uAF34"}</label>
            <select
              value={displayForm.fontFamily}
              onChange={(e) => handleDisplayFormChange("fontFamily", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="inherit">{"\uAE30\uBCF8"}</option>
              <option value="'Noto Sans KR', sans-serif">Noto Sans KR</option>
              <option value="'Nanum Myeongjo', serif">Nanum Myeongjo</option>
              <option value="Georgia, serif">Georgia</option>
              <option value="'Malgun Gothic', sans-serif">{"\uB9D1\uC740 \uACE0\uB515"}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{"\uAE00\uC528 \uD06C\uAE30"}</label>
            <select
              value={displayForm.fontSize}
              onChange={(e) => handleDisplayFormChange("fontSize", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="0.875rem">{"\uC791\uAC8C (14px)"}</option>
              <option value="1rem">{"\uBCF4\uD1B5 (16px)"}</option>
              <option value="1.125rem">{"\uAE30\uBCF8 (18px)"}</option>
              <option value="1.25rem">{"\uD06C\uAC8C (20px)"}</option>
              <option value="1.5rem">{"\uC544\uC8FC \uD06C\uAC8C (24px)"}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{"\uC774\uBBF8\uC9C0 \uCD5C\uB300 \uB108\uBE44"}</label>
            <select
              value={displayForm.imageMaxWidth}
              onChange={(e) => handleDisplayFormChange("imageMaxWidth", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="100%">{"\uC804\uCCB4 (100%)"}</option>
              <option value="80%">80%</option>
              <option value="600px">600px</option>
              <option value="500px">500px</option>
              <option value="400px">400px</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{"\uC904\uAC04\uACA9"}</label>
            <select
              value={displayForm.lineHeight}
              onChange={(e) => handleDisplayFormChange("lineHeight", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="1.4">{"\uC881\uAC8C (1.4)"}</option>
              <option value="1.6">{"\uBCF4\uD1B5 (1.6)"}</option>
              <option value="1.8">{"\uAE30\uBCF8 (1.8)"}</option>
              <option value="2">{"\uB113\uAC8C (2)"}</option>
              <option value="2.2">{"\uC544\uC8FC \uB113\uAC8C (2.2)"}</option>
            </select>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button
            onClick={saveDisplayConfig}
            disabled={!displayDirty}
            className={"px-5 py-2 rounded-lg font-bold text-white " + (displayDirty ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-300 cursor-not-allowed")}
          >
            {"\uD45C\uC2DC \uC124\uC815 \uC800\uC7A5"}
          </button>
          {displayDirty && <span className="text-sm text-orange-600 self-center">{"\u2731 \uBCC0\uACBD\uC0AC\uD56D\uC774 \uC788\uC2B5\uB2C8\uB2E4."}</span>}
        </div>
      </section>

      {/* ===== Brand / Banner Settings ===== */}
      <section>
        <h3 className="text-lg font-bold text-gray-800 mb-2">{"\uBE0C\uB79C\uB4DC / \uBC30\uB108 \uC124\uC815"}</h3>
        <p className="text-sm text-gray-500 mb-4">
          {"\uD604\uC7AC \uC124\uC815\uC740 \uBE0C\uB79C\uB4DC(\uC2DC\uC11C)\uBCC4\uB85C \uBE14\uB8E8\uC790 \uC800\uC7A5\uB429\uB2C8\uB2E4. \uBAA9\uC18C\uB9AC \uBC0F \uAD11\uACE0 \uBC30\uB108\uB97C \uD3B8\uC9D1\uD569\uB2C8\uB2E4."}
        </p>
        <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-4">
          <div className="text-xs text-gray-500 mb-2">
            {"\uD604\uC7AC \uBE0C\uB79C\uB4DC: "} 
            <span className="font-semibold text-gray-700">
              {brandBase.siteName} ({brandBase.id})
            </span>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{"\uC0AC\uC774\uD2B8 \uC774\uB984 (\uD5E4\uB354 \uBC30\uB108)"}</label>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">{"\uC0C1\uB2E8 \uAD11\uACE0 \uBC30\uB108 \uBB38\uAD6C"}</label>
              <input
                type="text"
                value={brandForm.sidebarTopText}
                onChange={(e) => handleBrandFormChange("sidebarTopText", e.target.value)}
                placeholder={brandBase.adTexts.sidebarTop}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
              <label className="block text-xs font-medium text-gray-500 mt-2 mb-1">{"\uC0C1\uB2E8 \uAD11\uACE0 \uC774\uBBF8\uC9C0 URL (\uC120\uD0DD)"}</label>
              <input
                type="text"
                value={brandForm.sidebarTopImageUrl}
                onChange={(e) => handleBrandFormChange("sidebarTopImageUrl", e.target.value)}
                placeholder="https://example.com/banner-top.jpg"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
              />
              <div className="mt-2">
                <label className="block text-xs font-medium text-gray-500 mb-1">{"\uC0C1\uB2E8 \uAD11\uACE0 \uC774\uBBF8\uC9C0 \uC5C5\uB85C\uB4DC"}</label>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">{"\uC138\uB85C \uAE34 \uAD11\uACE0 \uBC30\uB108 \uBB38\uAD6C"}</label>
              <input
                type="text"
                value={brandForm.sidebarLongText}
                onChange={(e) => handleBrandFormChange("sidebarLongText", e.target.value)}
                placeholder={brandBase.adTexts.sidebarLong}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
              <label className="block text-xs font-medium text-gray-500 mt-2 mb-1">{"\uC138\uB85C \uAE34 \uAD11\uACE0 \uC774\uBBF8\uC9C0 URL (\uC120\uD0DD)"}</label>
              <input
                type="text"
                value={brandForm.sidebarLongImageUrl}
                onChange={(e) => handleBrandFormChange("sidebarLongImageUrl", e.target.value)}
                placeholder="https://example.com/banner-long.jpg"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
              />
              <div className="mt-2">
                <label className="block text-xs font-medium text-gray-500 mb-1">{"\uC138\uB85C \uAE34 \uAD11\uACE0 \uC774\uBBF8\uC9C0 \uC5C5\uB85C\uB4DC"}</label>
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
          <div className="mt-2 flex gap-2">
            <button
              onClick={saveBrandConfigLocal}
              disabled={!brandDirty}
              className={"px-5 py-2 rounded-lg font-bold text-white " + (brandDirty ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-300 cursor-not-allowed")}
            >
              {"\uBE0C\uB79C\uB4DC / \uBC30\uB108 \uC124\uC815 \uC800\uC7A5"}
            </button>
            {brandDirty && <span className="text-sm text-orange-600 self-center">{"\u2731 \uBCC0\uACBD\uC0AC\uD56D\uC774 \uC788\uC2B5\uB2C8\uB2E4."}</span>}
          </div>
        </div>
      </section>
    </div>
  );
}
