import { createNeonAuth } from "@neondatabase/neon-js/auth/next/server";

const baseUrl =
  process.env.NEON_AUTH_BASE_URL ??
  process.env.NEON_AUTH_URL ??
  process.env.NEXT_PUBLIC_NEON_AUTH_URL ??
  "https://ep-placeholder.neonauth.invalid/neondb/auth";

const cookieSecret =
  process.env.NEON_AUTH_COOKIE_SECRET ??
  process.env.AUTH_COOKIE_SECRET ??
  "00000000000000000000000000000000";

const hasValidBaseUrl = !baseUrl.includes("ep-placeholder.neonauth.invalid");
const hasValidCookieSecret =
  cookieSecret !== "00000000000000000000000000000000" &&
  cookieSecret.length >= 32;

if (
  process.env.NODE_ENV === "production" &&
  (!hasValidBaseUrl || !hasValidCookieSecret)
) {
  throw new Error(
    "Neon Auth não está configurado. Defina NEON_AUTH_BASE_URL (ou NEON_AUTH_URL) e NEON_AUTH_COOKIE_SECRET (ou AUTH_COOKIE_SECRET).",
  );
}

export const neonAuth = createNeonAuth({
  baseUrl,
  cookies: { secret: cookieSecret },
});
