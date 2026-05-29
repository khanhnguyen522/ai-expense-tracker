import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

const API = "https://api.expense-tracker.sbs";
const MONTHLY_BUDGET = 300;

const CATEGORY_CONFIG = {
  groceries: { color: "#0C447C", bg: "#E6F1FB", icon: "🛒" },
  food: { color: "#085041", bg: "#E1F5EE", icon: "🍔" },
  dining: { color: "#085041", bg: "#E1F5EE", icon: "🍽️" },
  restaurant: { color: "#633806", bg: "#FAEEDA", icon: "☕" },
  shopping: { color: "#3C3489", bg: "#EEEDFE", icon: "🛍️" },
  transport: { color: "#27500A", bg: "#EAF3DE", icon: "🚗" },
  entertainment: { color: "#72243E", bg: "#FBEAF0", icon: "🎬" },
  health: { color: "#791F1F", bg: "#FCEBEB", icon: "💊" },
  other: { color: "#444441", bg: "#F1EFE8", icon: "📄" },
};

const PIE_COLORS = [
  "#185FA5",
  "#0F6E56",
  "#BA7517",
  "#533AB7",
  "#3B6D11",
  "#993556",
];

const getCategoryConfig = (cat) =>
  CATEGORY_CONFIG[cat?.toLowerCase()] || CATEGORY_CONFIG.other;
const formatCurrency = (val) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    val,
  );
