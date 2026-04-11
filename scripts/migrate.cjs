/**
 * Roda a migração SQL via @neondatabase/serverless (disponível no build da Vercel).
 * Idempotente — seguro para re-executar em todo deploy.
 *
 * Uso: node scripts/migrate.cjs
 * Requer: DATABASE_URL ou DATABASE_URL_UNPOOLED no env.
 */
/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");
const { neon } = require("@neondatabase/serverless");

async function main() {
  const url =
    process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!url || url.includes("placeholder")) {
    console.log("[migrate] Sem DATABASE_URL — pulando migração.");
    return;
  }

  const sqlText = fs.readFileSync(
    path.join(__dirname, "migrate-user-song-arrangement.sql"),
    "utf-8",
  );

  // Separa em statements individuais (ignora linhas vazias e comentários)
  const statements = sqlText
    .split(/;\s*$/m)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("--"));

  const sql = neon(url);

  for (const stmt of statements) {
    try {
      await sql.query(stmt);
    } catch (err) {
      // Erros de "already exists" / "does not exist" são esperados (idempotência)
      const msg = String(err);
      if (
        msg.includes("already exists") ||
        msg.includes("does not exist") ||
        msg.includes("duplicate key")
      ) {
        console.log(`[migrate] OK (esperado): ${msg.slice(0, 120)}`);
      } else {
        throw err;
      }
    }
  }

  console.log("[migrate] Migração concluída com sucesso.");
}

main().catch((err) => {
  console.error("[migrate] ERRO:", err);
  process.exit(1);
});
