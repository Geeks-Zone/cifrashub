"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type PwaInstallState = {
  /** Android/Chrome: native install prompt is available */
  canPrompt: boolean;
  /** iOS Safari: manual "Add to Home Screen" flow needed */
  isIos: boolean;
  /** Already running as standalone PWA */
  isInstalled: boolean;
  promptInstall: () => Promise<void>;
};

function getIsInstalled() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as { standalone?: boolean }).standalone === true
  );
}

function getIsIos(standalone: boolean) {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent;
  const isIosDevice =
    /iPhone|iPad|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  // Chrome/Firefox on iOS use CriOS/FxiOS — they don't support Add to Home Screen via banner
  const isSafari = /Safari/.test(ua) && !/Chrome|CriOS|FxiOS|EdgiOS/.test(ua);
  return isIosDevice && isSafari && !standalone;
}

export function usePwaInstall(): PwaInstallState {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(getIsInstalled);
  const [isIos] = useState(() => getIsIos(getIsInstalled()));

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    const onInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const promptInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    if (result.outcome === "accepted") {
      setDeferredPrompt(null);
    }
  };

  return { canPrompt: !!deferredPrompt, isIos, isInstalled, promptInstall };
}
