"use client";

import type { ReactNode } from "react";
import {
  Bookmark,
  ChevronLeft,
  FastForward,
  FileEdit,
  Link2,
  ListMusic,
  Maximize,
  Minus,
  MonitorPlay,
  Pause,
  Play,
  Plus,
  Printer,
  Rewind,
  Timer,
} from "lucide-react";
import { AuthHeaderControl } from "@/components/auth/user-menu";
import { Button } from "@/components/ui/button";
import { transposeRootNote } from "@/lib/music";
import { cn } from "@/lib/utils";
import type { CurrentSongMeta } from "@/lib/types";
import { useSongViewContext } from "./song-context";

// ─── CifraClubMeta ────────────────────────────────────────────────────────────

export function CifraClubMeta({
  song,
  tone = 0,
  capo = 0,
  className,
}: {
  song: CurrentSongMeta;
  tone?: number;
  capo?: number;
  className?: string;
}) {
  const hasStaticMeta =
    Boolean(song.cifraSoundingKey) ||
    Boolean(song.cifraWrittenKey) ||
    song.cifraCapo !== undefined;

  const tomOriginalLine = (() => {
    if (song.cifraWrittenKey) return `Tom original: ${song.cifraWrittenKey}`;
    if (song.cifraSoundingKey) return `Tom original: ${song.cifraSoundingKey}`;
    return null;
  })();

  const tomLine = (() => {
    if (song.cifraWrittenKey) {
      const forma = transposeRootNote(song.cifraWrittenKey, tone);
      const soando = transposeRootNote(song.cifraWrittenKey, tone + capo);
      if (forma === soando) return `Tom: ${forma}`;
      return `Tom: ${soando} (forma dos acordes em ${forma})`;
    }
    if (song.cifraSoundingKey) {
      return `Tom: ${transposeRootNote(song.cifraSoundingKey, tone)}`;
    }
    return null;
  })();

  const capoLine = capo > 0 ? `Capotraste na ${capo}ª casa` : null;

  if (!hasStaticMeta && capo === 0 && tone === 0 && !tomOriginalLine && !tomLine && !capoLine) {
    return null;
  }
  if (!tomOriginalLine && !tomLine && !capoLine) return null;

  return (
    <div
      className={cn(
        "space-y-0.5 text-left text-[10px] leading-snug text-muted-foreground",
        className,
      )}
    >
      {tomOriginalLine ? <p className="text-balance">{tomOriginalLine}</p> : null}
      {tomLine ? <p className="text-balance">{tomLine}</p> : null}
      {capoLine ? <p>{capoLine}</p> : null}
    </div>
  );
}

// ─── SongHeader ───────────────────────────────────────────────────────────────

type SongHeaderProps = {
  /**
   * Botões extra antes do Bookmark (ex.: botão de editar cifra).
   * Mantido como prop pois é injetado pelo SongView.
   */
  extraActions?: ReactNode;
};

/**
 * Header da view de cifra.
 * Botão de configurações (⚙) REMOVIDO — agora está na SongToolbar lateral.
 * Lê tudo do SongViewContext — apenas `extraActions` como prop.
 */
