import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

const API = "https://api.expense-tracker.sbs";

const CATEGORY_CONFIG = {
  groceries: { color: "#185FA5", bg: "#E6F1FB", icon: "🛒" },
  food: { color: "#0F6E56", bg: "#E1F5EE", icon: "🍔" },
  dining: { color: "#0F6E56", bg: "#E1F5EE", icon: "🍽️" },
  restaurant: { color: "#BA7517", bg: "#FAEEDA", icon: "☕" },
  shopping: { color: "#533AB7", bg: "#EEEDFE", icon: "🛍️" },
  transport: { color: "#3B6D11", bg: "#EAF3DE", icon: "🚗" },
  entertainment: { color: "#993556", bg: "#FBEAF0", icon: "🎬" },
  health: { color: "#A32D2D", bg: "#FCEBEB", icon: "💊" },
  other: { color: "#5F5E5A", bg: "#F1EFE8", icon: "📄" },
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
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
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
  const [dragOver, setDragOver] = useState(false);
  const [filterMonth, setFilterMonth] = useState("all");
  const [filterYear, setFilterYear] = useState("all");
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
    setMessage({ type: "loading", text: "Claude is reading your receipt..." });
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
    await axios.delete(`${API}/receipts/${id}`);
    fetchReceipts();
  };

  // Get unique years from receipts
  const availableYears = [
    ...new Set(
      receipts
        .map((r) => {
          if (!r.date) return null;
          return new Date(r.date).getFullYear();
        })
        .filter(Boolean),
    ),
  ].sort((a, b) => b - a);

  // Filter receipts
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
    [...pieData].sort((a, b) => b.value - a.value)[0]?.name || "—";

  const filterLabel = () => {
    if (filterMonth === "all" && filterYear === "all") return "All time";
    if (filterMonth === "all") return filterYear;
    if (filterYear === "all") return MONTHS[parseInt(filterMonth)];
    return `${MONTHS[parseInt(filterMonth)]} ${filterYear}`;
  };

  return (
    <div style={styles.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #F7F6F3; font-family: 'DM Sans', sans-serif; }
        .drop-zone { transition: all 0.2s ease; }
        .drop-zone:hover, .drop-zone.drag-over { background: #EEF4FF !important; border-color: #185FA5 !important; }
        .receipt-row { transition: background 0.15s; }
        .receipt-row:hover { background: #FAFAF9; }
        .delete-btn { opacity: 0; transition: opacity 0.15s; background: none; border: none; cursor: pointer; padding: 6px; border-radius: 6px; color: #A32D2D; }
        .receipt-row:hover .delete-btn { opacity: 1; }
        .delete-btn:hover { background: #FCEBEB; }
        .insight-btn { transition: all 0.15s; }
        .insight-btn:hover { opacity: 0.88; transform: translateY(-1px); }
        select { appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 10px center; padding-right: 32px !important; cursor: pointer; }
        select:focus { outline: none; border-color: #185FA5 !important; }
      `}</style>

      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h1 style={styles.h1}>Expense tracker</h1>
            <p style={styles.subtitle}>AI-powered receipt scanning</p>
          </div>
          <div style={styles.headerBadge}>
            <span style={{ fontSize: 11, color: "#185FA5", fontWeight: 500 }}>
              Powered by Claude
            </span>
          </div>
        </div>

        {/* Upload */}
        <div
          className={`drop-zone ${dragOver ? "drag-over" : ""}`}
          style={styles.uploadZone}
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
          onClick={() => fileRef.current?.click()}
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
              <div style={styles.spinner} />
              <p
                style={{
                  color: "#185FA5",
                  fontSize: 14,
                  marginTop: 12,
                  fontWeight: 500,
                }}
              >
                Claude is reading your receipt...
              </p>
            </div>
          ) : (
            <div style={{ textAlign: "center" }}>
              <div style={styles.uploadIcon}>↑</div>
              <p
                style={{
                  fontSize: 14,
                  color: "#444",
                  fontWeight: 500,
                  marginBottom: 4,
                }}
              >
                Drop a receipt here or click to browse
              </p>
              <p style={{ fontSize: 12, color: "#888" }}>
                JPG, PNG or HEIC — Claude extracts store, amount, date
                automatically
              </p>
            </div>
          )}
        </div>

        {message && (
          <div
            style={{
              ...styles.msg,
              background:
                message.type === "success"
                  ? "#E1F5EE"
                  : message.type === "error"
                    ? "#FCEBEB"
                    : "#E6F1FB",
              color:
                message.type === "success"
                  ? "#0F6E56"
                  : message.type === "error"
                    ? "#A32D2D"
                    : "#185FA5",
            }}
          >
            {message.type === "success"
              ? "✓ "
              : message.type === "error"
                ? "✕ "
                : "⟳ "}
            {message.text}
          </div>
        )}

        {/* Filter Bar */}
        <div style={styles.filterBar}>
          <div style={styles.filterLabel}>
            Showing: <strong>{filterLabel()}</strong>
            {(filterMonth !== "all" || filterYear !== "all") && (
              <button
                onClick={() => {
                  setFilterMonth("all");
                  setFilterYear("all");
                }}
                style={styles.clearFilter}
              >
                Clear
              </button>
            )}
          </div>
          <div style={styles.filterControls}>
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              style={styles.select}
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
              style={styles.select}
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
        <div style={styles.statsRow}>
          {[
            {
              label: "Total spent",
              value: formatCurrency(totalSpent),
              accent: "#185FA5",
            },
            {
              label: "Receipts",
              value: filteredReceipts.length,
              accent: "#0F6E56",
            },
            {
              label: "Top category",
              value: topCategory || "—",
              accent: "#BA7517",
            },
          ].map((s) => (
            <div key={s.label} style={styles.statCard}>
              <div style={styles.statLabel}>{s.label}</div>
              <div style={{ ...styles.statValue, color: s.accent }}>
                {s.value}
              </div>
            </div>
          ))}
        </div>

        {/* Chart + Insights */}
        {filteredReceipts.length > 0 && (
          <div style={styles.twoCol}>
            <div style={styles.card}>
              <div style={styles.cardTitle}>Spending by category</div>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
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
                      fontSize: 13,
                      borderRadius: 8,
                      border: "0.5px solid #D3D1C7",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  marginTop: 8,
                }}
              >
                {pieData.slice(0, 4).map((item, i) => (
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
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: PIE_COLORS[i % PIE_COLORS.length],
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{ color: "#666", textTransform: "capitalize" }}
                    >
                      {item.name}
                    </span>
                    <span
                      style={{
                        marginLeft: "auto",
                        fontWeight: 500,
                        color: "#222",
                      }}
                    >
                      {formatCurrency(item.value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div style={styles.card}>
              <div style={styles.cardTitle}>AI spending insights</div>
              <button
                className="insight-btn"
                onClick={getInsights}
                disabled={loadingInsights}
                style={styles.insightBtn}
              >
                {loadingInsights ? "Analyzing..." : "Analyze my spending"}
              </button>
              {insights && (
                <div style={styles.insightText}>
                  {insights
                    .split("\n")
                    .filter((l) => l.trim())
                    .map((line, i) => (
                      <p key={i} style={{ marginBottom: 10, lineHeight: 1.6 }}>
                        {line.replace(/\*\*/g, "")}
                      </p>
                    ))}
                </div>
              )}
              {!insights && (
                <p
                  style={{
                    fontSize: 13,
                    color: "#aaa",
                    marginTop: 16,
                    lineHeight: 1.6,
                  }}
                >
                  Click above to get personalized insights about your spending
                  patterns.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Receipts List */}
        <div style={styles.card}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <div style={styles.cardTitle}>Recent receipts</div>
            <span style={{ fontSize: 12, color: "#aaa" }}>
              {filteredReceipts.length} item
              {filteredReceipts.length !== 1 ? "s" : ""}
            </span>
          </div>

          {filteredReceipts.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🧾</div>
              <p style={{ color: "#aaa", fontSize: 14 }}>
                {receipts.length === 0
                  ? "No receipts yet. Upload one above."
                  : "No receipts for this period."}
              </p>
            </div>
          ) : (
            filteredReceipts.map((r) => {
              const cat = getCategoryConfig(r.category);
              return (
                <div
                  key={r.id}
                  className="receipt-row"
                  style={styles.receiptRow}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 12 }}
                  >
                    <div style={{ ...styles.receiptIcon, background: cat.bg }}>
                      {cat.icon}
                    </div>
                    <div>
                      <div style={styles.receiptStore}>{r.store_name}</div>
                      <div style={styles.receiptMeta}>
                        <span
                          style={{
                            ...styles.badge,
                            background: cat.bg,
                            color: cat.color,
                          }}
                        >
                          {r.category}
                        </span>
                        <span>{formatDate(r.date)}</span>
                      </div>
                    </div>
                  </div>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 10 }}
                  >
                    <span style={styles.receiptAmount}>
                      {formatCurrency(parseFloat(r.amount))}
                    </span>
                    <button
                      className="delete-btn"
                      onClick={() => deleteReceipt(r.id)}
                      title="Delete"
                    >
                      ✕
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

const styles = {
  root: {
    minHeight: "100vh",
    background: "#F7F6F3",
    fontFamily: "'DM Sans', sans-serif",
  },
  container: { maxWidth: 860, margin: "0 auto", padding: "32px 20px" },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 28,
  },
  h1: {
    fontSize: 26,
    fontWeight: 600,
    color: "#1a1a1a",
    letterSpacing: "-0.5px",
  },
  subtitle: { fontSize: 14, color: "#888", marginTop: 3 },
  headerBadge: { background: "#E6F1FB", padding: "6px 12px", borderRadius: 20 },
  uploadZone: {
    border: "1.5px dashed #D3D1C7",
    borderRadius: 12,
    padding: "36px 20px",
    textAlign: "center",
    cursor: "pointer",
    marginBottom: 16,
    background: "#fff",
  },
  uploadIcon: {
    width: 44,
    height: 44,
    borderRadius: "50%",
    background: "#E6F1FB",
    color: "#185FA5",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 20,
    fontWeight: 600,
    margin: "0 auto 12px",
  },
  spinner: {
    width: 32,
    height: 32,
    borderRadius: "50%",
    border: "3px solid #E6F1FB",
    borderTopColor: "#185FA5",
    animation: "spin 0.8s linear infinite",
    margin: "0 auto",
  },
  msg: {
    padding: "10px 16px",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 500,
    marginBottom: 16,
  },
  filterBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "#fff",
    borderRadius: 10,
    padding: "12px 16px",
    marginBottom: 16,
    border: "0.5px solid #E8E6DF",
  },
  filterLabel: {
    fontSize: 13,
    color: "#666",
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  clearFilter: {
    background: "#F1EFE8",
    border: "none",
    borderRadius: 6,
    padding: "3px 10px",
    fontSize: 12,
    color: "#666",
    cursor: "pointer",
    fontWeight: 500,
  },
  filterControls: { display: "flex", gap: 8 },
  select: {
    border: "0.5px solid #D8D6CF",
    borderRadius: 8,
    padding: "7px 12px",
    fontSize: 13,
    color: "#333",
    background: "#fff",
    fontFamily: "'DM Sans', sans-serif",
  },
  statsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    background: "#fff",
    borderRadius: 10,
    padding: "16px 18px",
    border: "0.5px solid #E8E6DF",
  },
  statLabel: {
    fontSize: 12,
    color: "#888",
    marginBottom: 6,
    fontWeight: 500,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  statValue: {
    fontSize: 22,
    fontWeight: 600,
    letterSpacing: "-0.5px",
    textTransform: "capitalize",
  },
  twoCol: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 16,
    marginBottom: 16,
  },
  card: {
    background: "#fff",
    borderRadius: 12,
    padding: 20,
    border: "0.5px solid #E8E6DF",
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: "#444",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    marginBottom: 16,
  },
  insightBtn: {
    width: "100%",
    padding: "11px 16px",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 500,
    background: "#185FA5",
    color: "#fff",
    border: "none",
    cursor: "pointer",
  },
  insightText: { fontSize: 13, color: "#555", marginTop: 14, lineHeight: 1.7 },
  emptyState: { textAlign: "center", padding: "32px 20px" },
  receiptRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 8px",
    borderBottom: "0.5px solid #F0EEE8",
    borderRadius: 6,
  },
  receiptIcon: {
    width: 38,
    height: 38,
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 18,
    flexShrink: 0,
  },
  receiptStore: { fontSize: 14, fontWeight: 500, color: "#222" },
  receiptMeta: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginTop: 3,
    fontSize: 12,
    color: "#888",
  },
  badge: {
    padding: "2px 8px",
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 500,
  },
  receiptAmount: {
    fontSize: 15,
    fontWeight: 600,
    color: "#1a1a1a",
    fontFamily: "'DM Mono', monospace",
  },
};
