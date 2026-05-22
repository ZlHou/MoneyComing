import { useState, useEffect, useMemo, useCallback, useRef, createContext, useContext } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Area, AreaChart,
} from "recharts";
import { saveLocal, loadLocal } from "./utils/storage";
import { testConnection, syncData } from "./utils/webdav";
import { getTranslations, SUPPORTED_LANGS } from "./utils/i18n";

/* ───────────── 常量 ───────────── */

const INITIAL_ACCOUNTS = [
  { id: 1, name: "招商银行", type: "bank", icon: "🏦", color: "#E31837" },
  { id: 2, name: "支付宝余额宝", type: "fund", icon: "💛", color: "#FF6010" },
  { id: 3, name: "微信零钱通", type: "fund", icon: "💚", color: "#07C160" },
  { id: 4, name: "沪深300基金", type: "invest", icon: "📈", color: "#1677FF" },
];

const INITIAL_HISTORY = {
  "2024-10": { 1: 45200, 2: 12300, 3: 8400, 4: 30000 },
  "2024-11": { 1: 47500, 2: 13100, 3: 8900, 4: 28500 },
  "2024-12": { 1: 51000, 2: 14200, 3: 9200, 4: 32000 },
  "2025-01": { 1: 53400, 2: 15000, 3: 9800, 4: 31500 },
  "2025-02": { 1: 55000, 2: 16200, 3: 10100, 4: 33800 },
  "2025-03": { 1: 58200, 2: 17500, 3: 10800, 4: 35200 },
};

// 为初始数据生成 updateLog（模拟历史记录）
function generateInitialLogs(hist) {
  const logs = [];
  const sortedKeys = Object.keys(hist).sort();
  sortedKeys.forEach((key) => {
    const [y, m] = key.split("-").map(Number);
    const entries = hist[key];
    // 模拟在该月15号更新
    const ts = new Date(y, m - 1, 15, 10, 0, 0).getTime();
    Object.entries(entries).forEach(([accId, amount]) => {
      logs.push({ accountId: Number(accId), monthKey: key, amount, timestamp: ts });
    });
  });
  return logs;
}

const INITIAL_LOGS = generateInitialLogs(INITIAL_HISTORY);

const now = new Date();
const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

function formatAmount(n) {
  if (n >= 10000) return `${(n / 10000).toFixed(2)}万`;
  return n?.toLocaleString("zh-CN") ?? "0";
}

const typeColors = { bank: "#1677FF", fund: "#07C160", invest: "#FA8C16" };
const typeIcons = { bank: "🏦", fund: "💰", invest: "📈" };

/* ───────────── Toast ───────────── */

function Toast({ message, type, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2200);
    return () => clearTimeout(t);
  }, [onDone]);
  const bg = type === "success" ? "#07C160" : type === "error" ? "#FF4D4F" : "#333";
  const icon = type === "success" ? "✓" : type === "error" ? "✕" : "ℹ";
  return (
    <div style={{
      position: "fixed", top: 60, left: "50%", transform: "translateX(-50%)",
      zIndex: 9999, background: bg, color: "white", padding: "10px 20px",
      borderRadius: 24, fontSize: 14, fontWeight: 600,
      boxShadow: "0 6px 24px rgba(0,0,0,0.2)",
      display: "flex", alignItems: "center", gap: 8,
      animation: "toastIn 0.3s ease",
    }}>
      <span>{icon}</span> {message}
    </div>
  );
}

/* ───────────── 滚轮选择器 ───────────── */

const ITEM_HEIGHT = 44;
const VISIBLE_COUNT = 5;
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_COUNT;

