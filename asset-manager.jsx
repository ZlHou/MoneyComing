import { useState, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";

const INITIAL_ACCOUNTS = [
  { id: 1, name: "招商银行", type: "bank", icon: "🏦", color: "#E31837" },
  { id: 2, name: "支付宝余额宝", type: "fund", icon: "💛", color: "#FF6010" },
  { id: 3, name: "微信零钱通", type: "fund", icon: "💚", color: "#07C160" },
  { id: 4, name: "沪深300基金", type: "invest", icon: "📈", color: "#1677FF" },
];

const MONTHS = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];

const INITIAL_HISTORY = {
  "2024-10": { 1: 45200, 2: 12300, 3: 8400, 4: 30000 },
  "2024-11": { 1: 47500, 2: 13100, 3: 8900, 4: 28500 },
  "2024-12": { 1: 51000, 2: 14200, 3: 9200, 4: 32000 },
  "2025-01": { 1: 53400, 2: 15000, 3: 9800, 4: 31500 },
  "2025-02": { 1: 55000, 2: 16200, 3: 10100, 4: 33800 },
  "2025-03": { 1: 58200, 2: 17500, 3: 10800, 4: 35200 },
};

const now = new Date();
const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

function formatAmount(n) {
  if (n >= 10000) return `${(n / 10000).toFixed(2)}万`;
  return n?.toLocaleString("zh-CN") ?? "0";
}

function formatFull(n) {
  return `¥${n?.toLocaleString("zh-CN", { minimumFractionDigits: 2 }) ?? "0.00"}`;
}

const typeLabel = { bank: "银行", fund: "理财", invest: "投资" };
const typeColors = { bank: "#1677FF", fund: "#07C160", invest: "#FA8C16" };

