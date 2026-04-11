"use client";

import { useMemo } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CHORD_DB } from "@/lib/chord-db";
import { normalizeChord, simplifyChord } from "@/lib/music";

type ChordPopupProps = {
  chord: string | null;
  onClose: () => void;
  mirrored: boolean;
  /** Casa do capotraste: números à esquerda somam o capo (casas absolutas no braço). */
  capo?: number;
};

export function ChordPopup({ chord, onClose, mirrored, capo = 0 }: ChordPopupProps) {
  const chordInfo = useMemo(() => {
    if (!chord) return null;
    const n = normalizeChord(chord);
    const b = simplifyChord(n);
    return CHORD_DB[n] ?? CHORD_DB[b] ?? null;
  }, [chord]);

  if (!chord) return null;

  const open = true;
  const isBaseOne = !chordInfo || !chordInfo.base || chordInfo.base === 1;

  const indicators = chordInfo
    ? mirrored
      ? [...chordInfo.frets].reverse()
      : chordInfo.frets
    : [];
  const stringLabels = mirrored
    ? ["e", "B", "G", "D", "A", "E"]
    : ["E", "A", "D", "G", "B", "e"];

  let visualFrom = 0;
  let visualTo = 5;
  if (chordInfo?.barre) {
    visualFrom = mirrored ? 5 - chordInfo.barre.to : chordInfo.barre.from;
    visualTo = mirrored ? 5 - chordInfo.barre.from : chordInfo.barre.to;
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="no-print max-w-[280px] gap-4 border-border bg-card p-6 sm:max-w-[280px]"
      >
        <DialogHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <div>
            <DialogTitle className="text-2xl font-bold">{chord}</DialogTitle>
            {capo > 0 ? (
              <p className="mt-1 text-[10px] leading-snug text-muted-foreground">
                Capotraste na {capo}ª casa. À esquerda: casas absolutas no braço (a
                forma do diagrama é a mesma da cifra).
              </p>
            ) : null}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="shrink-0 rounded-full bg-muted"
            onClick={onClose}
          >
            <X className="size-4" />
          </Button>
        </DialogHeader>
        {chordInfo ? (
          <div className="flex flex-col items-center">
            <div className="relative w-full pl-6 pr-2">
              <div className="relative mb-1 h-4 w-full">
                {indicators.map((f, i) => (
                  <span
                    key={i}
                    className={`absolute -ml-2 w-4 text-center text-[10px] font-bold ${
                      f === "x" ? "text-muted-foreground" : "text-foreground/80"
                    }`}
                    style={{ left: `${(i / 5) * 100}%` }}
                  >
                    {f === "x" ? "X" : f === 0 ? "O" : ""}
                  </span>
                ))}
              </div>
              <div className="relative h-36 w-full border-x border-muted-foreground/60 bg-muted/30">
                <div
                  className={`absolute top-0 left-0 w-full ${
                    isBaseOne ? "h-2 bg-foreground/80" : "h-px bg-muted-foreground"
                  }`}
                />
                {[1, 2, 3, 4, 5].map((fret) => (
                  <div
                    key={fret}
                    className="absolute w-full bg-foreground/50"
                    style={{ top: `${(fret / 5) * 100}%`, height: "1px" }}
                  />
                ))}
                {[0, 1, 2, 3, 4, 5].map((str) => (
                  <div
                    key={str}
                    className="absolute h-full bg-foreground/40"
                    style={{ left: `${(str / 5) * 100}%`, width: "1px" }}
                  />
                ))}
                {[0, 1, 2, 3, 4].map((i) => (
                  <span
                    key={i}
                    className="absolute -left-7 w-4 translate-y-[-50%] text-right text-[10px] font-bold text-muted-foreground"
                    style={{ top: `${(i + 0.5) * 20}%` }}
                  >
                    {(chordInfo.base ?? 1) + i + capo}ª
                  </span>
                ))}
                {chordInfo.barre && (
                  <div
                    className="absolute flex items-center rounded-full bg-primary shadow-lg"
                    style={{
                      top: `${((chordInfo.barre.fret - 0.5) / 5) * 100}%`,
                      left: `calc(${(visualFrom / 5) * 100}% - 6px)`,
                      width: `calc(${((visualTo - visualFrom) / 5) * 100}% + 12px)`,
                      height: "14px",
                      transform: "translateY(-50%)",
                    }}
                  >
                    <span className="ml-[5px] text-[9px] font-bold text-primary-foreground">
                      {chordInfo.fingers[chordInfo.barre.from]}
                    </span>
                  </div>
                )}
                {chordInfo.frets.map((fret, str) => {
                  if (fret === "x" || fret === 0) return null;
                  if (
                    chordInfo.barre &&
                    fret === chordInfo.barre.fret &&
                    str >= chordInfo.barre.from &&
                    str <= chordInfo.barre.to
                  )
                    return null;
                  const visualIndex = mirrored ? 5 - str : str;
                  return (
                    <div
                      key={str}
                      className="absolute flex size-[14px] translate-y-[-50%] translate-x-[-50%] items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground shadow-md"
                      style={{
                        left: `${(visualIndex / 5) * 100}%`,
                        top: `${((fret - 0.5) / 5) * 100}%`,
                      }}
                    >
                      {chordInfo.fingers[str]}
                    </div>
                  );
                })}
              </div>
              <div className="relative mt-2 h-4 w-full">
                {stringLabels.map((n, i) => (
                  <span
                    key={i}
                    className="absolute -ml-2 w-4 text-center font-mono text-[10px] text-muted-foreground"
                    style={{ left: `${(i / 5) * 100}%` }}
                  >
                    {n}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <p className="my-6 text-center text-xs text-muted-foreground">
            Diagrama indisponível
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
