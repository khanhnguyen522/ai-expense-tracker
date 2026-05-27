import { useState, useEffect } from "react";
import axios from "axios";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import "./App.css";

const API = "https://api.expense-tracker.sbs";
const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];

function App() {
  const [receipts, setReceipts] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [insights, setInsights] = useState("");
  const [loadingInsights, setLoadingInsights] = useState(false);

  useEffect(() => {
    fetchReceipts();
  }, []);

  const fetchReceipts = async () => {
    const res = await axios.get(`${API}/receipts`);
    setReceipts(res.data);
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setMessage("Claude is reading your receipt...");

    const formData = new FormData();
    formData.append("receipt", file);

    try {
      const res = await axios.post(`${API}/receipts`, formData);
      setMessage(
        `Found: ${res.data.extracted.store_name} - $${res.data.extracted.amount}`,
      );
      fetchReceipts();
    } catch (err) {
      setMessage("Could not read receipt. Try another image.");
    }
    setUploading(false);
  };

  const getInsights = async () => {
    setLoadingInsights(true);
    const res = await axios.get(`${API}/insights`);
    setInsights(res.data.insights);
    setLoadingInsights(false);
  };

  const deleteReceipt = async (id) => {
    await axios.delete(`${API}/receipts/${id}`);
    fetchReceipts();
  };

  const categoryTotals = receipts.reduce((acc, r) => {
    acc[r.category] = (acc[r.category] || 0) + parseFloat(r.amount);
    return acc;
  }, {});

  const pieData = Object.entries(categoryTotals).map(([name, value]) => ({
    name,
    value: parseFloat(value.toFixed(2)),
  }));

  const totalSpent = receipts.reduce((sum, r) => sum + parseFloat(r.amount), 0);

  const formatDate = (dateString) => {
    if (!dateString) return "No date";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div
      style={{
        maxWidth: "900px",
        margin: "0 auto",
        padding: "20px",
        fontFamily: "Arial",
      }}
    >
      <h1>AI Expense Tracker</h1>

      <div
        style={{
          background: "#f5f5f5",
          padding: "20px",
          borderRadius: "10px",
          marginBottom: "20px",
        }}
      >
        <h2>Upload Receipt</h2>
        <input
          type="file"
          accept="image/*"
          onChange={handleUpload}
          disabled={uploading}
          style={{ marginBottom: "10px" }}
        />
        {message && (
          <p style={{ color: message.includes("Could not") ? "red" : "green" }}>
            {message}
          </p>
        )}
      </div>

      <div style={{ display: "flex", gap: "20px", marginBottom: "20px" }}>
        <div
          style={{
            background: "#0088FE",
            color: "white",
            padding: "20px",
            borderRadius: "10px",
            flex: 1,
          }}
        >
          <h3>Total Spent</h3>
          <h2>${totalSpent.toFixed(2)}</h2>
        </div>
        <div
          style={{
            background: "#00C49F",
            color: "white",
            padding: "20px",
            borderRadius: "10px",
            flex: 1,
          }}
        >
          <h3>Total Receipts</h3>
          <h2>{receipts.length}</h2>
        </div>
      </div>

      {pieData.length > 0 && (
        <div
          style={{
            background: "#f5f5f5",
            padding: "20px",
            borderRadius: "10px",
            marginBottom: "20px",
          }}
        >
          <h2>Spending by Category</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                label={({ name, value }) => `${name}: $${value}`}
              >
                {pieData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      <div
        style={{
          background: "#f5f5f5",
          padding: "20px",
          borderRadius: "10px",
          marginBottom: "20px",
        }}
      >
        <h2>AI Spending Insights</h2>
        <button
          onClick={getInsights}
          disabled={loadingInsights}
          style={{
            background: "#0088FE",
            color: "white",
            border: "none",
            padding: "10px 20px",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "16px",
            marginBottom: "15px",
          }}
        >
          {loadingInsights ? "Analyzing..." : "Analyze My Spending"}
        </button>
        {insights && (
          <div style={{ lineHeight: "1.8" }}>
            {insights.split("\n").map((line, i) => (
              <p key={i} style={{ marginBottom: "10px" }}>
                {line.replace(/\*\*/g, "")}
              </p>
            ))}
          </div>
        )}
      </div>

      <div
        style={{ background: "#f5f5f5", padding: "20px", borderRadius: "10px" }}
      >
        <h2>Recent Receipts</h2>
        {receipts.length === 0 && <p>No receipts yet. Upload one above.</p>}
        {receipts.map((r) => (
          <div
            key={r.id}
            style={{
              background: "white",
              padding: "15px",
              borderRadius: "8px",
              marginBottom: "10px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <strong>{r.store_name}</strong>
              <span
                style={{
                  marginLeft: "10px",
                  background: "#eee",
                  padding: "2px 8px",
                  borderRadius: "10px",
                  fontSize: "12px",
                }}
              >
                {r.category}
              </span>
              <p style={{ margin: "5px 0 0", color: "#666", fontSize: "14px" }}>
                {formatDate(r.date)}
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
              <strong style={{ color: "#0088FE", fontSize: "18px" }}>
                ${parseFloat(r.amount).toFixed(2)}
              </strong>
              <button
                onClick={() => deleteReceipt(r.id)}
                style={{
                  background: "none",
                  border: "1px solid #ff4444",
                  color: "#ff4444",
                  padding: "5px 10px",
                  borderRadius: "5px",
                  cursor: "pointer",
                  fontSize: "12px",
                }}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