export default function App() {
  const [tab, setTab] = useState("home");
  const [accounts, setAccounts] = useState(INITIAL_ACCOUNTS);
  const [history, setHistory] = useState(INITIAL_HISTORY);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey);
  const [editMode, setEditMode] = useState(false);
  const [editValues, setEditValues] = useState({});
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [newAccount, setNewAccount] = useState({ name: "", type: "bank", icon: "🏦" });
  const [hideAmount, setHideAmount] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  const currentData = history[selectedMonth] ?? {};
  const totalAssets = accounts.reduce((sum, acc) => sum + (currentData[acc.id] ?? 0), 0);

  // Previous month
  const sortedKeys = Object.keys(history).sort();
  const currentIdx = sortedKeys.indexOf(selectedMonth);
  const prevKey = currentIdx > 0 ? sortedKeys[currentIdx - 1] : null;
  const prevData = prevKey ? history[prevKey] : null;
  const prevTotal = prevData ? accounts.reduce((sum, acc) => sum + (prevData[acc.id] ?? 0), 0) : null;
  const totalChange = prevTotal != null ? totalAssets - prevTotal : null;
  const totalChangePct = prevTotal ? ((totalChange / prevTotal) * 100).toFixed(2) : null;

  // Chart data
  const chartData = useMemo(() => {
    return sortedKeys.map((key) => {
      const d = history[key];
      const total = accounts.reduce((sum, acc) => sum + (d[acc.id] ?? 0), 0);
      const [y, m] = key.split("-");
      return { month: `${m}月`, total, key, year: y };
    });
  }, [history, accounts]);

  const startEdit = () => {
    const vals = {};
    accounts.forEach((acc) => {
      vals[acc.id] = currentData[acc.id] ?? "";
    });
    setEditValues(vals);
    setEditMode(true);
  };

  const saveEdit = () => {
    const updated = { ...history };
    // Bug fix: merge into existing month data instead of wiping,
    // preserving values for accounts not currently in editValues.
    const merged = { ...(history[selectedMonth] ?? {}) };
    accounts.forEach((acc) => {
      const v = parseFloat(editValues[acc.id]);
      if (!isNaN(v)) merged[acc.id] = v;
    });
    updated[selectedMonth] = merged;
    setHistory(updated);
    setEditMode(false);
  };

  const addAccount = () => {
    if (!newAccount.name.trim()) return;
    const id = Date.now();
    const colors = { bank: "#1677FF", fund: "#07C160", invest: "#FA8C16" };
    const newAcc = { id, ...newAccount, color: colors[newAccount.type] };
    setAccounts((prev) => [...prev, newAcc]);
    // Bug fix: if edit mode is active, inject the new account into editValues
    // so it appears as an editable field immediately without stale state.
    if (editMode) {
      setEditValues((prev) => ({ ...prev, [id]: "" }));
    }
    setNewAccount({ name: "", type: "bank", icon: "🏦" });
    setShowAddAccount(false);
  };

  const deleteAccount = (id) => {
    setAccounts(accounts.filter((a) => a.id !== id));
  };

  // Month picker options
  const monthOptions = [];
  for (let y = 2024; y <= 2026; y++) {
    for (let m = 1; m <= 12; m++) {
      const key = `${y}-${String(m).padStart(2, "0")}`;
      monthOptions.push({ key, label: `${y}年${m}月` });
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#F5F7FA",
      display: "flex",
      justifyContent: "center",
      fontFamily: "'PingFang SC', 'Helvetica Neue', Arial, sans-serif",
    }}>
      <div style={{
        width: "100%",
        maxWidth: 390,
        minHeight: "100vh",
        background: "#F5F7FA",
        position: "relative",
        overflow: "hidden",
        boxShadow: "0 0 40px rgba(0,0,0,0.12)",
      }}>

        {/* HOME TAB */}
        {tab === "home" && (
          <div style={{ paddingBottom: 80 }}>
            {/* Header Card */}
            <div style={{
              background: "linear-gradient(135deg, #0A4F3F 0%, #0D7A5B 60%, #12A07A 100%)",
              padding: "52px 24px 32px",
              position: "relative",
              overflow: "hidden",
            }}>
              {/* Decorative circles */}
              <div style={{ position: "absolute", top: -40, right: -40, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,0.05)" }} />
              <div style={{ position: "absolute", top: 20, right: 20, width: 80, height: 80, borderRadius: "50%", background: "rgba(255,255,255,0.05)" }} />

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ color: "rgba(255,255,255,0.75)", fontSize: 13 }}>总资产</span>
                <button onClick={() => setHideAmount(!hideAmount)} style={{
                  background: "rgba(255,255,255,0.12)", border: "none", borderRadius: 20,
                  padding: "4px 12px", color: "white", fontSize: 12, cursor: "pointer"
                }}>
                  {hideAmount ? "👁 显示" : "🙈 隐藏"}
                </button>
              </div>

              <div style={{ fontSize: 38, fontWeight: 700, color: "white", letterSpacing: -1, marginBottom: 6 }}>
                {hideAmount ? "¥ ****" : `¥${formatAmount(totalAssets)}`}
                {!hideAmount && <span style={{ fontSize: 16, fontWeight: 400, marginLeft: 4 }}>元</span>}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button onClick={() => setShowMonthPicker(true)} style={{
                  background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 20,
                  padding: "4px 12px", color: "white", fontSize: 13, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 4
                }}>
                  📅 {selectedMonth.replace("-", "年")}月
                </button>
                {totalChange != null && (
                  <span style={{
                    fontSize: 13, color: totalChange >= 0 ? "#A8FFD4" : "#FFB3B3",
                    background: totalChange >= 0 ? "rgba(0,255,120,0.12)" : "rgba(255,80,80,0.12)",
                    padding: "3px 10px", borderRadius: 20,
                  }}>
                    {totalChange >= 0 ? "▲" : "▼"} {hideAmount ? "****" : formatAmount(Math.abs(totalChange))} ({totalChangePct}%)
                  </span>
                )}
              </div>
            </div>

            {/* Quick Chart */}
            <div style={{ background: "white", margin: "16px 16px 0", borderRadius: 16, padding: "16px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: "#1A1A2E" }}>资产趋势</span>
                <span style={{ fontSize: 12, color: "#999" }}>近{chartData.length}个月</span>
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
                  <Tooltip
                    contentStyle={{ borderRadius: 10, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)", fontSize: 12 }}
                    formatter={(v) => [`¥${v.toLocaleString()}`, "总资产"]}
                  />
                  <Area type="monotone" dataKey="total" stroke="#0D7A5B" strokeWidth={2} fill="url(#totalGrad)" dot={false} activeDot={{ r: 4, fill: "#0D7A5B" }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Account List */}
            <div style={{ margin: "16px 16px 0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: "#1A1A2E" }}>账户明细</span>
                <div style={{ display: "flex", gap: 8 }}>
                  {editMode ? (
                    <>
                      <button onClick={() => setEditMode(false)} style={{ background: "#F0F0F0", border: "none", borderRadius: 20, padding: "5px 14px", fontSize: 13, cursor: "pointer", color: "#666" }}>取消</button>
                      <button onClick={saveEdit} style={{ background: "#0D7A5B", border: "none", borderRadius: 20, padding: "5px 14px", fontSize: 13, cursor: "pointer", color: "white", fontWeight: 600 }}>保存</button>
                    </>
                  ) : (
                    <button onClick={startEdit} style={{ background: "#E8F5F0", border: "none", borderRadius: 20, padding: "5px 14px", fontSize: 13, cursor: "pointer", color: "#0D7A5B", fontWeight: 600 }}>✏️ 更新金额</button>
                  )}
                </div>
              </div>

              {accounts.map((acc) => {
                const amount = currentData[acc.id] ?? 0;
                const prevAmt = prevData ? (prevData[acc.id] ?? 0) : null;
                const diff = prevAmt != null ? amount - prevAmt : null;
                return (
                  <div key={acc.id} style={{
                    background: "white", borderRadius: 14, padding: "14px 16px", marginBottom: 10,
                    boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
                    display: "flex", alignItems: "center", gap: 12, transition: "all 0.2s",
                  }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center",
                      background: acc.color + "18", fontSize: 22, flexShrink: 0,
                    }}>{acc.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#1A1A2E", marginBottom: 3 }}>{acc.name}</div>
                      <span style={{ fontSize: 11, color: typeColors[acc.type], background: typeColors[acc.type] + "18", padding: "2px 8px", borderRadius: 10 }}>
                        {typeLabel[acc.type]}
                      </span>
                    </div>
                    {editMode ? (
                      <input
                        type="number"
                        value={editValues[acc.id] ?? ""}
                        onChange={(e) => setEditValues({ ...editValues, [acc.id]: e.target.value })}
                        placeholder="输入金额"
                        style={{
                          width: 110, border: "1.5px solid #0D7A5B", borderRadius: 8, padding: "6px 10px",
                          fontSize: 14, textAlign: "right", outline: "none", color: "#1A1A2E",
                        }}
                      />
                    ) : (
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 16, fontWeight: 700, color: "#1A1A2E" }}>
                          {hideAmount ? "****" : `¥${formatAmount(amount)}`}
                        </div>
                        {diff != null && amount > 0 && (
                          <div style={{ fontSize: 11, color: diff >= 0 ? "#07C160" : "#FF4D4F", marginTop: 2 }}>
                            {diff >= 0 ? "▲" : "▼"} {formatAmount(Math.abs(diff))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              <button onClick={() => setShowAddAccount(true)} style={{
                width: "100%", background: "white", border: "2px dashed #D0E8DF", borderRadius: 14,
                padding: 16, fontSize: 14, color: "#0D7A5B", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}>
                ＋ 添加账户
              </button>
            </div>
          </div>
        )}

        {/* ANALYSIS TAB */}
        {tab === "analysis" && (
          <div style={{ paddingBottom: 80 }}>
            <div style={{
              background: "linear-gradient(135deg, #0A4F3F 0%, #0D7A5B 100%)",
              padding: "52px 24px 24px",
            }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: "white" }}>资产分析</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", marginTop: 4 }}>各账户历史走势</div>
            </div>

            {/* Per-account sparklines */}
            <div style={{ margin: 16 }}>
              {accounts.map((acc) => {
                const data = sortedKeys.map((key) => ({
                  month: key.split("-")[1] + "月",
                  value: history[key]?.[acc.id] ?? 0,
                }));
                const latest = data[data.length - 1]?.value ?? 0;
                const prev2 = data[data.length - 2]?.value ?? 0;
                const diff = latest - prev2;
                return (
                  <div key={acc.id} style={{ background: "white", borderRadius: 16, padding: 16, marginBottom: 12, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 20 }}>{acc.icon}</span>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600 }}>{acc.name}</div>
                          <div style={{ fontSize: 12, color: "#999" }}>{typeLabel[acc.type]}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 16, fontWeight: 700 }}>¥{formatAmount(latest)}</div>
                        <div style={{ fontSize: 11, color: diff >= 0 ? "#07C160" : "#FF4D4F" }}>
                          {diff >= 0 ? "▲" : "▼"} {formatAmount(Math.abs(diff))}
                        </div>
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height={70}>
                      <LineChart data={data} margin={{ top: 2, right: 5, left: -30, bottom: 0 }}>
                        <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#CCC" }} axisLine={false} tickLine={false} />
                        <YAxis hide />
                        <Tooltip
                          contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 2px 12px rgba(0,0,0,0.1)", fontSize: 12 }}
                          formatter={(v) => [`¥${v.toLocaleString()}`, acc.name]}
                        />
                        <Line type="monotone" dataKey="value" stroke={acc.color} strokeWidth={2} dot={false} activeDot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                );
              })}
            </div>

            {/* Distribution */}
            <div style={{ background: "white", margin: "0 16px 16px", borderRadius: 16, padding: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>当月资产占比</div>
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

        {/* SETTINGS TAB */}
        {tab === "settings" && (
          <div style={{ paddingBottom: 80 }}>
            <div style={{ background: "linear-gradient(135deg, #0A4F3F 0%, #0D7A5B 100%)", padding: "52px 24px 24px" }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: "white" }}>账户管理</div>
            </div>
            <div style={{ margin: 16 }}>
              {accounts.map((acc) => (
                <div key={acc.id} style={{
                  background: "white", borderRadius: 14, padding: "14px 16px", marginBottom: 10,
                  boxShadow: "0 2px 10px rgba(0,0,0,0.05)", display: "flex", alignItems: "center", gap: 12,
                }}>
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: acc.color + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>
                    {acc.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{acc.name}</div>
                    <span style={{ fontSize: 11, color: typeColors[acc.type], background: typeColors[acc.type] + "18", padding: "2px 8px", borderRadius: 10 }}>
                      {typeLabel[acc.type]}
                    </span>
                  </div>
                  <button onClick={() => deleteAccount(acc.id)} style={{
                    background: "#FFF0F0", border: "none", borderRadius: 8, padding: "6px 12px",
                    color: "#FF4D4F", fontSize: 13, cursor: "pointer",
                  }}>删除</button>
                </div>
              ))}
              <button onClick={() => setShowAddAccount(true)} style={{
                width: "100%", background: "#E8F5F0", border: "none", borderRadius: 14,
                padding: 16, fontSize: 15, fontWeight: 600, color: "#0D7A5B", cursor: "pointer",
              }}>
                ＋ 添加新账户
              </button>
            </div>
          </div>
        )}

        {/* Bottom Nav */}
        <div style={{
          position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
          width: "100%", maxWidth: 390, background: "white",
          borderTop: "1px solid #F0F0F0", display: "flex",
          paddingBottom: "env(safe-area-inset-bottom, 8px)",
          boxShadow: "0 -4px 20px rgba(0,0,0,0.06)",
        }}>
          {[
            { id: "home", icon: "🏠", label: "首页" },
            { id: "analysis", icon: "📊", label: "分析" },
            { id: "settings", icon: "⚙️", label: "账户" },
          ].map((item) => (
            <button key={item.id} onClick={() => setTab(item.id)} style={{
              flex: 1, background: "none", border: "none", padding: "10px 0",
              cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
            }}>
              <span style={{ fontSize: 22 }}>{item.icon}</span>
              <span style={{ fontSize: 11, color: tab === item.id ? "#0D7A5B" : "#999", fontWeight: tab === item.id ? 700 : 400 }}>
                {item.label}
              </span>
              {tab === item.id && <div style={{ width: 20, height: 3, background: "#0D7A5B", borderRadius: 2 }} />}
            </button>
          ))}
        </div>

      </div>

      {/* ── Modals rendered OUTSIDE overflow:hidden container to avoid clipping ── */}

      {/* Month Picker Modal */}
      {showMonthPicker && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "flex-end", zIndex: 200, justifyContent: "center" }}
          onClick={() => setShowMonthPicker(false)}>
          <div style={{ background: "white", borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 390, padding: 20, maxHeight: "60vh", overflowY: "auto" }}
            onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, textAlign: "center" }}>选择月份</div>
            {monthOptions.map((opt) => (
              <button key={opt.key} onClick={() => { setSelectedMonth(opt.key); setShowMonthPicker(false); }} style={{
                width: "100%", background: selectedMonth === opt.key ? "#E8F5F0" : "none",
                border: "none", padding: "12px 16px", borderRadius: 10, cursor: "pointer",
                fontSize: 15, color: selectedMonth === opt.key ? "#0D7A5B" : "#333",
                fontWeight: selectedMonth === opt.key ? 700 : 400, textAlign: "left",
                display: "flex", justifyContent: "space-between",
              }}>
                {opt.label}
                {selectedMonth === opt.key && <span>✓</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Add Account Modal */}
      {showAddAccount && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "flex-end", zIndex: 200, justifyContent: "center" }}
          onClick={() => setShowAddAccount(false)}>
          <div style={{ background: "white", borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 390, padding: 24, maxHeight: "90vh", overflowY: "auto" }}
            onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, textAlign: "center" }}>添加账户</div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 13, color: "#666", marginBottom: 6 }}>账户名称</div>
              <input value={newAccount.name} onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                placeholder="例：工商银行储蓄卡"
                style={{ width: "100%", border: "1.5px solid #E0E0E0", borderRadius: 10, padding: "10px 14px", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 13, color: "#666", marginBottom: 6 }}>账户类型</div>
              <div style={{ display: "flex", gap: 8 }}>
                {Object.entries(typeLabel).map(([k, v]) => (
                  <button key={k} onClick={() => setNewAccount({ ...newAccount, type: k })} style={{
                    flex: 1, padding: "8px", border: `2px solid ${newAccount.type === k ? typeColors[k] : "#E0E0E0"}`,
                    borderRadius: 10, background: newAccount.type === k ? typeColors[k] + "18" : "white",
                    color: newAccount.type === k ? typeColors[k] : "#666", fontSize: 13, fontWeight: 600, cursor: "pointer",
                  }}>{v}</button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, color: "#666", marginBottom: 6 }}>图标</div>
              <div style={{ display: "flex", gap: 8 }}>
                {["🏦", "💰", "📈", "💛", "💎", "🏧"].map((icon) => (
                  <button key={icon} onClick={() => setNewAccount({ ...newAccount, icon })} style={{
                    width: 44, height: 44, border: `2px solid ${newAccount.icon === icon ? "#0D7A5B" : "#E0E0E0"}`,
                    borderRadius: 10, background: "none", fontSize: 22, cursor: "pointer",
                  }}>{icon}</button>
                ))}
              </div>
            </div>
            <button onClick={addAccount} style={{
              width: "100%", background: "#0D7A5B", border: "none", borderRadius: 12,
              padding: 14, fontSize: 15, fontWeight: 700, color: "white", cursor: "pointer",
            }}>添加</button>
          </div>
        </div>
      )}
    </div>
  );
}