function ScrollColumn({ items, value, onChange, suffix = "", renderLabel }) {
  const containerRef = useRef(null);
  const touchStartY = useRef(0);
  const scrollStartOffset = useRef(0);
  const currentOffset = useRef(0);
  const [offset, setOffset] = useState(0);
  const isTouching = useRef(false);
  const centerPad = Math.floor(VISIBLE_COUNT / 2);

  useEffect(() => {
    const idx = items.indexOf(value);
    if (idx >= 0) {
      const target = -idx * ITEM_HEIGHT;
      currentOffset.current = target;
      setOffset(target);
    }
  }, [value, items]);

  const clampAndSnap = (rawOffset) => {
    const maxOff = 0;
    const minOff = -(items.length - 1) * ITEM_HEIGHT;
    const clamped = Math.max(minOff, Math.min(maxOff, rawOffset));
    const idx = Math.round(-clamped / ITEM_HEIGHT);
    return { offset: -idx * ITEM_HEIGHT, index: idx };
  };

  const handleTouchStart = (e) => { isTouching.current = true; touchStartY.current = e.touches[0].clientY; scrollStartOffset.current = currentOffset.current; };
  const handleTouchMove = (e) => { if (!isTouching.current) return; e.preventDefault(); const dy = e.touches[0].clientY - touchStartY.current; currentOffset.current = scrollStartOffset.current + dy; setOffset(currentOffset.current); };
  const handleTouchEnd = () => { isTouching.current = false; const { offset: s, index } = clampAndSnap(currentOffset.current); currentOffset.current = s; setOffset(s); if (index >= 0 && index < items.length && items[index] !== value) onChange(items[index]); };
  const handleWheel = (e) => { e.preventDefault(); const delta = e.deltaY > 0 ? -ITEM_HEIGHT : ITEM_HEIGHT; const { offset: s, index } = clampAndSnap(currentOffset.current + delta); currentOffset.current = s; setOffset(s); if (index >= 0 && index < items.length && items[index] !== value) onChange(items[index]); };
  const handleClick = (idx) => { const t = -idx * ITEM_HEIGHT; currentOffset.current = t; setOffset(t); if (items[idx] !== value) onChange(items[idx]); };

  return (
    <div ref={containerRef} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} onWheel={handleWheel}
      style={{ height: WHEEL_HEIGHT, overflow: "hidden", position: "relative", flex: 1, touchAction: "none", userSelect: "none", WebkitUserSelect: "none" }}>
      <div style={{ position: "absolute", top: centerPad * ITEM_HEIGHT, left: 4, right: 4, height: ITEM_HEIGHT, background: "#E8F5F0", borderRadius: 10, zIndex: 0, pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: centerPad * ITEM_HEIGHT, background: "linear-gradient(to bottom, rgba(255,255,255,0.95), rgba(255,255,255,0))", zIndex: 2, pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: centerPad * ITEM_HEIGHT, background: "linear-gradient(to top, rgba(255,255,255,0.95), rgba(255,255,255,0))", zIndex: 2, pointerEvents: "none" }} />
      <div style={{ transform: `translateY(${offset + centerPad * ITEM_HEIGHT}px)`, transition: isTouching.current ? "none" : "transform 0.25s ease-out", position: "relative", zIndex: 1 }}>
        {items.map((item, idx) => {
          const isSel = idx === Math.round(-offset / ITEM_HEIGHT);
          return (
            <div key={item} onClick={() => handleClick(idx)} style={{
              height: ITEM_HEIGHT, display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: isSel ? 18 : 15, fontWeight: isSel ? 700 : 400, color: isSel ? "#0D7A5B" : "#999", cursor: "pointer", transition: "all 0.2s",
            }}>
              {renderLabel ? renderLabel(item) : `${item}${suffix}`}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ───────────── 同步指示器 ───────────── */

function SyncIndicator({ status, onClick, t }) {
  const map = {
    idle: { icon: "☁️", text: t.sync_idle },
    syncing: { icon: "🔄", text: t.sync_syncing },
    success: { icon: "✅", text: t.sync_success },
    error: { icon: "❌", text: t.sync_error },
    disabled: { icon: "☁️", text: t.sync_not_configured },
  };
  const s = map[status] || map.idle;
  return (
    <button onClick={onClick} style={{
      background: "rgba(255,255,255,0.12)", border: "none", borderRadius: 20,
      padding: "4px 12px", color: "white", fontSize: 12, cursor: "pointer",
      display: "flex", alignItems: "center", gap: 4,
      opacity: status === "syncing" ? 0.7 : 1,
    }}>
      <span style={{ animation: status === "syncing" ? "spin 1s linear infinite" : "none", display: "inline-block" }}>{s.icon}</span>
      <span>{s.text}</span>
    </button>
  );
}

/* ───────────── 主应用 ───────────── */

export default function App() {
  // ─── 状态 ───
  const [tab, setTab] = useState("home");
  const [lang, setLang] = useState("zh");
  const [accounts, setAccounts] = useState(INITIAL_ACCOUNTS);
  const [history, setHistory] = useState(INITIAL_HISTORY);
  const [updateLog, setUpdateLog] = useState(INITIAL_LOGS); // 更新日志
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey);
  const [editMode, setEditMode] = useState(false);
  const [editValues, setEditValues] = useState({});
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [newAccount, setNewAccount] = useState({ name: "", type: "bank", icon: "🏦", balance: "" });
  const [hideAmount, setHideAmount] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [pickerYear, setPickerYear] = useState(() => parseInt(currentMonthKey.split("-")[0]));
  const [pickerMonth, setPickerMonth] = useState(() => parseInt(currentMonthKey.split("-")[1]));
  const [dataLoaded, setDataLoaded] = useState(false);
  const [detailAccountId, setDetailAccountId] = useState(null);

  // WebDAV
  const [webdavConfig, setWebdavConfig] = useState({ url: "", username: "", password: "" });
  const [webdavEnabled, setWebdavEnabled] = useState(false);
  const [syncStatus, setSyncStatus] = useState("disabled");
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [showWebdavSetup, setShowWebdavSetup] = useState(false);
  const [webdavForm, setWebdavForm] = useState({ url: "", username: "", password: "" });
  const [testResult, setTestResult] = useState(null);

  // 提醒设置
  const [reminder, setReminder] = useState({
    enabled: false,
    mode: "monthly", // "monthly" | "interval"
    dayOfMonth: 1,
    intervalDays: 7,
    time: "09:00",
    method: "notification", // "notification" | "calendar"
  });

  // Toast
  const [toast, setToast] = useState(null);
  const showToast = useCallback((msg, type = "info") => setToast({ message: msg, type, key: Date.now() }), []);

  const isInitRef = useRef(true);

  // i18n
  const t = useMemo(() => getTranslations(lang), [lang]);
  const typeLabel = useMemo(() => ({ bank: t.type_bank, fund: t.type_fund, invest: t.type_invest }), [t]);

  /* ─── 加载本地数据 ─── */
  useEffect(() => {
    const safetyTimer = setTimeout(() => {
      if (!dataLoaded) { console.warn(t.load_timeout); setDataLoaded(true); isInitRef.current = false; }
    }, 3000);

    (async () => {
      try {
        const [sAcc, sHist, sLog, sWd, sWe, sLang, sReminder] = await Promise.all([
          loadLocal("accounts"), loadLocal("history"), loadLocal("updateLog"),
          loadLocal("webdav_config"), loadLocal("webdav_enabled"),
          loadLocal("lang"), loadLocal("reminder"),
        ]);
        if (sAcc) setAccounts(sAcc);
        if (sHist) setHistory(sHist);
        if (sLog) setUpdateLog(sLog);
        if (sWd) { setWebdavConfig(sWd); setWebdavForm(sWd); }
        if (sWe) { setWebdavEnabled(true); setSyncStatus("idle"); }
        if (sLang) setLang(sLang);
        if (sReminder) setReminder(sReminder);
      } catch (e) { console.warn("Load failed:", e); }
      finally { clearTimeout(safetyTimer); setDataLoaded(true); setTimeout(() => { isInitRef.current = false; }, 500); }
    })();
    return () => clearTimeout(safetyTimer);
  }, []);

  /* ─── 自动保存 & 同步 ─── */
  useEffect(() => {
    if (!dataLoaded || isInitRef.current) return;
    (async () => {
      await saveLocal("accounts", accounts);
      await saveLocal("history", history);
      await saveLocal("updateLog", updateLog);
      if (webdavEnabled && webdavConfig.url) doSync(false);
    })();
  }, [accounts, history, updateLog, dataLoaded]);

  /* ─── WebDAV 同步 ─── */
  const doSync = useCallback(async (showMsg = true, configOverride = null) => {
    const syncConfig = configOverride || webdavConfig;
    if (!syncConfig.url || !syncConfig.username || !syncConfig.password) { if (showMsg) showToast(t.sync_fill_all, "error"); return; }
    setSyncStatus("syncing");
    try {
      const localData = { accounts, history, updateLog, lastModified: Date.now() };
      const result = await syncData(syncConfig, localData);
      if (result.ok && result.merged) {
        if (result.merged.accounts) { setAccounts(result.merged.accounts); await saveLocal("accounts", result.merged.accounts); }
        if (result.merged.history) { setHistory(result.merged.history); await saveLocal("history", result.merged.history); }
        if (result.merged.updateLog) { setUpdateLog(result.merged.updateLog); await saveLocal("updateLog", result.merged.updateLog); }
      }
      setSyncStatus("success"); setLastSyncTime(new Date());
      if (showMsg) showToast(t.sync_success, "success");
      setTimeout(() => setSyncStatus("idle"), 3000);
    } catch (err) {
      setSyncStatus("error"); if (showMsg) showToast(`${t.sync_error}: ${err.message}`, "error");
      setTimeout(() => setSyncStatus("idle"), 5000);
    }
  }, [accounts, history, updateLog, webdavConfig, showToast, t]);

  const saveWebdavConfig = async () => {
    setWebdavConfig(webdavForm); setWebdavEnabled(true); setSyncStatus("idle");
    await saveLocal("webdav_config", webdavForm); await saveLocal("webdav_enabled", true);
    setShowWebdavSetup(false); showToast(t.sync_saved, "success");
    setTimeout(() => doSync(true, webdavForm), 300);
  };

  const disableWebdav = async () => {
    setWebdavEnabled(false); setSyncStatus("disabled");
    await saveLocal("webdav_enabled", false); showToast(t.sync_disabled, "info");
  };

  const handleTestConn = async () => {
    setTestResult({ testing: true });
    setTestResult(await testConnection(webdavForm));
  };

  /* ─── 计算数据 ─── */
  const currentData = history[selectedMonth] ?? {};
  const totalAssets = accounts.reduce((s, a) => s + (currentData[a.id] ?? 0), 0);

  const sortedKeys = useMemo(() => Object.keys(history).sort(), [history]);
  const currentIdx = sortedKeys.indexOf(selectedMonth);
  const prevKey = currentIdx > 0 ? sortedKeys[currentIdx - 1] : null;
  const prevData = prevKey ? history[prevKey] : null;
  const prevTotal = prevData ? accounts.reduce((s, a) => s + (prevData[a.id] ?? 0), 0) : null;
  const totalChange = prevTotal != null ? totalAssets - prevTotal : null;
  const totalChangePct = prevTotal ? ((totalChange / prevTotal) * 100).toFixed(2) : null;

  // 折线图：填充所有缺失月份，前值延续
  const chartData = useMemo(() => {
    if (sortedKeys.length === 0) return [];
    const first = sortedKeys[0];
    const last = sortedKeys[sortedKeys.length - 1];
    const [fy, fm] = first.split("-").map(Number);
    const [ly, lm] = last.split("-").map(Number);

    const allMonths = [];
    let cy = fy, cm = fm;
    while (cy < ly || (cy === ly && cm <= lm)) {
      allMonths.push(`${cy}-${String(cm).padStart(2, "0")}`);
      cm++;
      if (cm > 12) { cm = 1; cy++; }
    }

    const years = [...new Set(allMonths.map(k => k.split("-")[0]))];
    const multiYear = years.length > 1;
    let prevValues = {}; // 前值延续

    return allMonths.map((key) => {
      const d = history[key];
      // 如果该月有数据则使用，否则延续前值
      if (d) {
        accounts.forEach((a) => { if (d[a.id] != null) prevValues[a.id] = d[a.id]; });
      }
      const total = accounts.reduce((s, a) => s + (d ? (d[a.id] ?? prevValues[a.id] ?? 0) : (prevValues[a.id] ?? 0)), 0);
      const [y, m] = key.split("-");
      const label = multiYear ? `${y.slice(2)}/${parseInt(m)}` : `${parseInt(m)}月`;
      return { month: label, total, key };
    });
  }, [history, accounts, sortedKeys]);

  /* ─── 编辑金额 ─── */
  const startEdit = () => {
    const vals = {};
    accounts.forEach((a) => { vals[a.id] = currentData[a.id] ?? ""; });
    setEditValues(vals); setEditMode(true);
  };

  const saveEdit = () => {
    const merged = { ...(history[selectedMonth] ?? {}) };
    const ts = Date.now();
    const newLogs = [];
    accounts.forEach((acc) => {
      const v = parseFloat(editValues[acc.id]);
      if (!isNaN(v)) {
        merged[acc.id] = v;
        newLogs.push({ accountId: acc.id, monthKey: selectedMonth, amount: v, timestamp: ts });
      }
    });
    setHistory((prev) => ({ ...prev, [selectedMonth]: merged }));
    // 追加更新日志
    setUpdateLog((prev) => [...prev, ...newLogs]);
    setEditMode(false);
    showToast(t.amount_updated, "success");
  };

  /* ─── 添加账户 ─── */
  const addAccount = useCallback(() => {
    const name = newAccount.name?.trim();
    if (!name) { showToast(t.enter_account_name, "error"); return; }
    const id = Date.now();
    const colorMap = { bank: "#1677FF", fund: "#07C160", invest: "#FA8C16" };
    const newAcc = { id, name, type: newAccount.type || "bank", icon: newAccount.icon || typeIcons[newAccount.type] || "🏦", color: colorMap[newAccount.type] || "#1677FF" };
    setShowAddAccount(false);
    const initialBalance = parseFloat(newAccount.balance);
    setTimeout(() => {
      setAccounts((prev) => [...prev, newAcc]);
      if (!isNaN(initialBalance) && initialBalance > 0) {
        const ts = Date.now();
        setHistory((prev) => ({ ...prev, [selectedMonth]: { ...(prev[selectedMonth] ?? {}), [id]: initialBalance } }));
        setUpdateLog((prev) => [...prev, { accountId: id, monthKey: selectedMonth, amount: initialBalance, timestamp: ts }]);
      }
      if (editMode) setEditValues((prev) => ({ ...prev, [id]: isNaN(initialBalance) ? "" : initialBalance }));
      setNewAccount({ name: "", type: "bank", icon: "🏦", balance: "" });
      showToast(t.added_account(name), "success");
    }, 50);
  }, [newAccount, editMode, selectedMonth, showToast, t]);

  const deleteAccount = (id) => {
    const acc = accounts.find(a => a.id === id);
    setAccounts((prev) => prev.filter((a) => a.id !== id));
    showToast(t.deleted_account(acc?.name || ""), "info");
  };

  const moveAccount = (id, direction) => {
    setAccounts((prev) => {
      const arr = [...prev];
      const idx = arr.findIndex(a => a.id === id);
      if (idx < 0) return prev;
      const targetIdx = idx + direction;
      if (targetIdx < 0 || targetIdx >= arr.length) return prev;
      [arr[idx], arr[targetIdx]] = [arr[targetIdx], arr[idx]];
      return arr;
    });
  };

  /* ─── 月份选择 ─── */
  const yearList = useMemo(() => { const a = []; for (let y = 2020; y <= 2030; y++) a.push(y); return a; }, []);
  const monthList = useMemo(() => { const a = []; for (let m = 1; m <= 12; m++) a.push(m); return a; }, []);
  const openMonthPicker = () => { const [y, m] = selectedMonth.split("-"); setPickerYear(parseInt(y)); setPickerMonth(parseInt(m)); setShowMonthPicker(true); };
  const confirmMonthPicker = () => { setSelectedMonth(`${pickerYear}-${String(pickerMonth).padStart(2, "0")}`); setShowMonthPicker(false); };

  /* ─── 语言切换 ─── */
  const switchLang = async (newLang) => { setLang(newLang); await saveLocal("lang", newLang); };

  /* ─── 提醒设置 ─── */
  const saveReminder = async (newReminder) => {
    setReminder(newReminder);
    await saveLocal("reminder", newReminder);
    showToast(t.reminder_save_success, "success");
  };

  // 计算下次提醒时间
  const nextReminderDate = useMemo(() => {
    if (!reminder.enabled) return null;
    const [hh, mm] = (reminder.time || "09:00").split(":").map(Number);
    const today = new Date();
    if (reminder.mode === "monthly") {
      let next = new Date(today.getFullYear(), today.getMonth(), reminder.dayOfMonth, hh, mm);
      if (next <= today) next.setMonth(next.getMonth() + 1);
      return next;
    } else {
      // interval mode: next = today + intervalDays
      const next = new Date(today);
      next.setDate(next.getDate() + (reminder.intervalDays || 7));
      next.setHours(hh, mm, 0, 0);
      return next;
    }
  }, [reminder]);

  // 生成 ICS 日历文件下载
  const addToCalendar = useCallback(() => {
    if (!nextReminderDate) return;
    const pad2 = (n) => String(n).padStart(2, "0");
    const d = nextReminderDate;
    const dtStart = `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}T${pad2(d.getHours())}${pad2(d.getMinutes())}00`;
    const endD = new Date(d.getTime() + 30 * 60000);
    const dtEnd = `${endD.getFullYear()}${pad2(endD.getMonth() + 1)}${pad2(endD.getDate())}T${pad2(endD.getHours())}${pad2(endD.getMinutes())}00`;

    // 如果是周期提醒，加 RRULE
    let rrule = "";
    if (reminder.mode === "monthly") {
      rrule = `RRULE:FREQ=MONTHLY;BYMONTHDAY=${reminder.dayOfMonth}\n`;
    } else {
      rrule = `RRULE:FREQ=DAILY;INTERVAL=${reminder.intervalDays || 7}\n`;
    }

    const title = lang === "zh" ? "更新账户余额" : "Update Account Balances";
    const desc = lang === "zh" ? "打开资产管家更新您的账户余额" : "Open Asset Manager to update your balances";

    const ics = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//AssetManager//CN",
      "BEGIN:VEVENT",
      `DTSTART:${dtStart}`, `DTEND:${dtEnd}`,
      rrule.trim(),
      `SUMMARY:${title}`, `DESCRIPTION:${desc}`,
      "BEGIN:VALARM", "TRIGGER:-PT10M", "ACTION:DISPLAY", `DESCRIPTION:${title}`, "END:VALARM",
      "END:VEVENT", "END:VCALENDAR",
    ].join("\n");

    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "asset-reminder.ics"; a.click();
    URL.revokeObjectURL(url);
    showToast(t.reminder_added_calendar, "success");
  }, [nextReminderDate, reminder, lang, t, showToast]);

  const formatDate = useCallback((d) => {
    if (!d) return "";
    if (lang === "zh") return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) + " " + String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
  }, [lang]);

  /* ─── 加载中 ─── */
  if (!dataLoaded) {
    return (
      <div style={{ minHeight: "100vh", background: "#0A4F3F", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
        <div style={{ fontSize: 48 }}>💰</div>
        <div style={{ color: "white", fontSize: 18, fontWeight: 600 }}>{t.app_name}</div>
        <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}>{t.loading}</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#F5F7FA", display: "flex", justifyContent: "center", fontFamily: "'PingFang SC', 'Helvetica Neue', Arial, sans-serif" }}>
      <style>{`
        @keyframes toastIn { from { opacity:0; transform:translateX(-50%) translateY(-20px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }
        @keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
        @keyframes slideUp { from { transform:translateY(100%); } to { transform:translateY(0); } }
      `}</style>

      {toast && <Toast key={toast.key} message={toast.message} type={toast.type} onDone={() => setToast(null)} />}

      <div style={{ width: "100%", maxWidth: 390, minHeight: "100vh", background: "#F5F7FA", position: "relative", overflow: "hidden", boxShadow: "0 0 40px rgba(0,0,0,0.12)" }}>

        {/* ═══ HOME ═══ */}
        {tab === "home" && (
          <div style={{ paddingBottom: 100 }}>
            <div style={{ background: "linear-gradient(135deg, #0A4F3F 0%, #0D7A5B 60%, #12A07A 100%)", padding: "52px 24px 32px", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: -40, right: -40, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,0.05)", pointerEvents: "none" }} />
              <div style={{ position: "absolute", top: 20, right: 20, width: 80, height: 80, borderRadius: "50%", background: "rgba(255,255,255,0.05)", pointerEvents: "none" }} />

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, position: "relative", zIndex: 1 }}>
                <span style={{ color: "rgba(255,255,255,0.75)", fontSize: 13 }}>{t.total_assets}</span>
                <div style={{ display: "flex", gap: 6 }}>
                  <SyncIndicator status={webdavEnabled ? syncStatus : "disabled"} onClick={() => webdavEnabled ? doSync(true) : setShowWebdavSetup(true)} t={t} />
                  <button onClick={() => setHideAmount(!hideAmount)} style={{ background: "rgba(255,255,255,0.12)", border: "none", borderRadius: 20, padding: "4px 12px", color: "white", fontSize: 12, cursor: "pointer" }}>
                    {hideAmount ? `👁 ${t.show}` : `🙈 ${t.hide}`}
                  </button>
                </div>
              </div>

              <div style={{ fontSize: 38, fontWeight: 700, color: "white", letterSpacing: -1, marginBottom: 6, position: "relative", zIndex: 1 }}>
                {hideAmount ? "¥ ****" : `¥${formatAmount(totalAssets)}`}
                {!hideAmount && t.yuan && <span style={{ fontSize: 16, fontWeight: 400, marginLeft: 4 }}>{t.yuan}</span>}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8, position: "relative", zIndex: 1 }}>
                <button onClick={openMonthPicker} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 20, padding: "4px 12px", color: "white", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                  📅 {selectedMonth.replace("-", lang === "zh" ? "年" : "/")} {lang === "zh" ? "月" : ""}
                </button>
                {totalChange != null && (
                  <span style={{ fontSize: 13, color: totalChange >= 0 ? "#A8FFD4" : "#FFB3B3", background: totalChange >= 0 ? "rgba(0,255,120,0.12)" : "rgba(255,80,80,0.12)", padding: "3px 10px", borderRadius: 20 }}>
                    {totalChange >= 0 ? t.up : t.down} {hideAmount ? "****" : formatAmount(Math.abs(totalChange))} ({totalChangePct}%)
                  </span>
                )}
              </div>
            </div>

            {/* 趋势图 */}
            <div style={{ background: "white", margin: "16px 16px 0", borderRadius: 16, padding: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: "#1A1A2E" }}>{t.asset_trend}</span>
                <span style={{ fontSize: 12, color: "#999" }}>{typeof t.recent_months === "function" ? t.recent_months(chartData.length) : chartData.length}</span>
              </div>
              <ResponsiveContainer width="100%" height={120}>
                <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0D7A5B" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#0D7A5B" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#BBB" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#BBB" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 10000).toFixed(0)}w`} />
                  <Tooltip contentStyle={{ borderRadius: 10, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)", fontSize: 12 }} formatter={(v) => [`¥${v.toLocaleString()}`, t.total_assets]} />
                  <Area type="monotone" dataKey="total" stroke="#0D7A5B" strokeWidth={2.5} fill="url(#totalGrad)" dot={{ r: 3, fill: "#0D7A5B", strokeWidth: 0 }} activeDot={{ r: 5, fill: "#0D7A5B" }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* 账户列表 */}
            <div style={{ margin: "16px 16px 0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: "#1A1A2E" }}>{t.account_detail}</span>
                <div style={{ display: "flex", gap: 8 }}>
                  {editMode ? (
                    <>
                      <button onClick={() => setEditMode(false)} style={{ background: "#F0F0F0", border: "none", borderRadius: 20, padding: "5px 14px", fontSize: 13, cursor: "pointer", color: "#666" }}>{t.cancel}</button>
                      <button onClick={saveEdit} style={{ background: "#0D7A5B", border: "none", borderRadius: 20, padding: "5px 14px", fontSize: 13, cursor: "pointer", color: "white", fontWeight: 600 }}>{t.save}</button>
                    </>
                  ) : (
                    <button onClick={startEdit} style={{ background: "#E8F5F0", border: "none", borderRadius: 20, padding: "5px 14px", fontSize: 13, cursor: "pointer", color: "#0D7A5B", fontWeight: 600 }}>✏️ {t.update_amount}</button>
                  )}
                </div>
              </div>

              {accounts.map((acc) => {
                const amount = currentData[acc.id] ?? 0;
                const prevAmt = prevData ? (prevData[acc.id] ?? 0) : null;
                const diff = prevAmt != null ? amount - prevAmt : null;
                return (
                  <div key={acc.id} style={{ background: "white", borderRadius: 14, padding: "14px 16px", marginBottom: 10, boxShadow: "0 2px 10px rgba(0,0,0,0.05)", display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", background: acc.color + "18", fontSize: 22, flexShrink: 0 }}>{acc.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#1A1A2E", marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{acc.name}</div>
                      <span style={{ fontSize: 11, color: typeColors[acc.type], background: typeColors[acc.type] + "18", padding: "2px 8px", borderRadius: 10 }}>{typeLabel[acc.type]}</span>
                    </div>
                    {editMode ? (
                      <input type="number" inputMode="decimal" value={editValues[acc.id] ?? ""} onChange={(e) => setEditValues((p) => ({ ...p, [acc.id]: e.target.value }))}
                        style={{ width: 110, border: "1.5px solid #0D7A5B", borderRadius: 8, padding: "6px 10px", fontSize: 14, textAlign: "right", outline: "none", color: "#1A1A2E", boxSizing: "border-box" }} />
                    ) : (
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontSize: 16, fontWeight: 700, color: "#1A1A2E" }}>{hideAmount ? "****" : `¥${formatAmount(amount)}`}</div>
                        {diff != null && amount > 0 && (
                          <div style={{ fontSize: 11, color: diff >= 0 ? "#07C160" : "#FF4D4F", marginTop: 2 }}>{diff >= 0 ? "▲" : "▼"} {formatAmount(Math.abs(diff))}</div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              <button onClick={() => setShowAddAccount(true)} style={{ width: "100%", background: "white", border: "2px dashed #D0E8DF", borderRadius: 14, padding: 16, fontSize: 14, color: "#0D7A5B", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                ＋ {t.add_account}
              </button>
            </div>
          </div>
        )}

        {/* ═══ ANALYSIS ═══ */}
        {tab === "analysis" && (
          <div style={{ paddingBottom: 100 }}>
            <div style={{ background: "linear-gradient(135deg, #0A4F3F 0%, #0D7A5B 100%)", padding: "52px 24px 24px" }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: "white" }}>{t.analysis}</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", marginTop: 4 }}>{t.click_to_detail}</div>
            </div>
            <div style={{ margin: 16 }}>
              {accounts.map((acc) => {
                // 填充连续月份
                const allM = chartData.map(d => d.key);
                let prevVal = 0;
                const data = allM.map((key) => {
                  const v = history[key]?.[acc.id];
                  if (v != null) prevVal = v;
                  const [y, m] = key.split("-");
                  const multiY = [...new Set(allM.map(k => k.split("-")[0]))].length > 1;
                  const label = multiY ? `${y.slice(2)}/${parseInt(m)}` : `${parseInt(m)}月`;
                  return { month: label, value: v != null ? v : prevVal };
                });
                const latest = data[data.length - 1]?.value ?? 0;
                const prev2 = data.length >= 2 ? data[data.length - 2]?.value ?? 0 : 0;
                const diff = latest - prev2;
                return (
                  <div key={acc.id} onClick={() => setDetailAccountId(acc.id)}
                    style={{ background: "white", borderRadius: 16, padding: 16, marginBottom: 12, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", cursor: "pointer", transition: "transform 0.15s" }}
                    onTouchStart={(e) => e.currentTarget.style.transform = "scale(0.98)"} onTouchEnd={(e) => e.currentTarget.style.transform = "scale(1)"}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 20 }}>{acc.icon}</span>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600 }}>{acc.name}</div>
                          <div style={{ fontSize: 12, color: "#999" }}>{typeLabel[acc.type]}</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 16, fontWeight: 700 }}>¥{formatAmount(latest)}</div>
                          <div style={{ fontSize: 11, color: diff >= 0 ? "#07C160" : "#FF4D4F" }}>{diff >= 0 ? "▲" : "▼"} {formatAmount(Math.abs(diff))}</div>
                        </div>
                        <span style={{ fontSize: 14, color: "#CCC" }}>›</span>
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height={70}>
                      <LineChart data={data} margin={{ top: 2, right: 5, left: -30, bottom: 0 }}>
                        <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#CCC" }} axisLine={false} tickLine={false} />
                        <YAxis hide />
                        <Tooltip contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 2px 12px rgba(0,0,0,0.1)", fontSize: 12 }} formatter={(v) => [`¥${v.toLocaleString()}`, acc.name]} />
                        <Line type="monotone" dataKey="value" stroke={acc.color} strokeWidth={2} dot={false} activeDot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                );
              })}
            </div>
            <div style={{ background: "white", margin: "0 16px 16px", borderRadius: 16, padding: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>{t.month_ratio}</div>
              {accounts.map((acc) => {
                const amount = currentData[acc.id] ?? 0;
                const pct = totalAssets > 0 ? ((amount / totalAssets) * 100).toFixed(1) : 0;
                return (
                  <div key={acc.id} style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 13 }}>
                      <span>{acc.icon} {acc.name}</span>
                      <span style={{ fontWeight: 600 }}>{pct}%</span>
                    </div>
                    <div style={{ height: 7, background: "#F0F0F0", borderRadius: 10, overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: acc.color, borderRadius: 10, transition: "width 0.6s ease" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══ SETTINGS ═══ */}
        {tab === "settings" && (
          <div style={{ paddingBottom: 100 }}>
            <div style={{ background: "linear-gradient(135deg, #0A4F3F 0%, #0D7A5B 100%)", padding: "52px 24px 24px" }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: "white" }}>{t.settings}</div>
            </div>
            <div style={{ margin: 16 }}>

              {/* 语言切换 */}
              <div style={{ background: "white", borderRadius: 16, padding: 16, marginBottom: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <span style={{ fontSize: 20 }}>🌐</span>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{t.language_setting}</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {SUPPORTED_LANGS.map((l) => (
                    <button key={l.code} onClick={() => switchLang(l.code)} style={{
                      flex: 1, padding: "10px", border: `2px solid ${lang === l.code ? "#0D7A5B" : "#E0E0E0"}`,
                      borderRadius: 10, background: lang === l.code ? "#E8F5F0" : "white",
                      color: lang === l.code ? "#0D7A5B" : "#666", fontSize: 14, fontWeight: 600, cursor: "pointer",
                    }}>{l.label}</button>
                  ))}
                </div>
              </div>

              {/* 余额更新提醒 */}
              <div style={{ background: "white", borderRadius: 16, padding: 16, marginBottom: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 20 }}>⏰</span>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{t.reminder_setting}</div>
                      <div style={{ fontSize: 12, color: "#999" }}>{t.reminder_desc}</div>
                    </div>
                  </div>
                </div>

                {/* 开关 & 模式 */}
                <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                  {[
                    { val: false, label: t.reminder_off },
                    { val: "monthly", label: t.reminder_monthly },
                    { val: "interval", label: t.reminder_interval },
                  ].map((opt) => {
                    const isActive = opt.val === false ? !reminder.enabled : (reminder.enabled && reminder.mode === opt.val);
                    return (
                      <button key={String(opt.val)} onClick={() => {
                        if (opt.val === false) saveReminder({ ...reminder, enabled: false });
                        else saveReminder({ ...reminder, enabled: true, mode: opt.val });
                      }} style={{
                        flex: 1, padding: "8px 4px", border: `2px solid ${isActive ? "#0D7A5B" : "#E0E0E0"}`,
                        borderRadius: 10, background: isActive ? "#E8F5F0" : "white",
                        color: isActive ? "#0D7A5B" : "#666", fontSize: 12, fontWeight: 600, cursor: "pointer",
                      }}>{opt.label}</button>
                    );
                  })}
                </div>

                {reminder.enabled && (
                  <>
                    {/* 参数 */}
                    {reminder.mode === "monthly" && (
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 13, color: "#666", marginBottom: 6 }}>{t.reminder_day_of_month}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <input type="number" min="1" max="28" value={reminder.dayOfMonth}
                            onChange={(e) => { const v = Math.min(28, Math.max(1, parseInt(e.target.value) || 1)); saveReminder({ ...reminder, dayOfMonth: v }); }}
                            style={{ width: 70, border: "1.5px solid #E0E0E0", borderRadius: 8, padding: "8px 12px", fontSize: 14, textAlign: "center", outline: "none" }} />
                          <span style={{ fontSize: 13, color: "#999" }}>{t.reminder_day_suffix}</span>
                        </div>
                      </div>
                    )}
                    {reminder.mode === "interval" && (
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 13, color: "#666", marginBottom: 6 }}>{t.reminder_interval_days}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <input type="number" min="1" max="90" value={reminder.intervalDays}
                            onChange={(e) => { const v = Math.min(90, Math.max(1, parseInt(e.target.value) || 7)); saveReminder({ ...reminder, intervalDays: v }); }}
                            style={{ width: 70, border: "1.5px solid #E0E0E0", borderRadius: 8, padding: "8px 12px", fontSize: 14, textAlign: "center", outline: "none" }} />
                          <span style={{ fontSize: 13, color: "#999" }}>{t.reminder_interval_suffix}</span>
                        </div>
                      </div>
                    )}

                    {/* 时间 */}
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 13, color: "#666", marginBottom: 6 }}>{t.reminder_time}</div>
                      <input type="time" value={reminder.time}
                        onChange={(e) => saveReminder({ ...reminder, time: e.target.value })}
                        style={{ border: "1.5px solid #E0E0E0", borderRadius: 8, padding: "8px 12px", fontSize: 14, outline: "none" }} />
                    </div>

                    {/* 添加到日历 */}
                    <button onClick={addToCalendar} style={{
                      width: "100%", background: "#0D7A5B", border: "none", borderRadius: 10,
                      padding: 12, fontSize: 14, color: "white", cursor: "pointer", fontWeight: 600,
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    }}>
                      📅 {t.reminder_calendar}
                    </button>

                    {/* 下次提醒预览 */}
                    {nextReminderDate && (
                      <div style={{ marginTop: 10, fontSize: 12, color: "#999", textAlign: "center" }}>
                        {t.reminder_preview}: {formatDate(nextReminderDate)}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* WebDAV */}
              <div style={{ background: "white", borderRadius: 16, padding: 16, marginBottom: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 20 }}>☁️</span>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{t.webdav_sync}</div>
                      <div style={{ fontSize: 12, color: "#999" }}>
                        {webdavEnabled ? `${t.connected} · ${lastSyncTime ? lastSyncTime.toLocaleTimeString() : t.waiting_sync}` : t.sync_not_configured}
                      </div>
                    </div>
                  </div>
                  {webdavEnabled && (
                    <button onClick={() => doSync(true)} style={{ background: "#E8F5F0", border: "none", borderRadius: 20, padding: "6px 14px", fontSize: 13, color: "#0D7A5B", cursor: "pointer", fontWeight: 600 }}>
                      🔄 {t.sync_now}
                    </button>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => { setWebdavForm(webdavConfig); setShowWebdavSetup(true); setTestResult(null); }}
                    style={{ flex: 1, background: "#0D7A5B", border: "none", borderRadius: 10, padding: 10, fontSize: 14, color: "white", cursor: "pointer", fontWeight: 600 }}>
                    {webdavEnabled ? t.modify_config : t.config_webdav}
                  </button>
                  {webdavEnabled && (
                    <button onClick={disableWebdav} style={{ background: "#FFF0F0", border: "none", borderRadius: 10, padding: "10px 16px", fontSize: 14, color: "#FF4D4F", cursor: "pointer" }}>{t.close}</button>
                  )}
                </div>
              </div>

              {/* 账户管理 */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#1A1A2E" }}>{t.account_manage}</div>
                <span style={{ fontSize: 11, color: "#BBB" }}>{t.account_sort}</span>
              </div>
              {accounts.map((acc, idx) => (
                <div key={acc.id} style={{ background: "white", borderRadius: 14, padding: "12px 12px 12px 16px", marginBottom: 10, boxShadow: "0 2px 10px rgba(0,0,0,0.05)", display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: acc.color + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{acc.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{acc.name}</div>
                    <span style={{ fontSize: 11, color: typeColors[acc.type], background: typeColors[acc.type] + "18", padding: "2px 8px", borderRadius: 10 }}>{typeLabel[acc.type]}</span>
                  </div>
                  {/* 排序按钮 */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 2, flexShrink: 0 }}>
                    <button onClick={() => moveAccount(acc.id, -1)} disabled={idx === 0} style={{
                      width: 28, height: 24, border: "none", borderRadius: "6px 6px 2px 2px",
                      background: idx === 0 ? "#F5F5F5" : "#E8F5F0", color: idx === 0 ? "#CCC" : "#0D7A5B",
                      fontSize: 12, cursor: idx === 0 ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                    }}>▲</button>
                    <button onClick={() => moveAccount(acc.id, 1)} disabled={idx === accounts.length - 1} style={{
                      width: 28, height: 24, border: "none", borderRadius: "2px 2px 6px 6px",
                      background: idx === accounts.length - 1 ? "#F5F5F5" : "#E8F5F0", color: idx === accounts.length - 1 ? "#CCC" : "#0D7A5B",
                      fontSize: 12, cursor: idx === accounts.length - 1 ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                    }}>▼</button>
                  </div>
                  <button onClick={() => deleteAccount(acc.id)} style={{ background: "#FFF0F0", border: "none", borderRadius: 8, padding: "6px 10px", color: "#FF4D4F", fontSize: 13, cursor: "pointer", flexShrink: 0 }}>{t.delete}</button>
                </div>
              ))}
              <button onClick={() => setShowAddAccount(true)} style={{ width: "100%", background: "#E8F5F0", border: "none", borderRadius: 14, padding: 16, fontSize: 15, fontWeight: 600, color: "#0D7A5B", cursor: "pointer" }}>
                ＋ {t.add_new_account}
              </button>
            </div>
          </div>
        )}

        {/* Bottom Nav */}
        <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 390, background: "white", borderTop: "1px solid #F0F0F0", display: "flex", paddingBottom: "env(safe-area-inset-bottom, 8px)", boxShadow: "0 -4px 20px rgba(0,0,0,0.06)" }}>
          {[
            { id: "home", icon: "🏠", label: t.tab_home },
            { id: "analysis", icon: "📊", label: t.tab_analysis },
            { id: "settings", icon: "⚙️", label: t.tab_settings },
          ].map((item) => (
            <button key={item.id} onClick={() => setTab(item.id)} style={{ flex: 1, background: "none", border: "none", padding: "10px 0", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
              <span style={{ fontSize: 22 }}>{item.icon}</span>
              <span style={{ fontSize: 11, color: tab === item.id ? "#0D7A5B" : "#999", fontWeight: tab === item.id ? 700 : 400 }}>{item.label}</span>
              {tab === item.id && <div style={{ width: 20, height: 3, background: "#0D7A5B", borderRadius: 2 }} />}
            </button>
          ))}
        </div>
      </div>

      {/* ═══ MODALS ═══ */}

      {/* 月份选择 */}
      {showMonthPicker && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "flex-end", zIndex: 200, justifyContent: "center", animation: "fadeIn 0.2s ease" }} onClick={() => setShowMonthPicker(false)}>
          <div style={{ background: "white", borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 390, padding: "0 0 20px", animation: "slideUp 0.3s ease" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px" }}>
              <button onClick={() => setShowMonthPicker(false)} style={{ background: "none", border: "none", fontSize: 15, color: "#999", cursor: "pointer", padding: "4px 8px" }}>{t.cancel}</button>
              <span style={{ fontSize: 16, fontWeight: 700, color: "#1A1A2E" }}>{t.select_month}</span>
              <button onClick={confirmMonthPicker} style={{ background: "none", border: "none", fontSize: 15, color: "#0D7A5B", fontWeight: 700, cursor: "pointer", padding: "4px 8px" }}>{t.confirm}</button>
            </div>
            <div style={{ display: "flex", padding: "0 20px", gap: 8 }}>
              <ScrollColumn items={yearList} value={pickerYear} onChange={setPickerYear} suffix={t.year_suffix} />
              <ScrollColumn items={monthList} value={pickerMonth} onChange={setPickerMonth} suffix={t.month_suffix} />
            </div>
            <div style={{ textAlign: "center", marginTop: 12, fontSize: 13, color: "#999" }}>{t.selected}: {pickerYear}{t.year_suffix} {pickerMonth}{t.month_suffix}</div>
          </div>
        </div>
      )}

      {/* 添加账户 */}
      {showAddAccount && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "flex-end", zIndex: 200, justifyContent: "center", animation: "fadeIn 0.2s ease" }} onClick={() => setShowAddAccount(false)}>
          <div style={{ background: "white", borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 390, padding: 24, maxHeight: "90vh", overflowY: "auto", animation: "slideUp 0.3s ease" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, textAlign: "center" }}>{t.add_account}</div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 13, color: "#666", marginBottom: 6 }}>{t.account_name}</div>
              <input value={newAccount.name} onChange={(e) => setNewAccount((p) => ({ ...p, name: e.target.value }))} placeholder={t.account_name_placeholder}
                style={{ width: "100%", border: "1.5px solid #E0E0E0", borderRadius: 10, padding: "10px 14px", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 13, color: "#666", marginBottom: 6 }}>{t.account_type}</div>
              <div style={{ display: "flex", gap: 8 }}>
                {Object.entries(typeLabel).map(([k, v]) => (
                  <button key={k} onClick={() => setNewAccount((p) => ({ ...p, type: k, icon: typeIcons[k] }))} style={{
                    flex: 1, padding: "8px", border: `2px solid ${newAccount.type === k ? typeColors[k] : "#E0E0E0"}`,
                    borderRadius: 10, background: newAccount.type === k ? typeColors[k] + "18" : "white",
                    color: newAccount.type === k ? typeColors[k] : "#666", fontSize: 13, fontWeight: 600, cursor: "pointer",
                  }}>{v}</button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 13, color: "#666", marginBottom: 6 }}>{t.icon}</div>
              <div style={{ display: "flex", gap: 8 }}>
                {["🏦", "💰", "📈", "💛", "💎", "🏧", "💳", "🪙"].map((ic) => (
                  <button key={ic} onClick={() => setNewAccount((p) => ({ ...p, icon: ic }))} style={{
                    width: 44, height: 44, border: `2px solid ${newAccount.icon === ic ? "#0D7A5B" : "#E0E0E0"}`,
                    borderRadius: 10, background: newAccount.icon === ic ? "#E8F5F0" : "none", fontSize: 22, cursor: "pointer",
                  }}>{ic}</button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, color: "#666", marginBottom: 6 }}>{t.current_balance}</div>
              <input type="number" inputMode="decimal" value={newAccount.balance} onChange={(e) => setNewAccount((p) => ({ ...p, balance: e.target.value }))} placeholder={t.balance_placeholder}
                style={{ width: "100%", border: "1.5px solid #E0E0E0", borderRadius: 10, padding: "10px 14px", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
            </div>
            <button onClick={addAccount} style={{ width: "100%", background: "#0D7A5B", border: "none", borderRadius: 12, padding: 14, fontSize: 15, fontWeight: 700, color: "white", cursor: "pointer" }}>{t.add}</button>
          </div>
        </div>
      )}

      {/* 账户更新明细 */}
      {detailAccountId != null && (() => {
        const acc = accounts.find(a => a.id === detailAccountId);
        if (!acc) return null;

        // 从 updateLog 取该账户的真实记录
        const accLogs = updateLog
          .filter((log) => log.accountId === acc.id)
          .sort((a, b) => b.timestamp - a.timestamp); // 倒序

        // 去重：同一 monthKey 只取最新的一条
        const seen = new Set();
        const uniqueLogs = [];
        accLogs.forEach((log) => {
          if (!seen.has(log.monthKey)) {
            seen.add(log.monthKey);
            uniqueLogs.push(log);
          }
        });

        // 计算与前一条的差值
        const records = uniqueLogs.map((log, idx) => {
          const d = new Date(log.timestamp);
          const dateStr = lang === "zh"
            ? `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
            : d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
          const timeStr = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
          const nextLog = uniqueLogs[idx + 1]; // 前一条（时间更早）
          const diff = nextLog ? log.amount - nextLog.amount : null;
          return { ...log, dateStr, timeStr, diff };
        });

        return (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "flex-end", zIndex: 200, justifyContent: "center", animation: "fadeIn 0.2s ease" }}
            onClick={() => setDetailAccountId(null)}>
            <div style={{ background: "white", borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 390, maxHeight: "85vh", display: "flex", flexDirection: "column", animation: "slideUp 0.3s ease" }}
              onClick={(e) => e.stopPropagation()}>
              <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid #F0F0F0", flexShrink: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", background: acc.color + "18", fontSize: 22 }}>{acc.icon}</div>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: "#1A1A2E" }}>{acc.name}</div>
                      <span style={{ fontSize: 11, color: typeColors[acc.type], background: typeColors[acc.type] + "18", padding: "2px 8px", borderRadius: 10 }}>{typeLabel[acc.type]}</span>
                    </div>
                  </div>
                  <button onClick={() => setDetailAccountId(null)} style={{ background: "#F5F7FA", border: "none", borderRadius: 20, width: 32, height: 32, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#999" }}>✕</button>
                </div>
                <div style={{ marginTop: 12, fontSize: 13, color: "#999" }}>
                  {typeof t.total_records === "function" ? t.total_records(records.length) : records.length}
                </div>
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: "8px 20px 20px" }}>
                {records.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 0", color: "#CCC", fontSize: 14 }}>{t.no_records}</div>
                ) : records.map((r, idx) => (
                  <div key={`${r.monthKey}-${r.timestamp}`} style={{ display: "flex", alignItems: "flex-start", padding: "14px 0", borderBottom: idx < records.length - 1 ? "1px solid #F5F5F5" : "none" }}>
                    <div style={{ width: 36, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 4 }}>
                      <div style={{ width: 10, height: 10, borderRadius: "50%", background: idx === 0 ? acc.color : "#E0E0E0", border: idx === 0 ? `2px solid ${acc.color}33` : "none" }} />
                      {idx < records.length - 1 && <div style={{ width: 1, height: 30, background: "#EBEBEB", marginTop: 4 }} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <span style={{ fontSize: 13, color: "#999" }}>{r.dateStr}</span>
                        <span style={{ fontSize: 11, color: "#CCC" }}>{r.timeStr}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ fontSize: 16, fontWeight: 700, color: "#1A1A2E" }}>¥{r.amount.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}</div>
                        {r.diff != null && (
                          <span style={{ fontSize: 12, fontWeight: 600, color: r.diff >= 0 ? "#07C160" : "#FF4D4F", background: r.diff >= 0 ? "#07C16012" : "#FF4D4F12", padding: "2px 10px", borderRadius: 20 }}>
                            {r.diff >= 0 ? "+" : ""}{formatAmount(r.diff)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {/* WebDAV 配置 */}
      {showWebdavSetup && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "flex-end", zIndex: 200, justifyContent: "center", animation: "fadeIn 0.2s ease" }} onClick={() => setShowWebdavSetup(false)}>
          <div style={{ background: "white", borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 390, padding: 24, maxHeight: "90vh", overflowY: "auto", animation: "slideUp 0.3s ease" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6, textAlign: "center" }}>{t.webdav_sync}</div>
            <div style={{ fontSize: 12, color: "#999", textAlign: "center", marginBottom: 20 }}>{t.webdav_subtitle}</div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 13, color: "#666", marginBottom: 6 }}>{t.server_url}</div>
              <input value={webdavForm.url} onChange={(e) => setWebdavForm((p) => ({ ...p, url: e.target.value }))} placeholder="https://dav.jianguoyun.com/dav/sync/"
                style={{ width: "100%", border: "1.5px solid #E0E0E0", borderRadius: 10, padding: "10px 14px", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 13, color: "#666", marginBottom: 6 }}>{t.username}</div>
              <input value={webdavForm.username} onChange={(e) => setWebdavForm((p) => ({ ...p, username: e.target.value }))} placeholder={t.username_placeholder}
                style={{ width: "100%", border: "1.5px solid #E0E0E0", borderRadius: 10, padding: "10px 14px", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: "#666", marginBottom: 6 }}>{t.password}</div>
              <input type="password" value={webdavForm.password} onChange={(e) => setWebdavForm((p) => ({ ...p, password: e.target.value }))} placeholder={t.password_placeholder}
                style={{ width: "100%", border: "1.5px solid #E0E0E0", borderRadius: 10, padding: "10px 14px", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
            </div>
            {testResult && (
              <div style={{ padding: "10px 14px", borderRadius: 10, marginBottom: 14, fontSize: 13,
                background: testResult.testing ? "#FFF8E1" : testResult.ok ? "#E8F5E9" : "#FFEBEE",
                color: testResult.testing ? "#F57F17" : testResult.ok ? "#2E7D32" : "#C62828" }}>
                {testResult.testing ? `🔄 ${t.testing}` : testResult.ok ? `✅ ${t.conn_success}` : `❌ ${testResult.message}`}
              </div>
            )}
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={handleTestConn} style={{ flex: 1, background: "#F5F7FA", border: "1.5px solid #E0E0E0", borderRadius: 12, padding: 14, fontSize: 14, fontWeight: 600, color: "#333", cursor: "pointer" }}>{t.test_connection}</button>
              <button onClick={saveWebdavConfig} style={{ flex: 1, background: "#0D7A5B", border: "none", borderRadius: 12, padding: 14, fontSize: 14, fontWeight: 700, color: "white", cursor: "pointer" }}>{t.save_and_sync}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
