"use client";

import { CifraClubMeta, SongHeader } from "./song-header";
import { SongToolbar } from "./song-toolbar";

import { SaveModal } from "./save-modal";
import { ChordPopup } from "./chord-popup";
import { SongContent } from "./song-content";
import { ZenExitButton } from "./zen-exit-button";
import { YoutubeMiniPlayer } from "./youtube-mini-player";

import { SongLoadingState } from "./song-loading-state";
import { SongErrorState } from "./song-error-state";
import { ArtistLinkButton } from "./artist-link-button";
import { songViewMainClassName } from "@/lib/song-article-layout";
import { currentSongKey } from "@/lib/stored-song-key";
import { useSongViewContext } from "./song-context";
import { useAutoScroll } from "@/hooks/use-auto-scroll";
import { useMetronome } from "@/hooks/use-metronome";
import { useSongKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";

/**
 * View principal de visualização de cifra.
 *
 * Refatorado: zero props — tudo vem do SongViewContext (provido pelo SongPage).
 * Responsabilidade: layout e orquestração dos sub-componentes.
 *
 * Melhorias:
 * - Toolbar unificada responsiva: bottom no mobile, lateral direita no desktop
 * - Título/artista visível em mobile (via SongHeader e bloco mobile no main)
 * - SongLoadingState e SongErrorState extraídos como componentes dedicados
 * - ArtistLinkButton unificado
 * - padding-bottom diferenciado: pb-20 mobile / pb-16 desktop
 */
export function SongView() {
  const {
    currentSong,
    songData,
    isParsing,
    parseError,
    zenMode,
    onOpenArtistSongs,
    onToggleZen,
    onTapZone,
    activeChord,
    setActiveChord,
    saveModalOpen,
    setSaveModalOpen,
    folders,
    newFolderName,
    setNewFolderName,
    onToggleSongInFolder,
    onCreateFolderFromSave,
    youtubeMiniOpen,
    setYoutubeMiniOpen,
    youtubeEmbedUrl,
    youtubeFallbackSearchQuery,
    onYoutubeVideoResolved,
    tone,
    capo,
    simplified,
    showTabs,
    effectiveTransposition,
    fontSizeOffset,
    columns,
    spacingOffset,
    mirrored,
    autoScroll,
    scrollSpeed,
    setAutoScroll,
    metronomeActive,
    bpm,
  } = useSongViewContext();

  useAutoScroll(autoScroll, scrollSpeed);
  useMetronome(metronomeActive, bpm);
  useSongKeyboardShortcuts({
    enabled: !isParsing && !parseError,
    onToggleAutoScroll: () => setAutoScroll(!autoScroll),
    onToggleZen: onToggleZen,
    onScrollDown: () => window.scrollBy({ top: window.innerHeight / 2, behavior: "smooth" }),
    onScrollUp: () => window.scrollBy({ top: -window.innerHeight / 2, behavior: "smooth" }),
  });


  return (
    <div className="min-h-screen overflow-x-hidden bg-background pb-20 sm:pb-16 selection:bg-primary/30 print:bg-white print:text-black">
      {/* ─── Chrome superior ─────────────────────────────────────────────── */}
      <SongHeader />

      {/* Botão de saída do modo Zen */}
      {zenMode && <ZenExitButton onExit={onToggleZen} />}

      {/* Toolbars: responsiva (bottom no mobile, right no desktop) */}
      <SongToolbar />

      {/* Modal de salvar em pasta */}
      <SaveModal
        open={saveModalOpen}
        onOpenChange={setSaveModalOpen}
        folders={folders}
        currentSong={currentSong}
        newFolderName={newFolderName}
        onNewFolderNameChange={setNewFolderName}
        onCreateFolder={onCreateFolderFromSave}
        onToggleSongInFolder={onToggleSongInFolder}
      />

      {/* ─── Conteúdo principal ──────────────────────────────────────────── */}
      <main
        className={songViewMainClassName()}
        onClick={onTapZone}
        aria-label={`Cifra de ${currentSong.title}`}
      >
        {/* Bloco de título/artista — zen mode: sempre; mobile: sempre; sm+: oculto (o header já exibe) */}
        <div
          className={
            zenMode
              ? "no-print mb-10 mt-6"
              : "no-print mb-10 mt-2 sm:hidden"
          }
        >
          <h1 className="mb-1.5 text-3xl font-bold tracking-tight text-foreground md:text-5xl">
            {currentSong.title}
          </h1>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
            <h2 className="min-w-0 text-lg font-medium text-muted-foreground md:text-xl">
              {currentSong.artist}
            </h2>
            <ArtistLinkButton onClick={onOpenArtistSongs} variant="inline" />
          </div>
          <CifraClubMeta
            song={currentSong}
            tone={tone}
            capo={capo}
            className="mt-2"
          />
        </div>

        {/* Estados de loading e erro */}
        {isParsing && <SongLoadingState />}
        {parseError && !isParsing && <SongErrorState error={parseError} />}

        {/* Conteúdo da cifra */}
        {!isParsing && !parseError && (
          <SongContent
            songData={songData}
            showTabs={showTabs}
            simplified={simplified}
            effectiveTransposition={effectiveTransposition}
            fontSizeOffset={fontSizeOffset}
            columns={columns}
            spacingOffset={spacingOffset}
            onChordClick={setActiveChord}
          />
        )}
      </main>

      {/* ─── Overlays e players ──────────────────────────────────────────── */}
      <ChordPopup
        chord={activeChord}
        onClose={() => setActiveChord(null)}
        mirrored={mirrored}
        capo={capo}
      />

      <YoutubeMiniPlayer
        open={youtubeMiniOpen}
        onClose={() => setYoutubeMiniOpen(false)}
        embedUrl={youtubeEmbedUrl}
        isParsing={isParsing}
        parseError={parseError}
        fallbackSearchQuery={youtubeFallbackSearchQuery}
        onVideoResolved={onYoutubeVideoResolved}
        songId={currentSongKey(currentSong)}
      />
    </div>
  );
}
