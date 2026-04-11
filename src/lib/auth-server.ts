import { createNeonAuth } from "@neondatabase/neon-js/auth/next/server";

/**
 * URL do Neon Auth (Console), ex.:
 * https://ep-xxx.neonauth.c-5.us-east-1.aws.neon.tech/neondb/auth
 */
const baseUrl =
  process.env.NEON_AUTH_URL ??
  "https://ep-placeholder.neonauth.invalid/neondb/auth";

/** Mínimo 32 caracteres (validação do SDK). `AUTH_COOKIE_SECRET` no `.env.local` / Vercel. */
const cookieSecret =
  process.env.AUTH_COOKIE_SECRET ?? "00000000000000000000000000000000";

export const neonAuth = createNeonAuth({
  baseUrl,
  cookies: { secret: cookieSecret },
});
