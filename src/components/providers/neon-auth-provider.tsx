"use client";

import type { ReactNode } from "react";
import { NeonAuthUIProvider } from "@neondatabase/neon-js/auth/react/ui";
import { authClient } from "@/lib/auth";

/** Estilos do Neon Auth vêm de `globals.css` (`@neondatabase/neon-js/ui/tailwind`), não de `ui/css`, para não carregar um segundo Tailwind/preflight que quebra o layout. */

/** UI e SDK instalam cópias aninhadas de `@better-fetch/fetch`; tipos divergem, runtime é compatível. */
const authClientForUi = authClient as unknown as Parameters<
  typeof NeonAuthUIProvider
>[0]["authClient"];

export function NeonAuthProvider({ children }: { children: ReactNode }) {
  return (
    <NeonAuthUIProvider emailOTP authClient={authClientForUi}>
      {children}
    </NeonAuthUIProvider>
  );
}
