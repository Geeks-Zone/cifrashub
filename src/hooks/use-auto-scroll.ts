"use client";

import { useEffect } from "react";

const SPEED_MAP: Record<number, number> = {
  1: 80,
  2: 50,
  3: 30,
  4: 15,
  5: 10,
};

export function useAutoScroll(active: boolean, scrollSpeed: number) {
  useEffect(() => {
    if (!active) return;

    const ms = SPEED_MAP[scrollSpeed] ?? 30;
    const id = setInterval(() => {
      window.scrollBy(0, 1);
    }, ms);

    return () => clearInterval(id);
  }, [active, scrollSpeed]);
}
