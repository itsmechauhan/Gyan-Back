/**
 * PostgreSQL database for GYANGANGA Education
 * This connects to Supabase (or any Postgres) via `pg`.
 *
 * IMPORTANT:
 * - Set `DATABASE_URL` in your `.env` file, for example:
 *   DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.ckbmrjtbzqangjgktxjh.supabase.co:5432/postgres
 * - Tables (`colleges`, `courses`, `reviews`, `enquiries`) must be created
 *   in Supabase using Postgres-compatible DDL (see project docs).
 */

require("dotenv").config();
const { Pool } = require("pg");
  
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn(
    "[database] DATABASE_URL is not set. Configure it in your .env file to connect to Supabase/Postgres."
  );
}

const pool = new Pool({
  connectionString,
  ssl: connectionString && connectionString.includes("supabase.co")
    ? { rejectUnauthorized: false }
    : undefined,
});

/**
 * Simple helper to run queries.
 * Usage:
 *   const { rows } = await db.query('SELECT * FROM colleges WHERE id = $1', [id]);
 */
async function query(text, params = []) {
  return pool.query(text, params);
}

module.exports = {
  query,
  pool,
};
