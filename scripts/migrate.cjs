/**
 * Runs the SQL migration via @neondatabase/serverless.
 * Idempotent and safe to rerun on every deploy.
 *
 * Usage: node scripts/migrate.cjs
 * Requires: DATABASE_URL or DATABASE_URL_UNPOOLED in env.
 */
/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const { neon } = require("@neondatabase/serverless");

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config();

async function main() {
  const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!url || url.includes("placeholder")) {
    console.log("[migrate] Missing DATABASE_URL, skipping migration.");
    return;
  }

  const sqlText = fs.readFileSync(
    path.join(__dirname, "migrate-user-song-arrangement.sql"),
    "utf-8",
  );

  const normalizedSql = sqlText
    .split(/\r?\n/)
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");

  const statements = normalizedSql
    .split(/;\s*$/m)
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);

  const sql = neon(url);

  for (const stmt of statements) {
    try {
      await sql.query(stmt);
    } catch (err) {
      const msg = String(err);
      if (
        msg.includes("already exists") ||
        msg.includes("does not exist") ||
        msg.includes("duplicate key")
      ) {
        console.log(`[migrate] OK (expected): ${msg.slice(0, 120)}`);
      } else {
        throw err;
      }
    }
  }

  console.log("[migrate] Migration completed successfully.");
}

main().catch((err) => {
  console.error("[migrate] ERROR:", err);
  process.exit(1);
});
