"use client";

import { useEffect, useRef } from "react";

type ShortcutHandlers = {
  onToggleAutoScroll: () => void;
  onToggleZen: () => void;
  onScrollDown: () => void;
  onScrollUp: () => void;
};

export function useSongKeyboardShortcuts(options: {
  enabled: boolean;
} & ShortcutHandlers) {
  const { enabled } = options;
  const handlersRef = useRef<ShortcutHandlers>(options);

  useEffect(() => {
    handlersRef.current = options;
  }, [options]);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

      const h = handlersRef.current;
      if (e.code === "Space") {
        e.preventDefault();
        h.onToggleAutoScroll();
      }
      if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        h.onToggleZen();
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        h.onScrollDown();
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        h.onScrollUp();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled]);
}
