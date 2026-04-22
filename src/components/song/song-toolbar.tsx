"use client";

import { memo, useEffect, useRef, useState } from "react";
import {
  ArrowLeftRight,
  ArrowUpDown,
  Columns2,
  FlipHorizontal,
  Guitar,
  Magnet,
  Minus,
  Plus,
  Type,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getRelativeKeyToggle, transposeRootNote } from "@/lib/music";
import type { Section } from "@/lib/types";
import { useSongViewContext } from "./song-context";

/** Extrai a raiz do primeiro acorde encontrado nos dados da cifra. */
function firstChordRoot(songData: Section[]): string | undefined {
  for (const section of songData) {
    for (const line of section.content) {
      for (const block of line) {
        if (block.chord) {
          const m = block.chord.match(/^([A-G][#b]?)/);
          if (m) return m[1];
        }
      }
    }
  }
  return undefined;
}

// ─── Shared primitive buttons ─────────────────────────────────────────────────

function ToolbarButton({
  active,
  onClick,
  title,
  children,
  className,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant={active ? "default" : "outline"}
      size="icon"
      className={cn(
        "relative z-10 size-10 shrink-0 rounded-xl shadow-md transition-all",
        active ? "shadow-primary/20 bg-primary/95 text-primary-foreground hover:bg-primary" : "bg-background/95 backdrop-blur",
        className,
      )}
      onClick={onClick}
      title={title}
      aria-pressed={active}
    >
      {children}
    </Button>
  );
}

function ExpandButton({
  onClick,
  children,
  title,
  ariaLabel,
  disabled,
}: {
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
  ariaLabel?: string;
  disabled?: boolean;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      disabled={disabled}
      title={title}
      className={cn(
        "size-9 shrink-0 rounded-xl shadow-md text-foreground",
        disabled && "opacity-50",
      )}
      onClick={onClick}
      aria-label={ariaLabel}
    >
      {children}
    </Button>
  );
}

/** Agrupa o botão principal com o painel flutuante à esquerda (desktop) */
function ToolbarPopoverGroup({
  open,
  setExpanded,
  popoverContent,
  children,
}: {
  open: boolean;
  setExpanded: (v: string | null) => void;
  popoverContent?: React.ReactNode;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) {
        setExpanded(null);
      }
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open, setExpanded]);

  return (
    <div
      ref={ref}
      className="relative flex items-center justify-end"
    >
      {popoverContent && (
        <div
          className={cn(
            "absolute right-full mr-2 flex items-center gap-1.5 transition-all duration-300",
            open
              ? "pointer-events-auto translate-x-0 opacity-100"
              : "pointer-events-none translate-x-4 opacity-0",
          )}
        >
          {popoverContent}
        </div>
      )}
      {children}
    </div>
  );
}

// ─── Desktop toolbar (botões fixos, sempre visíveis) ─────────────────────────

export const SongToolbar = memo(function SongToolbar() {
  const {
    zenMode,
    showTabs, setShowTabs,
    tone, setTone,
    capo, setCapo,
    simplified, setSimplified,
    fontSizeOffset, setFontSizeOffset,
    columns, setColumns,
    spacingOffset, setSpacingOffset,
    mirrored, setMirrored,
    currentSong,
    songData,
  } = useSongViewContext();

  const [expanded, setExpanded] = useState<string | null>(null);

  if (zenMode) return null;

  const toggleMenu = (m: string) => setExpanded((prev) => (prev === m ? null : m));

  const fontScale = Math.round((1 + fontSizeOffset / 16) * 100);
  const writtenKey = currentSong.cifraWrittenKey;
  const displayKey = writtenKey ?? currentSong.cifraSoundingKey ?? firstChordRoot(songData);
  const toneLabel = displayKey
    ? transposeRootNote(displayKey, tone)
    : tone === 0
      ? "—"
      : tone > 0
        ? `+${tone}`
        : `${tone}`;

  const relToggle = writtenKey ? getRelativeKeyToggle(writtenKey, tone) : null;

  return (
    <div className="no-print fixed right-3 top-1/2 z-40 hidden -translate-y-1/2 flex-col items-center gap-2 sm:flex sm:right-4">

      {/* ── Grupo 1: Tom & Capo ── */}
      <ToolbarPopoverGroup
        open={expanded === "tone"}
        setExpanded={setExpanded}
        popoverContent={
          <>
            <ExpandButton onClick={() => setTone((t) => t - 1)}><Minus className="size-3.5" /></ExpandButton>
            <ExpandButton onClick={() => setTone((t) => t + 1)}><Plus className="size-3.5" /></ExpandButton>
            {relToggle && (
              <>
                <div className="mx-1 h-5 w-px bg-border/50" />
                <Button
                  type="button"
                  size="sm"
                  variant={relToggle.isAtRelative ? "default" : "outline"}
                  className="h-9 gap-1.5 rounded-xl px-3 text-[10px] font-bold"
                  onClick={() => { setTone(relToggle.targetTone); setExpanded(null); }}
                >
                  <ArrowLeftRight className="size-3" />
                  {relToggle.label}
                </Button>
              </>
            )}
          </>
        }
      >
        <ToolbarButton active={tone !== 0} onClick={() => toggleMenu("tone")} title="Tom" className="flex-col gap-0 p-0">
          <span className={cn("text-[8px] font-medium leading-none", tone !== 0 ? "text-primary-foreground/70" : "text-muted-foreground")}>Tom</span>
          <span className="text-xs font-bold leading-none">{toneLabel}</span>
        </ToolbarButton>
      </ToolbarPopoverGroup>

      <ToolbarPopoverGroup
        open={expanded === "capo"}
        setExpanded={setExpanded}
        popoverContent={
          <>
            <ExpandButton onClick={() => setCapo((t) => Math.max(0, t - 1))} disabled={capo <= 0}><Minus className="size-3.5" /></ExpandButton>
            <ExpandButton onClick={() => setCapo((t) => Math.min(12, t + 1))} disabled={capo >= 12}><Plus className="size-3.5" /></ExpandButton>
          </>
        }
      >
        <ToolbarButton active={capo !== 0} onClick={() => toggleMenu("capo")} title="Capotraste" className="flex-col gap-0 p-0">
          {capo !== 0 ? (
            <>
              <span className="text-[10px] font-bold leading-none">Cp</span>
              <span className="text-xs font-bold leading-none">{capo}</span>
            </>
          ) : (
            <>
              <Magnet className="mb-[1px] size-3" />
              <span className="text-[10px] font-bold leading-none">Cp</span>
            </>
          )}
        </ToolbarButton>
      </ToolbarPopoverGroup>

      {/* ── Separador ── */}
      <div className="my-0.5 h-px w-6 bg-border/40" />

      {/* ── Grupo 2: Fonte & Espaçamento ── */}
      <ToolbarPopoverGroup
        open={expanded === "font"}
        setExpanded={setExpanded}
        popoverContent={
          <>
            <ExpandButton onClick={() => setFontSizeOffset((s) => Math.max(-8, s - 2))}><Minus className="size-3.5" /></ExpandButton>
            <ExpandButton onClick={() => setFontSizeOffset((s) => Math.min(24, s + 2))}><Plus className="size-3.5" /></ExpandButton>
          </>
        }
      >
        <ToolbarButton active={fontSizeOffset !== 0} onClick={() => toggleMenu("font")} title="Tamanho da fonte" className="flex-col gap-0 p-0">
          <Type className="size-3" />
          <span className="mt-[1px] text-[9px] font-bold leading-none">{fontScale}%</span>
        </ToolbarButton>
      </ToolbarPopoverGroup>

      <ToolbarPopoverGroup
        open={expanded === "spacing"}
        setExpanded={setExpanded}
        popoverContent={
          <>
            <ExpandButton onClick={() => setSpacingOffset((s) => Math.max(-8, s - 2))} disabled={spacingOffset <= -8}><Minus className="size-3.5" /></ExpandButton>
            <ExpandButton onClick={() => setSpacingOffset((s) => Math.min(32, s + 2))} disabled={spacingOffset >= 32}><Plus className="size-3.5" /></ExpandButton>
          </>
        }
      >
        <ToolbarButton active={spacingOffset !== 0} onClick={() => toggleMenu("spacing")} title="Espaçamento entre linhas" className="flex-col gap-0 p-0">
          {spacingOffset !== 0 ? <span className="text-xs font-bold leading-none">{spacingOffset}</span> : <ArrowUpDown className="size-4" />}
        </ToolbarButton>
      </ToolbarPopoverGroup>

      <ToolbarPopoverGroup
        open={expanded === "columns"}
        setExpanded={setExpanded}
        popoverContent={
          <>
            <ExpandButton onClick={() => setColumns((s) => Math.max(1, s - 1))} disabled={columns <= 1}><Minus className="size-3.5" /></ExpandButton>
            <ExpandButton onClick={() => setColumns((s) => Math.min(6, s + 1))} disabled={columns >= 6}><Plus className="size-3.5" /></ExpandButton>
          </>
        }
      >
        <ToolbarButton active={columns > 1} onClick={() => toggleMenu("columns")} title="Colunas em telas grandes" className={cn(columns > 1 && "flex-col gap-0 p-0")}>
          {columns > 1 ? (
            <>
              <Columns2 className="mb-[1px] size-3" />
              <span className="text-xs font-bold leading-none">{columns}</span>
            </>
          ) : <Columns2 className="size-4" />}
        </ToolbarButton>
      </ToolbarPopoverGroup>

      {/* ── Separador ── */}
      <div className="my-0.5 h-px w-6 bg-border/40" />

      {/* ── Grupo 3: Modo de exibição ── */}
      <ToolbarButton active={showTabs} onClick={() => { setShowTabs(!showTabs); setExpanded(null); }} title={showTabs ? "Ocultar tablaturas" : "Mostrar tablaturas"} className="font-mono text-[10px] font-extrabold tracking-widest">
        TAB
      </ToolbarButton>

      <ToolbarButton active={simplified} onClick={() => { setSimplified(!simplified); setExpanded(null); }} title={simplified ? "Mostrar acordes originais" : "Simplificar acordes"}>
        <Guitar className="size-4" />
      </ToolbarButton>

      <ToolbarButton active={mirrored} onClick={() => { setMirrored(!mirrored); setExpanded(null); }} title={mirrored ? "Mão direita (padrão)" : "Mão esquerda (canhoto)"}>
        <FlipHorizontal className="size-4 -scale-x-100" />
      </ToolbarButton>
    </div>
  );
});

// ─── Mobile toolbar (botões flutuantes, espelho do desktop) ──────────────────

/** Popover que expande à esquerda do botão — versão mobile (bottom-right) */
function MobilePopoverGroup({
  open,
  setExpanded,
  popoverContent,
  children,
}: {
  open: boolean;
  setExpanded: (v: string | null) => void;
  popoverContent?: React.ReactNode;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) {
        setExpanded(null);
      }
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open, setExpanded]);

  return (
    <div ref={ref} className="relative flex items-center justify-end">
      {popoverContent && (
        <div
          className={cn(
            "absolute right-full mr-2 flex items-center gap-1.5 transition-all duration-300",
            open
              ? "pointer-events-auto translate-x-0 opacity-100"
              : "pointer-events-none translate-x-4 opacity-0",
          )}
        >
          {popoverContent}
        </div>
      )}
      {children}
    </div>
  );
}

