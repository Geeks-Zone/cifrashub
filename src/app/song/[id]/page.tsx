"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { SongView } from "@/components/song/song-view";
import { SongViewProvider } from "@/components/song/song-context";
import { usePlayerStore } from "@/store/use-player-store";
import { useLibraryStore } from "@/store/use-library-store";
import { useLibraryActions } from "@/hooks/use-library-actions";
import { CurrentSongMeta, Section } from "@/lib/types";
import { fetchChordsHtml } from "@/lib/fetch-proxy";
import { processHtmlAndExtract } from "@/lib/parser";

export default function SongPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const folderId = searchParams.get("folderId");
  const editReturn = searchParams.get("edit");
  const slugParam = Array.isArray(params.id) ? params.id[0] : params.id; // actually should be artistSlug-slug

  const [currentSong, setCurrentSong] = useState<CurrentSongMeta | null>(null);
  const [songData, setSongData] = useState<Section[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Here we would ideally load the song from library or remote
  useEffect(() => {
    if (!slugParam) return;
    
    const [artistSlug, ...rest] = slugParam.split("-");
    const slug = rest.join("-");

    const load = async () => {
       try {
           setIsLoading(true);
           const html = await fetchChordsHtml(artistSlug, slug);
           const songObj = processHtmlAndExtract(html, slugParam, "Música", "Artista", artistSlug, slug);
           setCurrentSong(songObj);
           setSongData(songObj.songData);
       } catch {
       } finally {
           setIsLoading(false);
       }
    };
    load();
  }, [slugParam]);

  const player = usePlayerStore();
  const { folders } = useLibraryStore();

  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  if (isLoading || !currentSong) return <div className="p-8 text-center text-muted-foreground">Carregando cifra...</div>;

  const value = {
      currentSong,
      songData,
      isParsing: false,
      parseError: null,
      tone: player.tone,
      setTone: player.setTone,
      capo: player.capo,
      setCapo: player.setCapo,
      simplified: player.simplified,
      setSimplified: player.setSimplified,
      showTabs: player.showTabs,
      setShowTabs: player.setShowTabs,
      mirrored: player.mirrored,
      setMirrored: player.setMirrored,
      fontSizeOffset: player.fontSizeOffset,
      setFontSizeOffset: player.setFontSizeOffset,
      columns: player.columns,
      setColumns: player.setColumns,
      spacingOffset: player.spacingOffset,
      setSpacingOffset: player.setSpacingOffset,
      effectiveTransposition: player.tone - player.capo,
      zenMode: player.zenMode,
      autoScroll: player.autoScroll,
      setAutoScroll: player.setAutoScroll,
      scrollSpeed: player.scrollSpeed,
      setScrollSpeed: player.setScrollSpeed,
      metronomeActive: player.metronomeActive,
      setMetronomeActive: player.setMetronomeActive,
      bpm: player.bpm,
      setBpm: player.setBpm,
      activeChord: player.activeChord,
      setActiveChord: player.setActiveChord,
      displaySettingsOpen: player.displaySettingsOpen,
      setDisplaySettingsOpen: player.setDisplaySettingsOpen,
      saveModalOpen,
      setSaveModalOpen,
      youtubeMiniOpen: player.youtubeMiniOpen,
      setYoutubeMiniOpen: player.setYoutubeMiniOpen,
      folders,
      newFolderName,
      setNewFolderName,
      isSavedInAnyFolder: false, // Compute this
      onToggleSongInFolder: () => {},
      onCreateFolderFromSave: () => {},
      youtubeEmbedUrl: null,
      youtubeFallbackSearchQuery: currentSong.title + " " + currentSong.artist,
      onYoutubeVideoResolved: () => {},
      onBack: () => router.back(),
      onOpenVideo: () => player.setYoutubeMiniOpen(true),
      onOpenArtistSongs: () => router.push(`/artist/${currentSong.artistSlug}`),
      onPrint: () => window.print(),
      onTapZone: () => {},
      onToggleZen: () => player.setZenMode(!player.zenMode),
      onOpenSongEditor: () => {},
      onShareArrangement: () => {},
      shareArrangementDisabled: false,
  };

  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <SongViewProvider value={value as any}>
       <SongView />
    </SongViewProvider>
  );
}