const formatDate = (dateString) => {
  if (!dateString) return "No date";
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export default function App() {
  const [receipts, setReceipts] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState(null);
  const [insights, setInsights] = useState("");
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [filterMonth, setFilterMonth] = useState(String(new Date().getMonth()));
  const [filterYear, setFilterYear] = useState(
    String(new Date().getFullYear()),
  );
  const fileRef = useRef();

  useEffect(() => {
    fetchReceipts();
  }, []);

  const fetchReceipts = async () => {
    try {
      const res = await axios.get(`${API}/receipts`);
      setReceipts(res.data);
    } catch {}
  };

  const handleFile = async (file) => {
    if (!file) return;
    setUploading(true);
    setMessage({ type: "loading", text: "Scanning your receipt..." });
    const formData = new FormData();
    formData.append("receipt", file);
    try {
      const res = await axios.post(`${API}/receipts`, formData);
      setMessage({
        type: "success",
        text: `Found: ${res.data.extracted.store_name} — ${formatCurrency(res.data.extracted.amount)}`,
      });
      fetchReceipts();
    } catch {
      setMessage({
        type: "error",
        text: "Could not read receipt. Try a clearer image.",
      });
    }
    setUploading(false);
  };

  const getInsights = async () => {
    setLoadingInsights(true);
    try {
      const res = await axios.get(`${API}/insights`);
      setInsights(res.data.insights);
    } catch {}
    setLoadingInsights(false);
  };

  const deleteReceipt = async (id) => {
    if (!window.confirm("Delete this receipt?")) return;
    await axios.delete(`${API}/receipts/${id}`);
    fetchReceipts();
  };

  const availableYears = [
    ...new Set(
      receipts
        .map((r) => (r.date ? new Date(r.date).getFullYear() : null))
        .filter(Boolean),
    ),
  ].sort((a, b) => b - a);

  const filteredReceipts = receipts.filter((r) => {
    if (!r.date) return filterMonth === "all" && filterYear === "all";
    const date = new Date(r.date);
    const monthMatch =
      filterMonth === "all" || date.getMonth() === parseInt(filterMonth);
    const yearMatch =
      filterYear === "all" || date.getFullYear() === parseInt(filterYear);
    return monthMatch && yearMatch;
  });

  const totalSpent = filteredReceipts.reduce(
    (s, r) => s + parseFloat(r.amount),
    0,
  );

  const categoryTotals = filteredReceipts.reduce((acc, r) => {
    acc[r.category] = (acc[r.category] || 0) + parseFloat(r.amount);
    return acc;
  }, {});

  const pieData = Object.entries(categoryTotals).map(([name, value]) => ({
    name,
    value: parseFloat(value.toFixed(2)),
  }));

  const topCategory =
    [...pieData].sort((a, b) => b.value - a.value)[0]?.name || null;

  // Budget calculations — only meaningful when a specific month is selected
  const isMonthView = filterMonth !== "all" && filterYear !== "all";
  const budgetPct = Math.min((totalSpent / MONTHLY_BUDGET) * 100, 100);
  const overBudget = totalSpent > MONTHLY_BUDGET;
  const overAmount = totalSpent - MONTHLY_BUDGET;
  const remaining = MONTHLY_BUDGET - totalSpent;

  const filterLabel = () => {
    if (filterMonth === "all" && filterYear === "all") return "All time";
    if (filterMonth === "all") return filterYear;
    if (filterYear === "all") return MONTHS[parseInt(filterMonth)];
    return `${MONTHS[parseInt(filterMonth)]} ${filterYear}`;
  };

  const handleInsightsClick = () => {
    setShowInsights(true);
    if (!insights) getInsights();
  };

  return (
    <div style={s.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #F7F6F3; font-family: 'DM Sans', sans-serif; }
        .upload-zone { transition: border-color 0.15s, background 0.15s; }
        .upload-zone:hover, .upload-zone.drag-over { border-color: #185FA5 !important; background: #F0F6FD !important; }
        .receipt-row { transition: background 0.1s; border-radius: 8px; }
        .receipt-row:hover { background: #FAFAF9; }
        .receipt-row:hover .del-btn { opacity: 1 !important; }
        .del-btn { opacity: 0; transition: opacity 0.12s, background 0.12s, border-color 0.12s; }
        .del-btn:hover { background: #FCEBEB !important; border-color: #F7C1C1 !important; color: #A32D2D !important; }
        .insight-pill:hover:not(:disabled) { background: #F0F6FD !important; border-color: #B5D4F4 !important; }
        .insight-pill:disabled { opacity: 0.6; cursor: not-allowed; }
        select { appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 9px center; padding-right: 28px !important; cursor: pointer; }
        select:focus { outline: 2px solid #185FA5; outline-offset: 1px; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }
        @keyframes fillBar { from { width: 0%; } to { width: var(--bar-w); } }
        .fade-in { animation: fadeIn 0.2s ease; }
        .budget-bar-fill { animation: fillBar 0.6s ease forwards; }
      `}</style>

      <div style={s.container}>
        {/* Header */}
        <div style={s.header}>
          <h1 style={s.h1}>Expense tracker</h1>
          <p style={s.subtitle}>Receipt scanning & spending insights</p>
        </div>

        {/* Upload zone */}
        <div
          className={`upload-zone ${dragOver ? "drag-over" : ""}`}
          style={s.uploadZone}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleFile(e.dataTransfer.files[0]);
          }}
          onClick={() => !uploading && fileRef.current?.click()}
        >
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => handleFile(e.target.files[0])}
            disabled={uploading}
          />
          {uploading ? (
            <div style={{ textAlign: "center" }}>
              <div style={s.spinner} />
              <p
                style={{
                  color: "#185FA5",
                  fontSize: 13,
                  marginTop: 12,
                  fontWeight: 500,
                }}
              >
                Scanning your receipt...
              </p>
            </div>
          ) : (
            <div style={{ textAlign: "center" }}>
              <div style={s.uploadIconBox}>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#185FA5"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <p
                style={{
                  fontSize: 14,
                  color: "#333",
                  fontWeight: 500,
                  marginBottom: 3,
                }}
              >
                Drop a receipt or click to browse
              </p>
              <p style={{ fontSize: 12, color: "#999" }}>
                JPG, PNG or HEIC — store, amount & date extracted automatically
              </p>
            </div>
          )}
        </div>

        {/* Status message */}
        {message && !uploading && (
          <div
            className="fade-in"
            style={{
              ...s.msg,
              background:
                message.type === "success"
                  ? "#E1F5EE"
                  : message.type === "error"
                    ? "#FCEBEB"
                    : "#E6F1FB",
              borderColor:
                message.type === "success"
                  ? "#9FE1CB"
                  : message.type === "error"
                    ? "#F7C1C1"
                    : "#B5D4F4",
              color:
                message.type === "success"
                  ? "#085041"
                  : message.type === "error"
                    ? "#791F1F"
                    : "#0C447C",
            }}
          >
            <span style={{ fontSize: 14, flexShrink: 0 }}>
              {message.type === "success" ? "✓" : "✕"}
            </span>
            {message.text}
          </div>
        )}

        {/* Filter bar */}
        <div style={s.filterBar}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
              color: "#666",
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#999"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            <span>
              Showing <strong style={{ color: "#333" }}>{filterLabel()}</strong>
            </span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              style={s.select}
            >
              <option value="all">All months</option>
              {MONTHS.map((m, i) => (
                <option key={m} value={i}>
                  {m}
                </option>
              ))}
            </select>
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              style={s.select}
            >
              <option value="all">All years</option>
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Stats */}
        <div style={s.statsRow}>
          <div style={s.statCard}>
            <div style={s.statLabel}>Total spent</div>
            <div style={{ ...s.statValue, color: "#185FA5" }}>
              {formatCurrency(totalSpent)}
            </div>
          </div>
          <div style={s.statCard}>
            <div style={s.statLabel}>Receipts</div>
            <div style={{ ...s.statValue, color: "#0F6E56" }}>
              {filteredReceipts.length}
            </div>
          </div>
          <div style={s.statCard}>
            <div style={s.statLabel}>Top category</div>
            <div
              style={{
                ...s.statValue,
                color: "#BA7517",
                fontSize: 15,
                textTransform: "capitalize",
              }}
            >
              {topCategory
                ? `${getCategoryConfig(topCategory).icon} ${topCategory}`
                : "—"}
            </div>
          </div>
        </div>

        {/* Budget bar — only when viewing a specific month */}
        {isMonthView && filteredReceipts.length > 0 && (
          <div className="fade-in" style={{ ...s.card, marginBottom: 14 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginBottom: 10,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={s.cardTitle}>Monthly budget</div>
                {overBudget && (
                  <span style={s.overBadge}>
                    Over by {formatCurrency(overAmount)}
                  </span>
                )}
              </div>
              <div
                style={{ fontSize: 13, color: overBudget ? "#791F1F" : "#555" }}
              >
                <span
                  style={{
                    fontWeight: 600,
                    color: overBudget ? "#A32D2D" : "#1a1a1a",
                  }}
                >
                  {formatCurrency(totalSpent)}
                </span>
                <span style={{ color: "#bbb" }}>
                  {" "}
                  / {formatCurrency(MONTHLY_BUDGET)}
                </span>
              </div>
            </div>

            {/* Bar track */}
            <div style={s.barTrack}>
              <div
                className="budget-bar-fill"
                style={{
                  "--bar-w": `${budgetPct}%`,
                  height: "100%",
                  width: `${budgetPct}%`,
                  borderRadius: 6,
                  background: overBudget
                    ? "linear-gradient(90deg, #E24B4A, #A32D2D)"
                    : budgetPct > 80
                      ? "linear-gradient(90deg, #EF9F27, #BA7517)"
                      : "#185FA5",
                  transition: "background 0.3s",
                }}
              />
            </div>

            {/* Sub-labels */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: 8,
                fontSize: 12,
                color: "#aaa",
              }}
            >
              <span>
                {overBudget
                  ? "Budget exceeded"
                  : `${formatCurrency(remaining)} remaining`}
              </span>
              <span>{Math.round(budgetPct)}% used</span>
            </div>
          </div>
        )}

        {/* Chart */}
        {filteredReceipts.length > 0 && (
          <div style={s.card}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 14,
              }}
            >
              <div style={s.cardTitle}>Spending by category</div>
              {receipts.length > 0 && (
                <button
                  className="insight-pill"
                  onClick={handleInsightsClick}
                  disabled={loadingInsights}
                  style={s.insightPill}
                >
                  {loadingInsights ? "Analyzing..." : "✦ Insights"}
                </button>
              )}
            </div>
            <ResponsiveContainer width="100%" height={190}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={78}
                  dataKey="value"
                  nameKey="name"
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val) => formatCurrency(val)}
                  contentStyle={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 12,
                    borderRadius: 8,
                    border: "0.5px solid #D3D1C7",
                    boxShadow: "none",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 7,
                marginTop: 4,
              }}
            >
              {pieData.slice(0, 5).map((item, i) => (
                <div
                  key={item.name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 13,
                  }}
                >
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: PIE_COLORS[i % PIE_COLORS.length],
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      color: "#666",
                      textTransform: "capitalize",
                      flex: 1,
                    }}
                  >
                    {item.name}
                  </span>
                  <span style={{ fontWeight: 500, color: "#222" }}>
                    {formatCurrency(item.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Insights panel */}
        {showInsights && (
          <div className="fade-in" style={s.insightsPanel}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <div style={s.cardTitle}>Spending insights</div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {insights && !loadingInsights && (
                  <button
                    onClick={getInsights}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontSize: 12,
                      color: "#185FA5",
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    Refresh
                  </button>
                )}
                <button
                  onClick={() => setShowInsights(false)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#bbb",
                    fontSize: 16,
                    padding: "0 2px",
                    lineHeight: 1,
                  }}
                >
                  ✕
                </button>
              </div>
            </div>
            {loadingInsights ? (
              <p style={{ fontSize: 13, color: "#aaa" }}>
                Analyzing your spending...
              </p>
            ) : (
              insights
                .split("\n")
                .filter((l) => l.trim())
                .map((line, i) => (
                  <p
                    key={i}
                    style={{
                      fontSize: 13,
                      color: "#555",
                      lineHeight: 1.65,
                      marginBottom: 9,
                    }}
                  >
                    {line.replace(/\*\*/g, "")}
                  </p>
                ))
            )}
          </div>
        )}

        {/* Receipts list */}
        <div style={s.card}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 14,
            }}
          >
            <div style={s.cardTitle}>Recent receipts</div>
            <span style={{ fontSize: 12, color: "#bbb" }}>
              {filteredReceipts.length} item
              {filteredReceipts.length !== 1 ? "s" : ""}
            </span>
          </div>
          {filteredReceipts.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 20px" }}>
              <div style={{ fontSize: 30, marginBottom: 8 }}>🧾</div>
              <p style={{ color: "#bbb", fontSize: 14 }}>
                {receipts.length === 0
                  ? "No receipts yet — upload one above."
                  : "No receipts for this period."}
              </p>
            </div>
          ) : (
            filteredReceipts.map((r, idx) => {
              const cat = getCategoryConfig(r.category);
              return (
                <div
                  key={r.id}
                  className="receipt-row"
                  style={{
                    ...s.receiptRow,
                    borderBottom:
                      idx === filteredReceipts.length - 1
                        ? "none"
                        : "0.5px solid #F0EEE8",
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 11 }}
                  >
                    <div style={{ ...s.receiptIcon, background: cat.bg }}>
                      {cat.icon}
                    </div>
                    <div>
                      <div style={s.receiptStore}>{r.store_name}</div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 7,
                          marginTop: 3,
                        }}
                      >
                        <span
                          style={{
                            ...s.badge,
                            background: cat.bg,
                            color: cat.color,
                          }}
                        >
                          {r.category}
                        </span>
                        <span style={{ fontSize: 11, color: "#bbb" }}>
                          {formatDate(r.date)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <span style={s.receiptAmount}>
                      {formatCurrency(parseFloat(r.amount))}
                    </span>
                    <button
                      className="del-btn"
                      onClick={() => deleteReceipt(r.id)}
                      style={s.delBtn}
                      title="Delete receipt"
                    >
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                        <path d="M10 11v6" />
                        <path d="M14 11v6" />
                        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

const s = {
  root: {
    minHeight: "100vh",
    background: "#F7F6F3",
    fontFamily: "'DM Sans', sans-serif",
  },
  container: { maxWidth: 860, margin: "0 auto", padding: "32px 20px" },
  header: { marginBottom: 24 },
  h1: {
    fontSize: 24,
    fontWeight: 600,
    color: "#1a1a1a",
    letterSpacing: "-0.4px",
  },
  subtitle: { fontSize: 13, color: "#999", marginTop: 3 },
  uploadZone: {
    border: "1.5px dashed #D3D1C7",
    borderRadius: 12,
    padding: "32px 20px",
    textAlign: "center",
    cursor: "pointer",
    marginBottom: 12,
    background: "#fff",
  },
  uploadIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    background: "#E6F1FB",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 10px",
  },
  spinner: {
    width: 28,
    height: 28,
    borderRadius: "50%",
    border: "2.5px solid #E6F1FB",
    borderTopColor: "#185FA5",
    animation: "spin 0.8s linear infinite",
    margin: "0 auto",
  },
  msg: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 14px",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 500,
    marginBottom: 12,
    border: "0.5px solid transparent",
  },
  filterBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "#fff",
    borderRadius: 10,
    padding: "10px 14px",
    marginBottom: 14,
    border: "0.5px solid #E8E6DF",
  },
  select: {
    border: "0.5px solid #D8D6CF",
    borderRadius: 8,
    padding: "6px 10px",
    fontSize: 13,
    color: "#333",
    background: "#F7F6F3",
    fontFamily: "'DM Sans', sans-serif",
  },
  statsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 10,
    marginBottom: 14,
  },
  statCard: { background: "#F1EFE8", borderRadius: 10, padding: "14px 16px" },
  statLabel: {
    fontSize: 11,
    color: "#888",
    fontWeight: 500,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    marginBottom: 6,
  },
  statValue: { fontSize: 21, fontWeight: 600, letterSpacing: "-0.4px" },
  card: {
    background: "#fff",
    borderRadius: 12,
    padding: 20,
    border: "0.5px solid #E8E6DF",
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: 600,
    color: "#999",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  barTrack: {
    width: "100%",
    height: 8,
    background: "#F1EFE8",
    borderRadius: 6,
    overflow: "hidden",
  },
  overBadge: {
    fontSize: 11,
    fontWeight: 600,
    background: "#FCEBEB",
    color: "#A32D2D",
    padding: "2px 8px",
    borderRadius: 6,
    border: "0.5px solid #F7C1C1",
  },
  insightPill: {
    background: "#fff",
    border: "0.5px solid #D8D6CF",
    borderRadius: 20,
    padding: "5px 12px",
    fontSize: 12,
    color: "#555",
    fontWeight: 500,
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
    transition: "all 0.15s",
  },
  insightsPanel: {
    background: "#fff",
    borderRadius: 12,
    padding: 20,
    border: "0.5px solid #E8E6DF",
    marginBottom: 14,
  },
  receiptRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 6px",
  },
  receiptIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 17,
    flexShrink: 0,
  },
  receiptStore: { fontSize: 14, fontWeight: 500, color: "#222" },
  badge: { padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 500 },
  receiptAmount: { fontSize: 14, fontWeight: 500, color: "#1a1a1a" },
  delBtn: {
    background: "none",
    border: "0.5px solid transparent",
    color: "#ccc",
    padding: "5px 6px",
    borderRadius: 6,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
  },
};
