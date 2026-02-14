import { useState, useEffect } from "react";
import { getDisplaySettings, saveDisplaySettings } from "../utils/displaySettings";

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

  useEffect(() => {
    fetchConfig();
    fetchScheduleConfig();
    fetchMailLogs();
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

      {/* ===== Schedule Config ===== */}
      {!scheduleLoading && scheduleForm && (
        <section>
          <h3 className="text-lg font-bold text-gray-800 mb-2">{"\uC2A4\uCF00\uC904 \uC124\uC815"}</h3>
          <p className="text-sm text-gray-500 mb-4">
            {"\uBA54\uC77C\uC744 \uAC00\uC838\uC624\uB294 \uBC29\uC2DD\uC744 \uC124\uC815\uD569\uB2C8\uB2E4."}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Manual */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-bold text-blue-900 mb-3">{"\uC218\uB3D9 \uC2E4\uD589"}</h4>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {"\uAC00\uC838\uC62C \uBA54\uC77C \uAC1C\uC218"}
              </label>
              <input
                type="number" min="1" max="100"
                value={scheduleForm.manualFetchCount}
                onChange={(e) => handleScheduleChange("manualFetchCount", parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
              <p className="text-xs text-gray-500 mt-1">
                {"\"\uC9C0\uAE08 \uAC00\uC838\uC624\uAE30\" \uBC84\uD2BC \uD074\uB9AD \uC2DC \uCC98\uB9AC\uD560 \uCD5C\uB300 \uBA54\uC77C \uC218"}
              </p>
            </div>
            {/* Auto */}
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <h4 className="font-bold text-green-900 mb-3">{"\uC790\uB3D9 \uC2E4\uD589"}</h4>
              <label className="flex items-center gap-2 mb-3">
                <input
                  type="checkbox"
                  checked={scheduleForm.autoScheduleEnabled}
                  onChange={(e) => handleScheduleChange("autoScheduleEnabled", e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium">{"\uC790\uB3D9 \uC2A4\uCF00\uC904 \uD65C\uC131\uD654"}</span>
              </label>
              <div className="space-y-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{"\uAC00\uC838\uC62C \uBA54\uC77C \uAC1C\uC218"}</label>
                  <input
                    type="number" min="1" max="50"
                    value={scheduleForm.autoFetchCount}
                    onChange={(e) => handleScheduleChange("autoFetchCount", parseInt(e.target.value) || 1)}
                    disabled={!scheduleForm.autoScheduleEnabled}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{"\uC2E4\uD589 \uAC04\uACA9 (\uC2DC\uAC04)"}</label>
                  <input
                    type="number" min="1" max="24"
                    value={scheduleForm.autoIntervalHours}
                    onChange={(e) => handleScheduleChange("autoIntervalHours", parseInt(e.target.value) || 1)}
                    disabled={!scheduleForm.autoScheduleEnabled}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100"
                  />
                </div>
              </div>
            </div>
            {/* Global Settings */}
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200 md:col-span-2">
              <h4 className="font-bold text-purple-900 mb-3">{"\uAE30\uBCF8 \uAE30\uC0AC \uC124\uC815"}</h4>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{"\uAE30\uBCF8 \uAE30\uC790\uBA85"}</label>
                <input
                  type="text"
                  value={scheduleForm.defaultWriter}
                  onChange={(e) => handleScheduleChange("defaultWriter", e.target.value)}
                  placeholder="AI Reporter"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
                <p className="text-xs text-gray-500 mt-1">{"\uAE30\uC0AC \uC0DD\uC131 \uC2DC \uAE30\uBCF8\uC73C\uB85C \uC0AC\uC6A9\uB420 \uAE30\uC790 \uC774\uB984\uC785\uB2C8\uB2E4."}</p>
              </div>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={saveScheduleConfig}
              disabled={!scheduleDirty}
              className={"px-5 py-2 rounded-lg font-bold text-white " + (scheduleDirty ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-300 cursor-not-allowed")}
            >
              {"\uC2A4\uCF00\uC904 \uC124\uC815 \uC800\uC7A5"}
            </button>
            {scheduleDirty && <span className="text-sm text-orange-600 self-center">{"\u2731 \uBCC0\uACBD\uC0AC\uD56D\uC774 \uC788\uC2B5\uB2C8\uB2E4."}</span>}
          </div>
        </section>
      )}

      {/* ===== Fetch Now + Mail Results ===== */}
      <section>
        <h3 className="text-lg font-bold text-gray-800 mb-2">{"\uBA54\uC77C \uAC00\uC838\uC624\uAE30 \uBC0F \uCC98\uB9AC \uACB0\uACFC"}</h3>
        <p className="text-sm text-gray-500 mb-4">
          {"\uC218\uB3D9\uC73C\uB85C \uBA54\uC77C\uC744 \uAC00\uC838\uC640\uC11C \uCC98\uB9AC \uACB0\uACFC\uB97C \uD655\uC778\uD569\uB2C8\uB2E4. \uAC01 \uD56D\uBAA9\uC758 AI \uC694\uC57D \uBC84\uD2BC\uC73C\uB85C \uAE30\uC0AC\uB97C \uC790\uB3D9 \uC0DD\uC131\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4."}
        </p>
        <div className="flex gap-2 mb-4">
          <button
            onClick={runFetchNow}
            disabled={fetching}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50"
          >
            {fetching ? "\uC2E4\uD589 \uC911..." : "\uC9C0\uAE08 \uAC00\uC838\uC624\uAE30"}
          </button>
          <button
            onClick={fetchMailLogs}
            className="px-4 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50"
          >
            {"\uC0C8\uB85C\uACE0\uCE68"}
          </button>
          <button
            onClick={clearMailLogs}
            className="px-4 py-2 border border-red-300 text-red-600 rounded-lg font-medium hover:bg-red-50"
          >
            {"\uBAA8\uB450 \uC9C0\uC6B0\uAE30"}
          </button>
        </div>

        {/* Mail Process Results - Card List */}
        <div className="space-y-3">
          {mailLogsLoading ? (
            <div className="p-6 text-center text-gray-500">{"\uB85C\uB529 \uC911..."}</div>
          ) : mailLogs.length === 0 ? (
            <div className="p-6 text-center text-gray-400 border border-dashed border-gray-300 rounded-lg">
              {"\uCC98\uB9AC\uB41C \uBA54\uC77C\uC774 \uC5C6\uC2B5\uB2C8\uB2E4. \"\uC9C0\uAE08 \uAC00\uC838\uC624\uAE30\" \uBC84\uD2BC\uC744 \uB20C\uB7EC\uBCF4\uC138\uC694."}
            </div>
          ) : (
            mailLogs.map((log) => (
              <div key={log.id} className={"p-4 rounded-xl border " + (log.success ? "border-green-200 bg-green-50/50" : "border-red-200 bg-red-50/50")}>
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {log.success ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800">{"\u2713 \uC131\uACF5"}</span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800">{"\u2717 \uC2E4\uD328"}</span>
                      )}
                      <span className="text-xs text-gray-500">
                        {new Date(log.processedDate).toLocaleString("ko-KR")}
                      </span>
                    </div>
                    <h4 className="font-bold text-gray-900 text-base">{log.subject}</h4>
                    <p className="text-sm text-gray-500 mt-0.5">{"\uBC1C\uC2E0\uC790: " + (log.senderEmail || "-")}</p>
                    {log.errorMessage && (
                      <p className="text-sm text-red-600 mt-1">{"\uC624\uB958: " + log.errorMessage}</p>
                    )}
                    {log.articleId && (
                      <p className="text-sm text-blue-600 mt-1">{"\uAE30\uC0AC ID: " + log.articleId}</p>
                    )}
                  </div>
                </div>

                {/* Attachment Details */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                  {/* Files */}
                  <div className="p-3 bg-white rounded-lg border border-gray-200">
                    <div className="text-xs font-bold text-gray-600 mb-1.5 flex items-center gap-1">
                      <span>{"\uD83D\uDCC2"}</span>
                      <span>{"\uAC00\uC838\uC628 \uD30C\uC77C"}</span>
                    </div>
                    {log.attachments && log.attachments.length > 0 ? (
                      <ul className="space-y-1">
                        {log.attachments.map((f, i) => (
                          <li key={i} className="text-xs text-gray-700 flex items-center gap-1">
                            <span className="text-gray-400">{"\u2022"}</span>
                            <span className="break-all">{f}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-gray-400">{"\uC5C6\uC74C"}</p>
                    )}
                  </div>

                  {/* Text */}
                  <div className="p-3 bg-white rounded-lg border border-gray-200">
                    <div className="text-xs font-bold text-gray-600 mb-1.5 flex items-center gap-1">
                      <span>{"\uD83D\uDCC4"}</span>
                      <span>{"\uCD94\uCD9C\uB41C \uD14D\uC2A4\uD2B8"}</span>
                    </div>
                    {log.hwpFileName ? (
                      <div>
                        <p className="text-xs text-purple-700 font-medium">{log.hwpFileName}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{"\uBB38\uC11C\uC5D0\uC11C \uD14D\uC2A4\uD2B8 \uCD94\uCD9C\uB428"}</p>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400">{"\uBB38\uC11C \uD30C\uC77C \uC5C6\uC74C (\uBA54\uC77C \uBCF8\uBB38 \uC0AC\uC6A9)"}</p>
                    )}
                  </div>

                  {/* Images */}
                  <div className="p-3 bg-white rounded-lg border border-gray-200">
                    <div className="text-xs font-bold text-gray-600 mb-1.5 flex items-center gap-1">
                      <span>{"\uD83D\uDDBC\uFE0F"}</span>
                      <span>{"\uAC00\uC838\uC628 \uC774\uBBF8\uC9C0"}</span>
                    </div>
                    {log.imageFileNames && log.imageFileNames.length > 0 ? (
                      <ul className="space-y-1">
                        {log.imageFileNames.map((img, i) => (
                          <li key={i} className="text-xs text-blue-700 flex items-center gap-1">
                            <span className="text-blue-400">{"\u2022"}</span>
                            <span className="break-all">{img}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-gray-400">{"\uC5C6\uC74C"}</p>
                    )}
                  </div>
                </div>

                {/* AI Summary Button */}
                {!log.articleId && log.success !== true && (
                  <button
                    onClick={() => runAiSummary(log.id)}
                    disabled={summaryLoading[log.id]}
                    className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-bold text-sm hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 transition-all"
                  >
                    {summaryLoading[log.id] ? "\u2728 AI \uAE30\uC0AC \uC0DD\uC131 \uC911..." : "\u2728 AI \uC694\uC57D\uC73C\uB85C \uAE30\uC0AC \uC0DD\uC131"}
                  </button>
                )}
                {log.articleId && (
                  <div className="w-full py-2 text-center text-sm text-green-700 bg-green-100 rounded-lg font-medium">
                    {"\u2713 \uAE30\uC0AC \uC0DD\uC131 \uC644\uB8CC (ID: " + log.articleId + ")"}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </section>

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

      {/* ===== Sender Whitelist ===== */}
      <section>
        <h3 className="text-lg font-bold text-gray-800 mb-2">{"\uBCF4\uB0B8\uC0AC\uB78C \uD654\uC774\uD2B8\uB9AC\uC2A4\uD2B8"}</h3>
        <p className="text-sm text-gray-500 mb-4">
          {"\uC774 \uBAA9\uB85D\uC5D0 \uD3EC\uD568\uB41C \uC774\uBA54\uC77C \uC8FC\uC18C\uB9CC \uAE30\uC0AC\uB85C \uCC98\uB9AC\uD569\uB2C8\uB2E4. \uBE44\uC5B4 \uC788\uC73C\uBA74 \uBAA8\uB4E0 \uBCF4\uB0B8\uC0AC\uB78C \uD5C8\uC6A9."}
        </p>
        <form onSubmit={addSender} className="flex gap-2 mb-4">
          <input
            type="email"
            value={senderInput}
            onChange={(e) => setSenderInput(e.target.value)}
            placeholder="press@example.com"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700">
            {"\uCD94\uAC00"}
          </button>
        </form>
        <ul className="space-y-2">
          {config.allowedSenders.map((item) => (
            <li key={item.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
              <span className="text-gray-800">{item.email}</span>
              <button onClick={() => removeSender(item.id)} className="text-red-600 hover:text-red-800 text-sm font-medium">{"\uC0AD\uC81C"}</button>
            </li>
          ))}
          {config.allowedSenders.length === 0 && (
            <li className="text-gray-400 text-sm py-2">{"\uB4F1\uB85D\uB41C \uBCF4\uB0B8\uC0AC\uB78C\uC774 \uC5C6\uC2B5\uB2C8\uB2E4."}</li>
          )}
        </ul>
      </section>

      {/* ===== Modification Keywords ===== */}
      <section>
        <h3 className="text-lg font-bold text-gray-800 mb-2">{"\uC218\uC815\uC694\uCCAD \uD0A4\uC6CC\uB4DC"}</h3>
        <p className="text-sm text-gray-500 mb-4">
          {"\uC81C\uBAA9\uC5D0 \uD3EC\uD568\uB418\uBA74 \uC218\uC815\uC694\uCCAD\uC73C\uB85C \uC778\uC2DD\uD558\uC5EC \uAE30\uC874 \uAE30\uC0AC \uBCF8\uBB38\uC744 \uAC31\uC2E0\uD569\uB2C8\uB2E4."}
        </p>
        <form onSubmit={addKeyword} className="flex gap-2 mb-4">
          <input
            type="text"
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            placeholder="[\uC218\uC815\uBC30\uD3EC]"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700">
            {"\uCD94\uAC00"}
          </button>
        </form>
        <ul className="space-y-2">
          {config.modificationKeywords.map((item) => (
            <li key={item.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
              <span className="text-gray-800 font-mono">{item.keyword}</span>
              <button onClick={() => removeKeyword(item.id)} className="text-red-600 hover:text-red-800 text-sm font-medium">{"\uC0AD\uC81C"}</button>
            </li>
          ))}
          {config.modificationKeywords.length === 0 && (
            <li className="text-gray-400 text-sm py-2">{"\uB4F1\uB85D\uB41C \uD0A4\uC6CC\uB4DC\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4."}</li>
          )}
        </ul>
      </section>
    </div>
  );
}
