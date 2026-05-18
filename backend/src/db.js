const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  host: "localhost",
  port: process.env.DB_PORT || 5433,
  user: "postgres",
  password: "password",
  database: "expense_tracker",
});

const createTables = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS receipts (
      id SERIAL PRIMARY KEY,
      store_name VARCHAR(255),
      amount DECIMAL(10,2),
      category VARCHAR(100),
      date DATE,
      image_url TEXT,
      raw_text TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log("Tables created successfully");
};

createTables();

module.exports = pool;