export const SongMobileToolbar = memo(function SongMobileToolbar() {
  const {
    zenMode,
    tone, setTone,
    capo, setCapo,
    fontSizeOffset, setFontSizeOffset,
    spacingOffset, setSpacingOffset,
    columns, setColumns,
    currentSong,
    songData,
    showTabs, setShowTabs,
    simplified, setSimplified,
    mirrored, setMirrored,
  } = useSongViewContext();

  const [expanded, setExpanded] = useState<string | null>(null);

  if (zenMode) return null;

  const toggleMenu = (m: string) => setExpanded((prev) => (prev === m ? null : m));

  const fontScale = Math.round((1 + fontSizeOffset / 16) * 100);
  const writtenKey = currentSong.cifraWrittenKey;
  const displayKey = writtenKey ?? currentSong.cifraSoundingKey ?? firstChordRoot(songData);
  const toneLabel = displayKey
    ? transposeRootNote(displayKey, tone)
    : tone === 0 ? "—" : tone > 0 ? `+${tone}` : `${tone}`;

  const relToggle = writtenKey ? getRelativeKeyToggle(writtenKey, tone) : null;

  return (
    <div className="no-print fixed right-3 bottom-[calc(max(1rem,env(safe-area-inset-bottom,1rem)))] z-40 flex flex-col items-end gap-2 sm:hidden">

      {/* ── Grupo 1: Tom & Capo ── */}
      <MobilePopoverGroup
        open={expanded === "tone"}
        setExpanded={setExpanded}
        popoverContent={
          <>
            <ExpandButton onClick={() => setTone((t) => t - 1)}><Minus className="size-3.5" /></ExpandButton>
            <ExpandButton onClick={() => setTone((t) => t + 1)}><Plus className="size-3.5" /></ExpandButton>
            {relToggle && (
              <>
                <div className="mx-1 h-5 w-px bg-border/50" />
                <Button
                  type="button"
                  size="sm"
                  variant={relToggle.isAtRelative ? "default" : "outline"}
                  className="h-9 gap-1.5 rounded-xl px-3 text-[10px] font-bold shadow-md"
                  onClick={() => { setTone(relToggle.targetTone); setExpanded(null); }}
                >
                  <ArrowLeftRight className="size-3" />
                  {relToggle.label}
                </Button>
              </>
            )}
          </>
        }
      >
        <ToolbarButton active={tone !== 0} onClick={() => toggleMenu("tone")} title="Tom" className="flex-col gap-0 p-0">
          <span className={cn("text-[8px] font-medium leading-none", tone !== 0 ? "text-primary-foreground/70" : "text-muted-foreground")}>Tom</span>
          <span className="text-xs font-bold leading-none">{toneLabel}</span>
        </ToolbarButton>
      </MobilePopoverGroup>

      <MobilePopoverGroup
        open={expanded === "capo"}
        setExpanded={setExpanded}
        popoverContent={
          <>
            <ExpandButton onClick={() => setCapo((t) => Math.max(0, t - 1))} disabled={capo <= 0}><Minus className="size-3.5" /></ExpandButton>
            <ExpandButton onClick={() => setCapo((t) => Math.min(12, t + 1))} disabled={capo >= 12}><Plus className="size-3.5" /></ExpandButton>
          </>
        }
      >
        <ToolbarButton active={capo !== 0} onClick={() => toggleMenu("capo")} title="Capotraste" className="flex-col gap-0 p-0">
          {capo !== 0 ? (
            <>
              <span className="text-[10px] font-bold leading-none">Cp</span>
              <span className="text-xs font-bold leading-none">{capo}</span>
            </>
          ) : (
            <>
              <Magnet className="mb-[1px] size-3" />
              <span className="text-[10px] font-bold leading-none">Cp</span>
            </>
          )}
        </ToolbarButton>
      </MobilePopoverGroup>

      {/* ── Separador ── */}
      <div className="my-0.5 h-px w-6 self-center bg-border/40" />

      {/* ── Grupo 2: Fonte & Espaçamento & Colunas ── */}
      <MobilePopoverGroup
        open={expanded === "font"}
        setExpanded={setExpanded}
        popoverContent={
          <>
            <ExpandButton onClick={() => setFontSizeOffset((s) => Math.max(-8, s - 2))}><Minus className="size-3.5" /></ExpandButton>
            <ExpandButton onClick={() => setFontSizeOffset((s) => Math.min(24, s + 2))}><Plus className="size-3.5" /></ExpandButton>
          </>
        }
      >
        <ToolbarButton active={fontSizeOffset !== 0} onClick={() => toggleMenu("font")} title="Tamanho da fonte" className="flex-col gap-0 p-0">
          <Type className="size-3" />
          <span className="mt-[1px] text-[9px] font-bold leading-none">{fontScale}%</span>
        </ToolbarButton>
      </MobilePopoverGroup>

      <MobilePopoverGroup
        open={expanded === "spacing"}
        setExpanded={setExpanded}
        popoverContent={
          <>
            <ExpandButton onClick={() => setSpacingOffset((s) => Math.max(-8, s - 2))} disabled={spacingOffset <= -8}><Minus className="size-3.5" /></ExpandButton>
            <ExpandButton onClick={() => setSpacingOffset((s) => Math.min(32, s + 2))} disabled={spacingOffset >= 32}><Plus className="size-3.5" /></ExpandButton>
          </>
        }
      >
        <ToolbarButton active={spacingOffset !== 0} onClick={() => toggleMenu("spacing")} title="Espaçamento" className="flex-col gap-0 p-0">
          {spacingOffset !== 0 ? <span className="text-xs font-bold leading-none">{spacingOffset}</span> : <ArrowUpDown className="size-4" />}
        </ToolbarButton>
      </MobilePopoverGroup>

      <MobilePopoverGroup
        open={expanded === "columns"}
        setExpanded={setExpanded}
        popoverContent={
          <>
            <ExpandButton onClick={() => setColumns((s) => Math.max(1, s - 1))} disabled={columns <= 1}><Minus className="size-3.5" /></ExpandButton>
            <ExpandButton onClick={() => setColumns((s) => Math.min(6, s + 1))} disabled={columns >= 6}><Plus className="size-3.5" /></ExpandButton>
          </>
        }
      >
        <ToolbarButton active={columns > 1} onClick={() => toggleMenu("columns")} title="Colunas" className={cn(columns > 1 && "flex-col gap-0 p-0")}>
          {columns > 1 ? (
            <>
              <Columns2 className="mb-[1px] size-3" />
              <span className="text-xs font-bold leading-none">{columns}</span>
            </>
          ) : <Columns2 className="size-4" />}
        </ToolbarButton>
      </MobilePopoverGroup>

      {/* ── Separador ── */}
      <div className="my-0.5 h-px w-6 self-center bg-border/40" />

      {/* ── Grupo 3: Modo de exibição ── */}
      <ToolbarButton active={showTabs} onClick={() => { setShowTabs(!showTabs); setExpanded(null); }} title={showTabs ? "Ocultar tablaturas" : "Mostrar tablaturas"} className="font-mono text-[10px] font-extrabold tracking-widest">
        TAB
      </ToolbarButton>

      <ToolbarButton active={simplified} onClick={() => { setSimplified(!simplified); setExpanded(null); }} title={simplified ? "Acordes originais" : "Simplificar"}>
        <Guitar className="size-4" />
      </ToolbarButton>

      <ToolbarButton active={mirrored} onClick={() => { setMirrored(!mirrored); setExpanded(null); }} title={mirrored ? "Mão direita" : "Canhoto"}>
        <FlipHorizontal className="size-4 -scale-x-100" />
      </ToolbarButton>
    </div>
  );
});
