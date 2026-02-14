import { useState, useEffect } from "react";
import { getDisplaySettings, saveDisplaySettings } from "../utils/displaySettings";

export default function AgentConfigPanel() {
  const [config, setConfig] = useState({ allowedSenders: [], modificationKeywords: [] });
  const [senderInput, setSenderInput] = useState("");
  const [keywordInput, setKeywordInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 에이전트 로그
  const [logs, setLogs] = useState([]);
  const [fetching, setFetching] = useState(false);

  // 기사 표시 설정
  const [display, setDisplay] = useState(getDisplaySettings());

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

  const fetchLogs = async () => {
    try {
      const res = await fetch("/api/admin/agent-config/logs");
      if (res.ok) {
        const data = await res.json();
        setLogs(Array.isArray(data) ? data : []);
      }
    } catch (_) {}
  };

  const runFetchNow = async () => {
    setFetching(true);
    try {
      const res = await fetch("/api/agent/fetch", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      await fetchLogs();
      alert("완료: " + (data.created ?? 0) + "개 기사 생성/수정");
    } catch (e) {
      alert("실행 중 오류: " + e.message);
    } finally {
      setFetching(false);
    }
  };

  const clearLogs = async () => {
    if (!window.confirm("로그를 모두 지우시겠습니까?")) return;
    try {
      await fetch("/api/admin/agent-config/logs", { method: "DELETE" });
      setLogs([]);
    } catch (_) {}
  };

  const handleDisplayChange = (key, value) => {
    const next = { ...display, [key]: value };
    setDisplay(next);
    saveDisplaySettings(next);
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  useEffect(() => {
    fetchLogs();
    const id = setInterval(fetchLogs, 3000);
    return () => clearInterval(id);
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
      if (!res.ok) throw new Error("추가에 실패했습니다.");
      setSenderInput("");
      await fetchConfig();
    } catch (e) {
      alert(e.message);
    }
  };

  const removeSender = async (id) => {
    if (!window.confirm("이 보낸사람을 삭제하시겠습니까?")) return;
    try {
      const res = await fetch(`/api/admin/agent-config/senders/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("삭제에 실패했습니다.");
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
      if (!res.ok) throw new Error("추가에 실패했습니다.");
      setKeywordInput("");
      await fetchConfig();
    } catch (e) {
      alert(e.message);
    }
  };

  const removeKeyword = async (id) => {
    if (!window.confirm("이 키워드를 삭제하시겠습니까?")) return;
    try {
      const res = await fetch(`/api/admin/agent-config/modification-keywords/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("삭제에 실패했습니다.");
      await fetchConfig();
    } catch (e) {
      alert(e.message);
    }
  };

  if (loading) return <div className="p-8 text-gray-500">로딩 중...</div>;
  if (error) return <div className="p-8 text-red-600">{error}</div>;

  return (
    <div className="max-w-3xl mx-auto bg-white p-8 rounded-2xl border border-gray-200 shadow-sm space-y-10">
      <h2 className="text-2xl font-black text-gray-900 border-b pb-4">
        AI 에이전트 / 관리 설정
      </h2>

      {/* 에이전트 로그 + 지금 가져오기 */}
      <section>
        <h3 className="text-lg font-bold text-gray-800 mb-2">에이전트 실행 로그</h3>
        <p className="text-sm text-gray-500 mb-4">
          수동으로 메일을 가져와 기사를 생성합니다. 로그는 3초마다 갱신됩니다.
        </p>
        <div className="flex gap-2 mb-4">
          <button
            onClick={runFetchNow}
            disabled={fetching}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50"
          >
            {fetching ? "실행 중..." : "지금 가져오기"}
          </button>
          <button
            onClick={clearLogs}
            className="px-4 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50"
          >
            로그 지우기
          </button>
          <button
            onClick={fetchLogs}
            className="px-4 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50"
          >
            새로고침
          </button>
        </div>
        <div className="h-48 overflow-y-auto bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm">
          {logs.length === 0 ? (
            <span className="text-gray-500">로그가 없습니다.</span>
          ) : (
            logs.map((line, i) => (
              <div key={i} className="whitespace-pre-wrap break-all">
                {line}
              </div>
            ))
          )}
        </div>
      </section>

      {/* 기사 표시 설정 */}
      <section>
        <h3 className="text-lg font-bold text-gray-800 mb-2">기사 표시 설정</h3>
        <p className="text-sm text-gray-500 mb-4">
          기사 상세 페이지의 글꼴, 글씨 크기, 이미지 크기, 줄간격을 조절합니다.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">글꼴</label>
            <select
              value={display.fontFamily}
              onChange={(e) => handleDisplayChange("fontFamily", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="inherit">기본</option>
              <option value="'Noto Sans KR', sans-serif">Noto Sans KR</option>
              <option value="'Nanum Myeongjo', serif">Nanum Myeongjo</option>
              <option value="Georgia, serif">Georgia</option>
              <option value="'Malgun Gothic', sans-serif">맑은 고딕</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">글씨 크기</label>
            <select
              value={display.fontSize}
              onChange={(e) => handleDisplayChange("fontSize", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
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
              value={display.imageMaxWidth}
              onChange={(e) => handleDisplayChange("imageMaxWidth", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="100%">100% (전체)</option>
              <option value="80%">80%</option>
              <option value="600px">600px</option>
              <option value="500px">500px</option>
              <option value="400px">400px</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">줄간격</label>
            <select
              value={display.lineHeight}
              onChange={(e) => handleDisplayChange("lineHeight", e.target.value)}
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
      </section>

      {/* 보낸사람 화이트리스트 */}
      <section>
        <h3 className="text-lg font-bold text-gray-800 mb-2">보낸사람 화이트리스트</h3>
        <p className="text-sm text-gray-500 mb-4">
          이 메일에 포함된 이메일 주소만 기사로 처리합니다. 비어 있으면 모든 보낸사람 허용.
        </p>
        <form onSubmit={addSender} className="flex gap-2 mb-4">
          <input
            type="email"
            value={senderInput}
            onChange={(e) => setSenderInput(e.target.value)}
            placeholder="예: press@example.com"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700"
          >
            추가
          </button>
        </form>
        <ul className="space-y-2">
          {config.allowedSenders.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg"
            >
              <span className="text-gray-800">{item.email}</span>
              <button
                onClick={() => removeSender(item.id)}
                className="text-red-600 hover:text-red-800 text-sm font-medium"
              >
                삭제
              </button>
            </li>
          ))}
          {config.allowedSenders.length === 0 && (
            <li className="text-gray-400 text-sm py-2">등록된 보낸사람이 없습니다.</li>
          )}
        </ul>
      </section>

      {/* 수정요청 키워드 */}
      <section>
        <h3 className="text-lg font-bold text-gray-800 mb-2">수정요청 키워드</h3>
        <p className="text-sm text-gray-500 mb-4">
          제목에 포함되면 수정요청으로 인식하여 기존 기사 본문을 갱신합니다.
        </p>
        <form onSubmit={addKeyword} className="flex gap-2 mb-4">
          <input
            type="text"
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            placeholder="예: [수정배포]"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700"
          >
            추가
          </button>
        </form>
        <ul className="space-y-2">
          {config.modificationKeywords.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg"
            >
              <span className="text-gray-800 font-mono">{item.keyword}</span>
              <button
                onClick={() => removeKeyword(item.id)}
                className="text-red-600 hover:text-red-800 text-sm font-medium"
              >
                삭제
              </button>
            </li>
          ))}
          {config.modificationKeywords.length === 0 && (
            <li className="text-gray-400 text-sm py-2">등록된 키워드가 없습니다.</li>
          )}
        </ul>
      </section>
    </div>
  );
}