export function SongHeader({ extraActions }: SongHeaderProps) {
  const {
    currentSong,
    zenMode,
    onBack,
    onOpenVideo,
    onOpenArtistSongs,
    onToggleZen,
    onPrint,
    isSavedInAnyFolder,
    setSaveModalOpen,
    onShareArrangement,
    shareArrangementDisabled,
    onOpenSongEditor,
    isParsing,
    parseError,
    autoScroll, setAutoScroll,
    scrollSpeed, setScrollSpeed,
    metronomeActive, setMetronomeActive,
    bpm, setBpm,
    tone,
    capo,
  } = useSongViewContext();

  if (zenMode) return null;

  return (
    <header className="no-print sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-xl backdrop-saturate-150">
      <div className="flex items-center justify-between px-3 py-3 sm:px-4">

        {/* ─── Lado esquerdo: voltar + título ─── */}
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="-ml-1 shrink-0 rounded-xl text-muted-foreground"
            onClick={onBack}
            aria-label="Voltar"
          >
            <ChevronLeft className="size-5" />
          </Button>

          {/* Mobile: título compacto */}
          <div className="min-w-0 flex-1 sm:hidden">
            <p className="truncate text-sm font-semibold leading-tight text-foreground">
              {currentSong.title}
            </p>
            <p className="truncate text-[11px] text-muted-foreground">
              {currentSong.artist}
            </p>
          </div>

          {/* Desktop: título + artista + meta */}
          <div className="hidden min-w-0 flex-1 items-start gap-3 sm:flex md:gap-5">
            <div className="min-w-0 w-fit max-w-[min(32rem,calc(100%-9rem))]">
              <h1 className="truncate text-sm leading-tight font-semibold text-foreground">
                {currentSong.title}
              </h1>
              <div className="mt-0.5 flex min-w-0 items-center gap-1.5">
                <h2 className="min-w-0 truncate text-[11px] text-muted-foreground">
                  {currentSong.artist}
                </h2>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 shrink-0 rounded-md px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
                  onClick={onOpenArtistSongs}
                  title="Ver todas as músicas do artista"
                >
                  <ListMusic className="mr-1 size-3" />
                  Músicas
                </Button>
              </div>
            </div>
            <CifraClubMeta
              song={currentSong}
              tone={tone}
              capo={capo}
              className="shrink-0 text-balance sm:max-w-[min(240px,36vw)] sm:pt-0.5"
            />
          </div>
        </div>

        {/* ─── Lado direito: ações ─── */}
        <div className="flex items-center gap-0.5 sm:gap-1">

          {/* ── Playback: Auto-scroll ── */}
          <div className="flex items-center">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn(
                "rounded-xl",
                autoScroll ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => setAutoScroll(!autoScroll)}
              title={autoScroll ? "Parar rolagem" : "Rolagem automática"}
              aria-label={autoScroll ? "Parar rolagem" : "Rolagem automática"}
            >
              {autoScroll ? <Pause className="size-[18px]" fill="currentColor" /> : <Play className="ml-0.5 size-[18px]" fill="currentColor" />}
            </Button>
            {autoScroll && (
              <div className="hidden items-center gap-0.5 sm:flex">
                <Button type="button" variant="ghost" size="icon" className="size-7 rounded-lg text-muted-foreground" onClick={() => setScrollSpeed((s) => Math.max(1, s - 1))} disabled={scrollSpeed <= 1}><Rewind className="size-3" /></Button>
                <span className="min-w-[1.5rem] text-center text-[10px] font-bold text-primary">{scrollSpeed}x</span>
                <Button type="button" variant="ghost" size="icon" className="size-7 rounded-lg text-muted-foreground" onClick={() => setScrollSpeed((s) => Math.min(5, s + 1))} disabled={scrollSpeed >= 5}><FastForward className="size-3" /></Button>
              </div>
            )}
          </div>

          {/* ── Playback: Metrônomo ── */}
          <div className="flex items-center">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn(
                "rounded-xl",
                metronomeActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => setMetronomeActive(!metronomeActive)}
              title={metronomeActive ? "Parar metrônomo" : "Metrônomo"}
              aria-label={metronomeActive ? "Parar metrônomo" : "Metrônomo"}
            >
              {metronomeActive ? <span className="text-[11px] font-bold">{bpm}</span> : <Timer className="size-[18px]" />}
            </Button>
            {metronomeActive && (
              <div className="hidden items-center gap-0.5 sm:flex">
                <Button type="button" variant="ghost" size="icon" className="size-7 rounded-lg text-muted-foreground" onClick={() => setBpm((b) => Math.max(40, b - 5))}><Minus className="size-3" /></Button>
                <Button type="button" variant="ghost" size="icon" className="size-7 rounded-lg text-muted-foreground" onClick={() => setBpm((b) => Math.min(240, b + 5))}><Plus className="size-3" /></Button>
              </div>
            )}
          </div>

          {/* ── Separador visual ── */}
          <div className="mx-0.5 hidden h-5 w-px bg-border/50 sm:block" />

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-xl text-muted-foreground hover:text-foreground"
            onClick={onOpenVideo}
            title="Abrir mini player no YouTube"
            aria-label="Abrir mini player no YouTube"
          >
            <MonitorPlay className="size-[18px]" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-xl text-muted-foreground hover:text-foreground"
            onClick={onToggleZen}
            title="Modo palco (Zen)"
            aria-label="Activar modo palco"
          >
            <Maximize className="size-[18px]" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="hidden rounded-xl text-muted-foreground hover:text-foreground sm:flex"
            onClick={onPrint}
            title="Imprimir / PDF"
            aria-label="Imprimir cifra"
          >
            <Printer className="size-[18px]" />
          </Button>
          {onShareArrangement ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="rounded-xl text-muted-foreground hover:text-foreground disabled:opacity-40"
              title="Copiar link de compartilhamento"
              aria-label="Copiar link de compartilhamento"
              disabled={shareArrangementDisabled}
              onClick={onShareArrangement}
            >
              <Link2 className="size-[18px]" />
            </Button>
          ) : null}
          {onOpenSongEditor && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="rounded-xl text-muted-foreground hover:text-foreground disabled:opacity-40"
              disabled={isParsing || Boolean(parseError)}
              onClick={onOpenSongEditor}
              title="Editar cifra"
              aria-label="Editar cifra"
            >
              <FileEdit className="size-[18px]" />
            </Button>
          )}
          {extraActions}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
              "rounded-xl",
              isSavedInAnyFolder
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => setSaveModalOpen(true)}
            title={isSavedInAnyFolder ? "Salvo em pasta" : "Salvar em pasta"}
            aria-label={isSavedInAnyFolder ? "Salvo em pasta" : "Salvar em pasta"}
          >
            <Bookmark
              className="size-[18px]"
              fill={isSavedInAnyFolder ? "currentColor" : "none"}
            />
          </Button>
          <AuthHeaderControl className="ml-0.5 sm:ml-1" />
        </div>
      </div>
    </header>
  );
}
