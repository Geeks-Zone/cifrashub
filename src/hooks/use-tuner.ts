"use client";

import { createAudioContext, ensureResumed } from "@/lib/audio-context";

let sharedTunerCtx: AudioContext | null = null;

function getTunerContext(): AudioContext | null {
  if (!sharedTunerCtx || sharedTunerCtx.state === "closed") {
    sharedTunerCtx = createAudioContext();
  }
  return sharedTunerCtx;
}

export function playTunerNote(freq: number): void {
  try {
    const ctx = getTunerContext();
    if (!ctx) return;
    ensureResumed(ctx);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "triangle";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 3);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 3);
  } catch {
    console.warn("Áudio não suportado");
  }
}
