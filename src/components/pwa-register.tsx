"use client";

import { useEffect } from "react";

export function PWARegister() {
  useEffect(() => {
    /** Em dev: não registar SW e remover registos antigos (cache de chunks / ícones lucide dessincronizados). */
    if (process.env.NODE_ENV !== "production") {
      if ("serviceWorker" in navigator) {
        void navigator.serviceWorker
          .getRegistrations()
          .then((regs) => {
            for (const r of regs) void r.unregister();
          });
      }
      return;
    }
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .catch((err) => console.error("SW registration failed:", err));
    }
  }, []);

  return null;
}
