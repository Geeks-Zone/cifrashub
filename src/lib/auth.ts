"use client";

import { createAuthClient } from "@neondatabase/neon-js/auth/next";

/**
 * Cliente Better Auth via proxy `/api/auth` (Next).
 * Não use URL direta do Neon no browser — cookies ficam no mesmo site.
 */
export const authClient = createAuthClient();
