import { createNeonAuth } from "@neondatabase/neon-js/auth/next/server";

/**
 * URL do Neon Auth (Console), ex.:
 * https://ep-xxx.neonauth.us-east-1.aws.neon.tech/neondb/auth
 *
 * A integração Neon/Vercel (v0.2+) cria automaticamente `NEON_AUTH_BASE_URL`.
 * `NEON_AUTH_URL` é mantido como fallback para compatibilidade com configurações antigas.
 */
const baseUrl =
  process.env.NEON_AUTH_BASE_URL ??
  process.env.NEON_AUTH_URL ??
  "https://ep-placeholder.neonauth.invalid/neondb/auth";

/**
 * Mínimo 32 caracteres (HMAC-SHA256). Gere com: openssl rand -base64 32
 * A integração Neon/Vercel (v0.2+) cria automaticamente `NEON_AUTH_COOKIE_SECRET`.
 * `AUTH_COOKIE_SECRET` é mantido como fallback para configurações antigas.
 */
const cookieSecret =
  process.env.NEON_AUTH_COOKIE_SECRET ??
  process.env.AUTH_COOKIE_SECRET ??
  "00000000000000000000000000000000";

export const neonAuth = createNeonAuth({
  baseUrl,
  cookies: { secret: cookieSecret },
});
