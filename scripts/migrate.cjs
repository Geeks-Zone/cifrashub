/**
 * Runs SQL migrations via @neondatabase/serverless.
 *
 * Usage:
 *   node scripts/migrate.cjs       # all migrations
 *   node scripts/migrate.cjs pre   # before drizzle-kit push
 *   node scripts/migrate.cjs post  # after drizzle-kit push
 *
 * Requires DATABASE_URL or DATABASE_URL_UNPOOLED.
 */
/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");
const { neon } = require("@neondatabase/serverless");

const MIGRATION_PHASES = {
  pre: ["migrate-user-song-arrangement.sql"],
  post: ["add-user-fk-cascade.sql"],
};

function splitSqlStatements(sqlText) {
  const statements = [];
  let start = 0;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inLineComment = false;
  let inBlockComment = false;
  let dollarTag = null;

  for (let i = 0; i < sqlText.length; i++) {
    const ch = sqlText[i];
    const next = sqlText[i + 1];

    if (inLineComment) {
      if (ch === "\n") inLineComment = false;
      continue;
    }

    if (inBlockComment) {
      if (ch === "*" && next === "/") {
        inBlockComment = false;
        i++;
      }
      continue;
    }

    if (dollarTag) {
      if (sqlText.startsWith(dollarTag, i)) {
        i += dollarTag.length - 1;
        dollarTag = null;
      }
      continue;
    }

    if (inSingleQuote) {
      if (ch === "'" && next === "'") {
        i++;
      } else if (ch === "'") {
        inSingleQuote = false;
      }
      continue;
    }

    if (inDoubleQuote) {
      if (ch === '"' && next === '"') {
        i++;
      } else if (ch === '"') {
        inDoubleQuote = false;
      }
      continue;
    }

    if (ch === "-" && next === "-") {
      inLineComment = true;
      i++;
      continue;
    }

    if (ch === "/" && next === "*") {
      inBlockComment = true;
      i++;
      continue;
    }

    if (ch === "'") {
      inSingleQuote = true;
      continue;
    }

    if (ch === '"') {
      inDoubleQuote = true;
      continue;
    }

    if (ch === "$") {
      const match = sqlText.slice(i).match(/^\$[A-Za-z0-9_]*\$/);
      if (match) {
        dollarTag = match[0];
        i += dollarTag.length - 1;
        continue;
      }
    }

    if (ch === ";") {
      const stmt = sqlText.slice(start, i).trim();
      if (stmt.replace(/^\s*--.*$/gm, "").trim().length > 0) {
        statements.push(stmt);
      }
      start = i + 1;
    }
  }

  const tail = sqlText.slice(start).trim();
  if (tail.replace(/^\s*--.*$/gm, "").trim().length > 0) {
    statements.push(tail);
  }

  return statements;
}

async function runMigrationFile(sql, fileName) {
  const filePath = path.join(__dirname, fileName);
  if (!fs.existsSync(filePath)) {
    console.log(`[migrate] Missing file, skipping: ${fileName}`);
    return;
  }

  const sqlText = fs.readFileSync(filePath, "utf-8");
  const statements = splitSqlStatements(sqlText);

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

  console.log(`[migrate] OK: ${fileName}`);
}

async function main() {
  const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!url || url.includes("placeholder")) {
    console.log("[migrate] DATABASE_URL missing, skipping migrations.");
    return;
  }

  const phase = process.argv[2] ?? "all";
  const files =
    phase === "all"
      ? [...MIGRATION_PHASES.pre, ...MIGRATION_PHASES.post]
      : MIGRATION_PHASES[phase];

  if (!files) {
    throw new Error(`Invalid migration phase: ${phase}`);
  }

  const sql = neon(url);
  for (const fileName of files) {
    await runMigrationFile(sql, fileName);
  }

  console.log("[migrate] Migrations completed successfully.");
}

main().catch((err) => {
  console.error("[migrate] ERROR:", err);
  process.exit(1);
});
