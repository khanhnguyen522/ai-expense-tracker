const express = require("express");
const cors = require("cors");
require("dotenv").config();
const Anthropic = require("@anthropic-ai/sdk");
const pool = require("./src/db");
const multer = require("multer");
const { readReceipt } = require("./src/claudeService");

const upload = multer({ dest: "uploads/" });

const app = express();
app.use(cors());
app.use(express.json());

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// test route
app.get("/", (req, res) => {
  res.json({ message: "Server is running!" });
});

// test Claude
app.get("/test-claude", async (req, res) => {
  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [{ role: "user", content: "Say hello in one sentence" }],
  });
  res.json({ response: message.content[0].text });
});

// get all receipts
app.get("/receipts", async (req, res) => {
  const result = await pool.query(
    "SELECT * FROM receipts ORDER BY created_at DESC",
  );
  res.json(result.rows);
});

// add a test receipt
app.post("/receipts/test", async (req, res) => {
  const result = await pool.query(
    `INSERT INTO receipts (store_name, amount, category, date)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    ["Walmart", 45.99, "groceries", "2026-05-18"],
  );
  res.json(result.rows[0]);
});

// real receipt upload route
app.post("/receipts", upload.single("receipt"), async (req, res) => {
  try {
    // send image to Claude
    const receiptData = await readReceipt(req.file.path);
    // save to database
    const result = await pool.query(
      `INSERT INTO receipts (store_name, amount, category, date)
            VALUES ($1, $2, $3, $4) RETURNING *`,
      [
        receiptData.store_name,
        receiptData.amount,
        receiptData.category,
        receiptData.date,
      ],
    );
    res.json({
      message: "Receipt processed successfully",
      receipt: result.rows[0],
      extracted: receiptData,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});
