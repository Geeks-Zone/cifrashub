"use client";

import { memo } from "react";
import { Activity, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { playTunerNote } from "@/hooks/use-tuner";

type TunerPanelProps = {
  open: boolean;
  onClose: () => void;
};

const NOTES = [
  { label: "E", freq: 82.41 },
  { label: "A", freq: 110.0 },
  { label: "D", freq: 146.83 },
  { label: "G", freq: 196.0 },
  { label: "B", freq: 246.94 },
  { label: "e", freq: 329.63 },
] as const;

export const TunerPanel = memo(function TunerPanel({ open, onClose }: TunerPanelProps) {
  if (!open) return null;

  return (
    <div className="no-print fixed top-1/2 right-20 z-50 w-56 -translate-y-1/2 animate-in slide-in-from-right-8 rounded-2xl border border-border bg-popover p-4 shadow-2xl shadow-black/20">
      <div className="mb-3 flex items-center justify-between">
        <span className="flex items-center gap-2 text-[11px] font-semibold tracking-wide text-foreground/80 uppercase">
          <Activity className="size-3 text-primary" />
          Referência
        </span>
        <Button type="button" variant="ghost" size="icon-xs" className="rounded-lg" onClick={onClose}>
          <X className="size-3" />
        </Button>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {NOTES.map(({ label, freq }) => (
          <Button
            key={label}
            type="button"
            variant="outline"
            className="h-auto rounded-xl py-2.5 font-mono text-sm font-bold transition-all hover:border-primary hover:bg-primary hover:text-primary-foreground"
            onClick={() => playTunerNote(freq)}
          >
            {label}
          </Button>
        ))}
      </div>
      <p className="mt-2.5 text-center text-[10px] text-muted-foreground">
        Clique para ouvir o tom
      </p>
    </div>
  );
});
