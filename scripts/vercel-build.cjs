/**
 * Build na Vercel: em Production, aplica migrações e schema Drizzle antes do Next.
 * Em Preview ou sem VERCEL_ENV, só roda `next build` (evita push no DB de prod em previews).
 */
/* eslint-disable @typescript-eslint/no-require-imports */
const { execSync } = require("child_process");

if (process.env.VERCEL_ENV === "production") {
  const dbUrl = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error(
      "\n[vercel-build] ERROR: DATABASE_URL (or DATABASE_URL_UNPOOLED) is not set.\n" +
        "Configure it in Vercel → Settings → Environment Variables before deploying to production.\n" +
        "Required variables:\n" +
        "  - DATABASE_URL\n" +
        "  - DATABASE_URL_UNPOOLED\n" +
        "  - AUTH_COOKIE_SECRET\n" +
        "  - NEON_AUTH_URL\n",
    );
    process.exit(1);
  }
  // 1. Migração SQL (backfill de dados + criação de tabelas). Idempotente.
  execSync("node scripts/migrate.cjs", { stdio: "inherit" });
  // 2. drizzle-kit push alinha o schema restante (colunas, defaults, tipos).
  execSync("npm run db:push:ci", { stdio: "inherit" });
}
execSync("npm run build", { stdio: "inherit" });
