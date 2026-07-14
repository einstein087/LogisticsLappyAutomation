import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL?.trim() || null;
const pool = connectionString ? new Pool({ connectionString }) : null;

export const isDbConfigured = () => Boolean(pool);

export const initDb = async () => {
  if (!pool) {
    console.warn("DATABASE_URL is not defined. Database initialization is skipped.");
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("SELECT 1");
  } finally {
    client.release();
  }
};

export const query = async (text: string, params?: unknown[]) => {
  if (!pool) {
    throw new Error("PostgreSQL is not configured. Set DATABASE_URL before executing queries.");
  }

  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
};
