"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { HomeView } from "@/components/home/home-view";
import { FolderView } from "@/components/folder/folder-view";
import { SongView } from "@/components/song/song-view";
import { ArtistView } from "@/components/artist/artist-view";
import { SetlistDetailViewScreen } from "@/components/setlist/setlist-detail-view";
import { useMetronome } from "@/hooks/use-metronome";
import { useAutoScroll } from "@/hooks/use-auto-scroll";
import { useSongKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import {
  enrichStoredSongWithYoutube,
  loadSongFromRemote,
} from "@/hooks/use-song-loader";
import { useSession } from "@/hooks/use-session";
import { fetchChordsHtml } from "@/lib/fetch-proxy";
import { buildLocalSetlistDetail, localSetlistsToSummaries } from "@/lib/setlist-local";
import {
  cloudAddSetlistItem,
  cloudAddSongToFolder,
  cloudClearRecentes,
  cloudCreateFolder,
  cloudCreateSetlist,
  cloudCreateShare,
  cloudDeleteFolder,
  cloudDeleteSetlist,
  cloudFetchLibrary,
  cloudFetchSetlists,
  cloudGetSetlist,
  cloudRemoveSongFromFolder,
  cloudRemoveSetlistItem,
  cloudReorderSetlistItems,
  cloudSaveRecentes,
  cloudSync,
  cloudSyncDoneKey,
  DEFAULT_FOLDERS,
  loadFolders,
  loadLocalSetlists,
  loadRecentes,
  saveFolders,
  saveLocalSetlists,
  saveRecentes,
} from "@/lib/storage";
import {
  clearEditSnapshot,
  readAndClearEditResult,
  readEditSnapshot,
  writeEditSnapshot,
} from "@/lib/cifras-edit-bridge";
import { processHtmlAndExtract } from "@/lib/parser";
import {
  arrangementKey,
  currentSongKey,
} from "@/lib/stored-song-key";
import type {
  CurrentSongMeta,
  Folder,
  LocalSetlistStored,
  SearchResultArtist,
  SearchResultSong,
  Section,
  SetlistDetailView,
  SetlistSummary,
  StoredSong,
} from "@/lib/types";
import { SongViewProvider } from "@/components/song/song-context";
import { toast } from "sonner";

type CifraMetaFromStored = Partial<
  Pick<
    CurrentSongMeta,
    | "cifraWrittenKey"
    | "cifraSoundingKey"
    | "cifraCapo"
    | "arrangementId"
  >
>;

/** Preferências salvas ao abrir recente/pasta (tom/capo vêm do site se `capo`/`tone` ausentes). */
type SavedSongDisplayPrefs = Partial<
  Pick<
    StoredSong,
    | "tone"
    | "capo"
    | "simplified"
    | "showTabs"
    | "mirrored"
    | "fontSizeOffset"
    | "columns"
    | "spacingOffset"
  >
>;

function pickSavedDisplay(song: StoredSong): SavedSongDisplayPrefs {
  return {
    tone: song.tone,
    capo: song.capo,
    simplified: song.simplified,
    showTabs: song.showTabs,
    mirrored: song.mirrored,
    fontSizeOffset: song.fontSizeOffset,
    columns: song.columns,
    spacingOffset: song.spacingOffset,
  };
}

type ActiveView = "home" | "folder" | "song" | "artist" | "setlist";

/** Para onde o botão Voltar da cifra retorna (ex.: lista do artista). */
type SongReturnTarget = "home" | "folder" | "artist" | "setlist";

const CLOUD_SYNC_POLL_MS = 15_000;

function cloudSyncSignalKey(userId: string): string {
  return `cifrashub_cloud_signal_${userId}`;
}

/** Migra setlists do visitante para a nuvem; atualiza localStorage a cada setlist concluída. */
async function migrateGuestSetlistsProgressive(
  guest: LocalSetlistStored[],
  save: (next: LocalSetlistStored[]) => void,
) {
  let remaining = [...guest];
  for (const sl of guest) {
    try {
      const { setlist } = await cloudCreateSetlist(
        sl.title,
        sl.description ?? null,
      );
      for (const it of sl.items) {
        try {
          await cloudAddSetlistItem(
            setlist.id,
            it.arrangementId,
            it.notes ?? null,
          );
        } catch {
          /* arranjo não está na biblioteca */
        }
      }
      remaining = remaining.filter((x) => x.id !== sl.id);
      save(remaining);
    } catch {
      break;
    }
  }
}

export function CifrasApp() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editReturn = searchParams.get("edit");

  const { data: session, status } = useSession();
  const isCloud = status === "authenticated";
  const userId = session?.user?.id ?? null;
  const syncSignalKey = userId ? cloudSyncSignalKey(userId) : null;

  const [activeView, setActiveView] = useState<ActiveView>("home");
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [activeArtist, setActiveArtist] = useState<SearchResultArtist | null>(
    null,
  );

  const [currentSong, setCurrentSong] = useState<CurrentSongMeta | null>(
    null,
  );
  const [songData, setSongData] = useState<Section[]>([]);
  const [tone, setToneState] = useState(0);
  const [capo, setCapoState] = useState(0);
  const [simplified, setSimplified] = useState(false);
  const [activeChord, setActiveChord] = useState<string | null>(null);
  const [showTabs, setShowTabs] = useState(true);
  const [mirrored, setMirrored] = useState(false);
  const [fontSizeOffset, setFontSizeOffsetState] = useState(0);
  const [columns, setColumnsState] = useState(1);
  const [spacingOffset, setSpacingOffsetState] = useState(0);

  const [zenMode, setZenMode] = useState(false);
  const [autoScroll, setAutoScroll] = useState(false);
  const [scrollSpeed, setScrollSpeedState] = useState(2);
  const [displaySettingsOpen, setDisplaySettingsOpen] = useState(false);

  const [metronomeActive, setMetronomeActive] = useState(false);
  const [bpm, setBpmState] = useState(100);
  useMetronome(metronomeActive && activeView === "song", bpm);

  const [youtubeMiniOpen, setYoutubeMiniOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  const [folders, setFolders] = useState<Folder[]>(DEFAULT_FOLDERS);
  const [recentes, setRecentes] = useState<StoredSong[]>([]);
  const [localSetlistsRaw, setLocalSetlistsRaw] = useState<LocalSetlistStored[]>([]);
  const [setlistSummaries, setSetlistSummaries] = useState<SetlistSummary[]>([]);
  const [setlistDetail, setSetlistDetail] = useState<SetlistDetailView | null>(
    null,
  );
  const [shareBusy, setShareBusy] = useState(false);
  /** True após a biblioteca ter sido carregada (cloud ou local). Controla o skeleton da home. */
  const [libraryLoaded, setLibraryLoaded] = useState(false);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  const [folderSearchQuery, setFolderSearchQuery] = useState("");
  /** Chave `artistSlug-slug` da música sendo adicionada à pasta (spinner só nela). */
  const [folderAddPendingKey, setFolderAddPendingKey] = useState<string | null>(
    null,
  );
  const [folderError, setFolderError] = useState<string | null>(null);

  const loadSongAbortRef = useRef<AbortController | null>(null);
  const [songReturnTarget, setSongReturnTarget] =
    useState<SongReturnTarget>("home");

  const buildCurrentStoredSong = useCallback((): StoredSong | null => {
    if (!currentSong) return null;
    return {
      ...currentSong,
      songData,
      tone,
      capo,
      simplified,
      showTabs,
      mirrored,
      fontSizeOffset,
      columns,
      spacingOffset,
    };
  }, [
    currentSong,
    songData,
    tone,
    capo,
    simplified,
    showTabs,
    mirrored,
    fontSizeOffset,
    columns,
    spacingOffset,
  ]);

  const applyCloudLibrarySnapshot = useCallback(
    (payload: { folders: Folder[]; recentes: StoredSong[] }) => {
      setFolders(
        payload.folders.length > 0 ? payload.folders : DEFAULT_FOLDERS,
      );
      setRecentes(payload.recentes);
    },
    [],
  );

  const notifyCloudMutation = useCallback(() => {
    if (!syncSignalKey || typeof window === "undefined") return;
    try {
      localStorage.setItem(syncSignalKey, `${Date.now()}`);
    } catch {
      /* noop */
    }
  }, [syncSignalKey]);

  const refreshCloudState = useCallback(
    async (options?: { includeActiveSetlist?: boolean }) => {
      if (!isCloud) return;

      const [libraryResult, setlistsResult] = await Promise.allSettled([
        cloudFetchLibrary(),
        cloudFetchSetlists(),
      ]);

      if (libraryResult.status === "fulfilled") {
        applyCloudLibrarySnapshot(libraryResult.value);
      }

      let refreshedSetlists: SetlistSummary[] | null = null;
      if (setlistsResult.status === "fulfilled") {
        refreshedSetlists = setlistsResult.value.setlists;
        setSetlistSummaries(refreshedSetlists);
      }

      if (
        !options?.includeActiveSetlist ||
        activeView !== "setlist" ||
        !setlistDetail?.id
      ) {
        return;
      }

      if (
        refreshedSetlists &&
        !refreshedSetlists.some((s) => s.id === setlistDetail.id)
      ) {
        setSetlistDetail(null);
        return;
      }

      try {
        const detail = await cloudGetSetlist(setlistDetail.id);
        setSetlistDetail(detail);
      } catch {
        /* noop */
      }
    },
    [
      isCloud,
      applyCloudLibrarySnapshot,
      activeView,
      setlistDetail?.id,
    ],
  );

  /** Carrega localStorage (visitante) ou nuvem / sync na primeira vez (logado). */
  useEffect(() => {
    if (status === "loading") return;

    if (status === "unauthenticated") {
      const f = loadFolders();
      const r = loadRecentes();
      const sl = loadLocalSetlists();
      if (f !== null) setFolders(f.length > 0 ? f : DEFAULT_FOLDERS);
      if (r !== null) setRecentes(r);
      if (sl !== null) {
        setLocalSetlistsRaw(sl);
        setSetlistSummaries(localSetlistsToSummaries(sl));
      }
      setLibraryLoaded(true);
      return;
    }

    if (!userId) return;

    let cancelled = false;
    void (async () => {
      const key = cloudSyncDoneKey(userId);
      const alreadyDone =
        typeof window !== "undefined" && localStorage.getItem(key) === "1";

      try {
        if (!alreadyDone) {
          const localF = loadFolders();
          const localR = loadRecentes();
          const foldersPayload =
            localF && localF.length > 0 ? localF : DEFAULT_FOLDERS;
          const merged = await cloudSync({
            folders: foldersPayload,
            recentes: localR ?? [],
          });
          if (cancelled) return;
          applyCloudLibrarySnapshot(merged);
          const guestSetlists = loadLocalSetlists();
          if (guestSetlists?.length) {
            await migrateGuestSetlistsProgressive(guestSetlists, (next) => {
              saveLocalSetlists(next);
            });
          }
          localStorage.setItem(key, "1");
          try {
            const sl = await cloudFetchSetlists();
            if (!cancelled) setSetlistSummaries(sl.setlists);
          } catch {
            if (!cancelled) setSetlistSummaries([]);
          }
        } else {
          const lib = await cloudFetchLibrary();
          if (cancelled) return;
          applyCloudLibrarySnapshot(lib);
          const guestRetry = loadLocalSetlists();
          if (guestRetry?.length) {
            await migrateGuestSetlistsProgressive(guestRetry, saveLocalSetlists);
          }
          try {
            const sl = await cloudFetchSetlists();
            if (!cancelled) setSetlistSummaries(sl.setlists);
          } catch {
            if (!cancelled) setSetlistSummaries([]);
          }
        }
      } catch {
        try {
          const lib = await cloudFetchLibrary();
          if (cancelled) return;
          applyCloudLibrarySnapshot(lib);
          const guestRetry = loadLocalSetlists();
          if (guestRetry?.length) {
            await migrateGuestSetlistsProgressive(guestRetry, saveLocalSetlists);
          }
          try {
            const sl = await cloudFetchSetlists();
            if (!cancelled) setSetlistSummaries(sl.setlists);
          } catch {
            if (!cancelled) setSetlistSummaries([]);
          }
        } catch {
          const f = loadFolders();
          const r = loadRecentes();
          if (cancelled) return;
          if (f !== null) setFolders(f.length > 0 ? f : DEFAULT_FOLDERS);
          if (r !== null) setRecentes(r);
        }
      }
      if (!cancelled) setLibraryLoaded(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [status, userId, applyCloudLibrarySnapshot]);

  useEffect(() => {
    if (!isCloud || !userId || !syncSignalKey) return;

    const runRefresh = () => {
      void refreshCloudState({ includeActiveSetlist: true });
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        runRefresh();
      }
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === syncSignalKey && event.newValue) {
        runRefresh();
      }
    };

    const intervalId = window.setInterval(runRefresh, CLOUD_SYNC_POLL_MS);

    window.addEventListener("focus", runRefresh);
    window.addEventListener("online", runRefresh);
    window.addEventListener("storage", handleStorage);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", runRefresh);
      window.removeEventListener("online", runRefresh);
      window.removeEventListener("storage", handleStorage);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [isCloud, userId, syncSignalKey, refreshCloudState]);

  useEffect(() => {
    if (zenMode && activeView === "song") {
      document.documentElement.classList.add("zen-scroll-hide");
      return () =>
        document.documentElement.classList.remove("zen-scroll-hide");
    }
    document.documentElement.classList.remove("zen-scroll-hide");
  }, [zenMode, activeView]);

  const addToRecentes = useCallback(
    (songObj: StoredSong) => {
      setRecentes((prev) => {
        const k = arrangementKey(songObj);
        const next = [
          songObj,
          ...prev.filter((s) => arrangementKey(s) !== k),
        ].slice(0, 15);
        if (isCloud) {
          void cloudSaveRecentes(next)
            .then(({ recentes: synced }) => {
              setRecentes(synced);
              notifyCloudMutation();
            })
            .catch(() => saveRecentes(next));
        } else {
          saveRecentes(next);
        }
        return next;
      });
    },
    [isCloud, notifyCloudMutation],
  );

  const removeFromRecentes = useCallback(
    (song: StoredSong) => {
      const ak = arrangementKey(song);
      setRecentes((prev) => {
        const next = prev.filter((s) => arrangementKey(s) !== ak);
        if (isCloud) {
          void cloudSaveRecentes(next)
            .then(({ recentes: synced }) => {
              setRecentes(synced);
              notifyCloudMutation();
            })
            .catch(() => saveRecentes(next));
        } else {
          saveRecentes(next);
        }
        return next;
      });
    },
    [isCloud, notifyCloudMutation],
  );

  const clearAllRecentes = useCallback(() => {
    setRecentes([]);
    if (isCloud) {
      void cloudClearRecentes()
        .then(({ recentes: synced }) => {
          setRecentes(synced);
          notifyCloudMutation();
        })
        .catch(() => saveRecentes([]));
    } else {
      saveRecentes([]);
    }
  }, [isCloud, notifyCloudMutation]);

  useAutoScroll(autoScroll && activeView === "song", scrollSpeed);

  const toggleZenMode = useCallback(() => {
    setZenMode((prev) => !prev);
  }, []);

  useEffect(() => {
    if (zenMode) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  }, [zenMode]);

  useSongKeyboardShortcuts({
    enabled: activeView === "song",
    onToggleAutoScroll: () => setAutoScroll((p) => !p),
    onToggleZen: () => toggleZenMode(),
    onScrollDown: () =>
      window.scrollBy({
        top: window.innerHeight * 0.4,
        behavior: "smooth",
      }),
    onScrollUp: () =>
      window.scrollBy({
        top: -window.innerHeight * 0.4,
        behavior: "smooth",
      }),
  });

  const handleTapZone = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const el = e.target as HTMLElement;
      if (el.closest("button") || el.closest(".font-mono") || !zenMode)
        return;
      const h = window.innerHeight;
      if (e.clientY > h * 0.6) {
        window.scrollBy({ top: h * 0.4, behavior: "smooth" });
      } else if (e.clientY < h * 0.4) {
        window.scrollBy({ top: -h * 0.4, behavior: "smooth" });
      }
    },
    [zenMode],
  );

  const handleAddSongToFolder = useCallback(
    async (res: SearchResultSong) => {
      if (!activeFolderId) return;
      const songId = `${res.artistSlug}-${res.slug}`;
      setFolderAddPendingKey(songId);
      setFolderError(null);
      try {
        const html = await fetchChordsHtml(res.artistSlug, res.slug);
        let newSong = processHtmlAndExtract(
          html,
          songId,
          res.title,
          res.artistName,
          res.artistSlug,
          res.slug,
        );
        newSong = await enrichStoredSongWithYoutube(newSong);

        if (isCloud) {
          const { folders: next } = await cloudAddSongToFolder(
            activeFolderId,
            newSong,
          );
          setFolders(next);
          notifyCloudMutation();
        } else {
          setFolders((prev) => {
            const updated = prev.map((f) => {
              if (
                f.id === activeFolderId &&
                !f.songs.some((s) => arrangementKey(s) === arrangementKey(newSong))
              ) {
                return { ...f, songs: [newSong, ...f.songs] };
              }
              return f;
            });
            saveFolders(updated);
            return updated;
          });
        }
        setFolderSearchQuery("");
      } catch (err) {
        setFolderError(
          err instanceof Error
            ? err.message
            : "Problema de rede ao importar cifra.",
        );
      } finally {
        setFolderAddPendingKey(null);
      }
    },
    [activeFolderId, isCloud, notifyCloudMutation],
  );

  const handleOpenVideo = useCallback(() => {
    if (!currentSong) return;
    setYoutubeMiniOpen(true);
  }, [currentSong]);

  const handleYoutubeVideoResolved = useCallback((videoId: string) => {
    setCurrentSong((prev) =>
      prev ? { ...prev, youtubeId: videoId } : prev,
    );
  }, []);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const openArtistSongs = useCallback((artistName: string, artistSlug: string) => {
    setYoutubeMiniOpen(false);
    setActiveArtist({ type: "artist", artistName, artistSlug });
    setActiveView("artist");
  }, []);

  const handleToggleSongInFolder = useCallback(
    async (folderId: string) => {
      if (!currentSong) return;

      if (isCloud) {
        const folder = folders.find((f) => f.id === folderId);
        const ck = currentSongKey(currentSong);
        const exists =
          folder?.songs.some((s) => arrangementKey(s) === ck) ?? false;
        try {
          if (exists) {
            const { folders: next } = await cloudRemoveSongFromFolder(
              folderId,
              ck,
            );
            setFolders(next);
            notifyCloudMutation();
          } else {
            const built = buildCurrentStoredSong();
            const toSave: StoredSong = built ?? {
              ...currentSong,
              songData,
              tone,
              capo,
            };
            const { folders: next } = await cloudAddSongToFolder(
              folderId,
              toSave,
            );
            setFolders(next);
            notifyCloudMutation();
          }
        } catch {
          /* falha de rede: mantém estado */
        }
        return;
      }

      setFolders((prev) => {
        const updated = prev.map((f) => {
          if (f.id !== folderId) return f;
          const ck = currentSongKey(currentSong);
          const existsNow = f.songs.some((s) => arrangementKey(s) === ck);
          if (existsNow) {
            return {
              ...f,
              songs: f.songs.filter((s) => arrangementKey(s) !== ck),
            };
          }
          return {
            ...f,
            songs: [
              ...f.songs,
              buildCurrentStoredSong() ?? {
                ...currentSong,
                songData,
                tone,
                capo,
              },
            ],
          };
        });
        saveFolders(updated);
        return updated;
      });
    },
    [
      currentSong,
      songData,
      tone,
      capo,
      isCloud,
      folders,
      buildCurrentStoredSong,
      notifyCloudMutation,
    ],
  );

  const doCreateFolder = useCallback(
    async (resetCreating: boolean) => {
      if (!newFolderName.trim()) return;
      if (isCloud) {
        try {
          const { folders: next } = await cloudCreateFolder(newFolderName.trim());
          setFolders(next);
          notifyCloudMutation();
        } catch {
          /* noop */
        }
      } else {
        const newFolder: Folder = {
          id: Date.now().toString(),
          name: newFolderName.trim(),
          songs: [],
        };
        setFolders((prev) => {
          const next = [...prev, newFolder];
          saveFolders(next);
          return next;
        });
      }
      setNewFolderName("");
      if (resetCreating) setIsCreatingFolder(false);
    },
    [newFolderName, isCloud, notifyCloudMutation],
  );

  const handleCreateFolder = useCallback(
    (e: React.FormEvent) => { e.preventDefault(); doCreateFolder(true); },
    [doCreateFolder],
  );

  const handleCreateFolderFromSave = useCallback(
    (e: React.FormEvent) => { e.preventDefault(); doCreateFolder(false); },
    [doCreateFolder],
  );

  const handleDeleteFolder = useCallback(
    async (folderId: string) => {
      const meta = folders.find((f) => f.id === folderId);
      if (meta?.isDefault || folderId === "default") return;

      if (isCloud) {
        try {
          const { folders: next } = await cloudDeleteFolder(folderId);
          setFolders(next);
          notifyCloudMutation();
        } catch {
          /* noop */
        }
      } else {
        setFolders((prev) => {
          const next = prev.filter((f) => f.id !== folderId);
          saveFolders(next);
          return next;
        });
      }
      setActiveView("home");
    },
    [folders, isCloud, notifyCloudMutation],
  );

  const handleRemoveSongFromFolder = useCallback(
    async (song: StoredSong) => {
      if (!activeFolderId) return;
      const ak = arrangementKey(song);
      if (isCloud) {
        try {
          const { folders: next } = await cloudRemoveSongFromFolder(
            activeFolderId,
            ak,
          );
          setFolders(next);
          notifyCloudMutation();
        } catch {
          /* noop */
        }
        return;
      }
      setFolders((prev) => {
        const next = prev.map((f) =>
          f.id === activeFolderId
            ? { ...f, songs: f.songs.filter((s) => arrangementKey(s) !== ak) }
            : f,
        );
        saveFolders(next);
        return next;
      });
    },
    [activeFolderId, isCloud, notifyCloudMutation],
  );

  const persistGuestSetlists = useCallback((next: LocalSetlistStored[]) => {
    setLocalSetlistsRaw(next);
    saveLocalSetlists(next);
    setSetlistSummaries(localSetlistsToSummaries(next));
  }, []);

  const handleOpenSetlist = useCallback(
    async (id: string) => {
      if (isCloud) {
        try {
          const d = await cloudGetSetlist(id);
          setSetlistDetail(d);
          setActiveView("setlist");
        } catch {
          /* noop */
        }
        return;
      }
      const raw = localSetlistsRaw.find((s) => s.id === id);
      if (!raw) return;
      setSetlistDetail(buildLocalSetlistDetail(raw, folders, recentes));
      setActiveView("setlist");
    },
    [isCloud, localSetlistsRaw, folders, recentes],
  );

  const handleCloseSetlist = useCallback(() => {
    setSetlistDetail(null);
    setActiveView("home");
  }, []);

  const handleCreateSetlist = useCallback(
    async (title: string) => {
      if (isCloud) {
        try {
          const { setlists } = await cloudCreateSetlist(title);
          setSetlistSummaries(setlists);
          notifyCloudMutation();
        } catch {
          /* noop */
        }
        return;
      }
      const id =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}`;
      const entry: LocalSetlistStored = { id, title, items: [] };
      persistGuestSetlists([...localSetlistsRaw, entry]);
    },
    [isCloud, localSetlistsRaw, persistGuestSetlists, notifyCloudMutation],
  );

  const handleDeleteSetlist = useCallback(
    async (id: string) => {
      if (isCloud) {
        try {
          const { setlists } = await cloudDeleteSetlist(id);
          setSetlistSummaries(setlists);
          notifyCloudMutation();
        } catch {
          /* noop */
        }
        return;
      }
      persistGuestSetlists(localSetlistsRaw.filter((s) => s.id !== id));
    },
    [isCloud, localSetlistsRaw, persistGuestSetlists, notifyCloudMutation],
  );

  const handleAddSetlistItem = useCallback(
    async (arrangementId: string) => {
      if (!setlistDetail) return;
      if (isCloud) {
        try {
          const d = await cloudAddSetlistItem(setlistDetail.id, arrangementId);
          setSetlistDetail(d);
          notifyCloudMutation();
          void cloudFetchSetlists()
            .then(({ setlists }) => setSetlistSummaries(setlists))
            .catch(() => {});
        } catch {
          /* noop */
        }
        return;
      }
      const raw = localSetlistsRaw.find((s) => s.id === setlistDetail.id);
      if (!raw) return;
      const itemId =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`;
      const nextRaw = localSetlistsRaw.map((s) =>
        s.id === raw.id
          ? {
              ...s,
              items: [...s.items, { itemId, arrangementId, notes: null }],
            }
          : s,
      );
      persistGuestSetlists(nextRaw);
      const updated = nextRaw.find((s) => s.id === raw.id)!;
      setSetlistDetail(buildLocalSetlistDetail(updated, folders, recentes));
    },
    [
      setlistDetail,
      isCloud,
      localSetlistsRaw,
      folders,
      recentes,
      persistGuestSetlists,
      notifyCloudMutation,
    ],
  );

  const handleRemoveSetlistItem = useCallback(
    async (itemId: string) => {
      if (!setlistDetail) return;
      if (isCloud) {
        try {
          const d = await cloudRemoveSetlistItem(setlistDetail.id, itemId);
          setSetlistDetail(d);
          notifyCloudMutation();
          void cloudFetchSetlists()
            .then(({ setlists }) => setSetlistSummaries(setlists))
            .catch(() => {});
        } catch {
          /* noop */
        }
        return;
      }
      const raw = localSetlistsRaw.find((s) => s.id === setlistDetail.id);
      if (!raw) return;
      const nextRaw = localSetlistsRaw.map((s) =>
        s.id === raw.id
          ? { ...s, items: s.items.filter((it) => it.itemId !== itemId) }
          : s,
      );
      persistGuestSetlists(nextRaw);
      const updated = nextRaw.find((s) => s.id === raw.id)!;
      setSetlistDetail(buildLocalSetlistDetail(updated, folders, recentes));
    },
    [
      setlistDetail,
      isCloud,
      localSetlistsRaw,
      folders,
      recentes,
      persistGuestSetlists,
      notifyCloudMutation,
    ],
  );

  const handleMoveSetlistItem = useCallback(
    async (itemId: string, direction: -1 | 1) => {
      if (!setlistDetail) return;
      const sorted = [...setlistDetail.items].sort(
        (a, b) => a.position - b.position,
      );
      const idx = sorted.findIndex((i) => i.itemId === itemId);
      const nidx = idx + direction;
      if (idx < 0 || nidx < 0 || nidx >= sorted.length) return;
      const swapped = [...sorted];
      [swapped[idx], swapped[nidx]] = [swapped[nidx]!, swapped[idx]!];

      if (isCloud) {
        try {
          const d = await cloudReorderSetlistItems(
            setlistDetail.id,
            swapped.map((i) => i.itemId),
          );
          setSetlistDetail(d);
          notifyCloudMutation();
          void cloudFetchSetlists()
            .then(({ setlists }) => setSetlistSummaries(setlists))
            .catch(() => {});
        } catch {
          /* noop */
        }
        return;
      }
      const raw = localSetlistsRaw.find((s) => s.id === setlistDetail.id);
      if (!raw) return;
      const orderIds = swapped.map((i) => i.itemId);
      const itemById = new Map(raw.items.map((it) => [it.itemId, it]));
      const newItems = orderIds
        .map((id) => itemById.get(id))
        .filter((x): x is NonNullable<typeof x> => x != null);
      const nextRaw = localSetlistsRaw.map((s) =>
        s.id === raw.id ? { ...s, items: newItems } : s,
      );
      persistGuestSetlists(nextRaw);
      const updated = nextRaw.find((s) => s.id === raw.id)!;
      setSetlistDetail(buildLocalSetlistDetail(updated, folders, recentes));
    },
    [
      setlistDetail,
      isCloud,
      localSetlistsRaw,
      folders,
      recentes,
      persistGuestSetlists,
      notifyCloudMutation,
    ],
  );

  const handleShareSetlist = useCallback(async () => {
    if (!setlistDetail || !isCloud) return;
    setShareBusy(true);
    try {
      const { token } = await cloudCreateShare({
        resourceType: "setlist",
        setlistId: setlistDetail.id,
      });
      const url = `${window.location.origin}/s/${token}`;
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado para a área de transferência.");
    } catch {
      toast.error("Não foi possível criar o link.");
    } finally {
      setShareBusy(false);
    }
  }, [setlistDetail, isCloud]);

  const handleShareArrangement = useCallback(async () => {
    if (!currentSong || !isCloud) return;
    setShareBusy(true);
    try {
      const { token } = await cloudCreateShare({
        resourceType: "arrangement",
        arrangementId: currentSongKey(currentSong),
      });
      const url = `${window.location.origin}/s/${token}`;
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado para a área de transferência.");
    } catch {
      toast.error("Não foi possível criar o link.");
    } finally {
      setShareBusy(false);
    }
  }, [currentSong, isCloud]);

  useEffect(() => {
    if (activeView !== "setlist" || !setlistDetail || isCloud) return;
    const raw = localSetlistsRaw.find((s) => s.id === setlistDetail.id);
    if (raw) {
      setSetlistDetail(buildLocalSetlistDetail(raw, folders, recentes));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    folders,
    recentes,
    activeView,
    isCloud,
    localSetlistsRaw,
    setlistDetail?.id,
  ]);

  useEffect(() => {
    if (activeView === "setlist" && !setlistDetail) {
      setActiveView("home");
    }
  }, [activeView, setlistDetail]);

  const isSavedInAnyFolder = useMemo(
    () =>
      currentSong
        ? folders.some((f) =>
            f.songs.some((s) => arrangementKey(s) === currentSongKey(currentSong)),
          )
        : false,
    [currentSong, folders],
  );

  const effectiveTransposition = useMemo(() => tone - capo, [tone, capo]);

  const activeFolderData = useMemo(
    () => activeView === "folder" ? folders.find((f) => f.id === activeFolderId) : undefined,
    [activeView, folders, activeFolderId],
  );

  useEffect(() => {
    if (activeView === "folder" && !activeFolderData) {
      setActiveView("home");
    }
  }, [activeView, activeFolderData]);

  /** Persiste tom, capo e demais ajustes na entrada local da música (recentes + pastas). */
  useEffect(() => {
    if (activeView !== "song" || !currentSong || songData.length === 0) return;

    const ck = currentSongKey(currentSong);
    const t = window.setTimeout(() => {
      const patchSong = (s: StoredSong): StoredSong => {
        if (arrangementKey(s) !== ck) return s;
        return {
          ...s,
          youtubeId: currentSong.youtubeId ?? s.youtubeId,
          songData,
          tone,
          capo,
          simplified,
          showTabs,
          mirrored,
          fontSizeOffset,
          columns,
          spacingOffset,
          arrangementId: currentSong.arrangementId ?? s.arrangementId,
        };
      };

      setRecentes((prev) => {
        const idx = prev.findIndex((s) => arrangementKey(s) === ck);
        if (idx === -1) return prev;
        const next = [...prev];
        next[idx] = patchSong(next[idx]!);
        if (isCloud) {
          void cloudSaveRecentes(next)
            .then(({ recentes: synced }) => {
              setRecentes(synced);
              notifyCloudMutation();
            })
            .catch(() => saveRecentes(next));
        } else {
          saveRecentes(next);
        }
        return next;
      });

      setFolders((prev) => {
        let touched = false;
        const next = prev.map((folder) => {
          const si = folder.songs.findIndex((s) => arrangementKey(s) === ck);
          if (si === -1) return folder;
          touched = true;
          const songs = [...folder.songs];
          songs[si] = patchSong(songs[si]!);
          return { ...folder, songs };
        });
        if (!touched) return prev;

        if (!isCloud) {
          saveFolders(next);
          return next;
        }

        void (async () => {
          let merged = next;
          for (const folder of merged) {
            const sng = folder.songs.find((s) => arrangementKey(s) === ck);
            if (!sng) continue;
            try {
              const { folders: upd } = await cloudAddSongToFolder(
                folder.id,
                sng,
              );
              merged = upd;
            } catch {
              saveFolders(merged);
            }
          }
          setFolders(merged);
          saveFolders(merged);
          notifyCloudMutation();
        })();

        return next;
      });
    }, 650);

    return () => window.clearTimeout(t);
  }, [
    activeView,
    currentSong,
    songData,
    tone,
    capo,
    simplified,
    showTabs,
    mirrored,
    fontSizeOffset,
    columns,
    spacingOffset,
    isCloud,
    notifyCloudMutation,
  ]);

  const loadSong = useCallback(
    async (
      songId: string,
      title: string,
      artist: string,
      artistSlug: string,
      slug: string,
      offlineData: Section[] | null = null,
      youtubeId?: string,
      returnTo: SongReturnTarget = "home",
      cifraFromStored?: CifraMetaFromStored,
      savedDisplayPrefs?: SavedSongDisplayPrefs,
    ) => {
      loadSongAbortRef.current?.abort();
      loadSongAbortRef.current = null;

      setSongReturnTarget(returnTo);
      setSearchQuery("");
      setParseError(null);
      setIsParsing(false);
      setCurrentSong({
        id: songId,
        title,
        artist,
        artistSlug,
        slug,
        youtubeId,
        ...cifraFromStored,
      });

      const cifraCapoHint = cifraFromStored?.cifraCapo;
      setToneState(savedDisplayPrefs?.tone ?? 0);
      setCapoState(
        savedDisplayPrefs?.capo !== undefined
          ? savedDisplayPrefs.capo
          : (cifraCapoHint ?? 0),
      );
      setSimplified(savedDisplayPrefs?.simplified ?? false);
      setShowTabs(savedDisplayPrefs?.showTabs ?? true);
      setMirrored(savedDisplayPrefs?.mirrored ?? false);
      setFontSizeOffsetState(savedDisplayPrefs?.fontSizeOffset ?? 0);
      setColumnsState(
        Math.max(1, Math.min(6, savedDisplayPrefs?.columns ?? 1)),
      );
      setSpacingOffsetState(savedDisplayPrefs?.spacingOffset ?? 0);

      setActiveView("song");
      setZenMode(false);
      setAutoScroll(false);
      setMetronomeActive(false);
      // Mini YouTube só ao pedido (botão no header), evita loading duplo ao abrir a cifra.
      setYoutubeMiniOpen(false);

      if (offlineData) {
        setSongData(offlineData);
        addToRecentes({
          id: songId,
          title,
          artist,
          artistSlug,
          slug,
          youtubeId,
          songData: offlineData,
          ...cifraFromStored,
          ...savedDisplayPrefs,
        });
        return;
      }

      const controller = new AbortController();
      loadSongAbortRef.current = controller;

      setIsParsing(true);
      setSongData([]);

      try {
        const extracted = await loadSongFromRemote(
          {
            title,
            artistName: artist,
            artistSlug,
            slug,
          },
          controller.signal,
        );
        if (controller.signal.aborted) return;
        setCurrentSong((prev) =>
          prev
            ? {
                ...prev,
                youtubeId: extracted.youtubeId,
                cifraWrittenKey: extracted.cifraWrittenKey,
                cifraSoundingKey: extracted.cifraSoundingKey,
                cifraCapo: extracted.cifraCapo,
                arrangementId:
                  extracted.arrangementId ?? prev.arrangementId,
              }
            : prev,
        );
        setSongData(extracted.songData);
        if (savedDisplayPrefs?.capo === undefined) {
          setCapoState(extracted.cifraCapo ?? 0);
        }
        if (savedDisplayPrefs?.tone === undefined) {
          setToneState(0);
        }
        addToRecentes(extracted);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (!controller.signal.aborted) {
          setParseError(
            err instanceof Error ? err.message : "Erro de comunicação.",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsParsing(false);
        }
      }
    },
    [addToRecentes],
  );

  const loadStoredSong = useCallback(
    (
      song: StoredSong,
      returnTo: "home" | "folder" | "artist" | "setlist" = "home",
    ) =>
      loadSong(
        song.id,
        song.title,
        song.artist,
        song.artistSlug,
        song.slug,
        song.songData,
        song.youtubeId,
        returnTo,
        {
          cifraWrittenKey: song.cifraWrittenKey,
          cifraSoundingKey: song.cifraSoundingKey,
          cifraCapo: song.cifraCapo,
          arrangementId: song.arrangementId,
        },
        pickSavedDisplay(song),
      ),
    [loadSong],
  );

  const handleOpenSongEditor = useCallback(() => {
    if (!currentSong) return;
    writeEditSnapshot({
      v: 1,
      currentSong,
      songData,
      songReturnTarget,
      activeFolderId,
      setlistDetail: songReturnTarget === "setlist" ? setlistDetail : null,
      activeArtist: songReturnTarget === "artist" ? activeArtist : null,
      display: {
        tone,
        capo,
        simplified,
        showTabs,
        mirrored,
        fontSizeOffset,
        columns,
        spacingOffset,
      },
    });
    router.push("/editar");
  }, [
    currentSong,
    songData,
    songReturnTarget,
    activeFolderId,
    setlistDetail,
    activeArtist,
    tone,
    capo,
    simplified,
    showTabs,
    mirrored,
    fontSizeOffset,
    columns,
    spacingOffset,
    router,
  ]);

  useLayoutEffect(() => {
    if (editReturn !== "done" && editReturn !== "cancel") return;

    const snap = readEditSnapshot();
    if (!snap) {
      router.replace("/");
      return;
    }

    const applyEditorReturnContext = () => {
      setCurrentSong(snap.currentSong);
      setSongReturnTarget(snap.songReturnTarget);
      setActiveFolderId(snap.activeFolderId);
      setSetlistDetail(snap.setlistDetail);
      setActiveArtist(snap.activeArtist);
      const d = snap.display;
      setToneState(d.tone);
      setCapoState(d.capo);
      setSimplified(d.simplified);
      setShowTabs(d.showTabs);
      setMirrored(d.mirrored);
      setFontSizeOffsetState(d.fontSizeOffset);
      setColumnsState(d.columns);
      setSpacingOffsetState(d.spacingOffset);
      setActiveView("song");
    };

    if (editReturn === "done") {
      const result = readAndClearEditResult();
      if (!result) {
        clearEditSnapshot();
        router.replace("/");
        return;
      }
      setSongData(result);
      applyEditorReturnContext();

      // Salvar a edição nas pastas e recentes se a cifra já estiver lá
      const baseStoredSong: StoredSong = {
        ...snap.currentSong,
        songData: result,
        tone: snap.display.tone,
        capo: snap.display.capo,
        simplified: snap.display.simplified,
        showTabs: snap.display.showTabs,
        mirrored: snap.display.mirrored,
        fontSizeOffset: snap.display.fontSizeOffset,
        columns: snap.display.columns,
        spacingOffset: snap.display.spacingOffset,
      };

      const ck = currentSongKey(snap.currentSong);

      setRecentes((prev) => {
        const next = prev.map((s) =>
          currentSongKey(s) === ck ? { ...s, songData: result } : s,
        );
        if (JSON.stringify(prev) !== JSON.stringify(next)) {
          if (status === "authenticated") {
            void cloudSaveRecentes(next)
              .then(({ recentes: synced }) => {
                setRecentes(synced);
                notifyCloudMutation();
              })
              .catch(() => saveRecentes(next));
          } else {
            saveRecentes(next);
          }
        }
        return next;
      });

      setFolders((prev) => {
        const toUpdateFolderIds: string[] = [];
        const next = prev.map((f) => {
          let hasChanges = false;
          const newSongs = f.songs.map((s) => {
            if (currentSongKey(s) === ck) {
              hasChanges = true;
              return { ...s, songData: result };
            }
            return s;
          });
          if (hasChanges) toUpdateFolderIds.push(f.id);
          return hasChanges ? { ...f, songs: newSongs } : f;
        });

        if (toUpdateFolderIds.length > 0) {
          saveFolders(next);
          if (status === "authenticated") {
            toUpdateFolderIds.forEach((fid) => {
              void cloudAddSongToFolder(fid, baseStoredSong)
                .then(() => notifyCloudMutation())
                .catch(() => {});
            });
          }
        }
        return next;
      });
    } else {
      setSongData(snap.songData);
      applyEditorReturnContext();
    }
    clearEditSnapshot();
    router.replace("/");
  }, [editReturn, router, status, notifyCloudMutation]);

  const homeProps = {
    searchQuery,
    onSearchQueryChange: setSearchQuery,
    onSelectSearchResult: (res: SearchResultSong) =>
      loadSong(
        `${res.artistSlug}-${res.slug}`,
        res.title,
        res.artistName,
        res.artistSlug,
        res.slug,
        null,
      ),
    onSelectArtistResult: (artist: SearchResultArtist) => {
      setSearchQuery("");
      openArtistSongs(artist.artistName, artist.artistSlug);
    },
    folders,
    isCreatingFolder,
    newFolderName,
    onNewFolderNameChange: setNewFolderName,
    onStartCreateFolder: () => setIsCreatingFolder(true),
    onCancelCreateFolder: () => setIsCreatingFolder(false),
    onSubmitCreateFolder: handleCreateFolder,
    onOpenFolder: (id: string) => {
      setActiveFolderId(id);
      setActiveView("folder");
    },
    recentes,
    onSelectRecent: (song: StoredSong) => loadStoredSong(song, "home"),
    onRemoveRecent: removeFromRecentes,
    onClearRecentes: clearAllRecentes,
    setlists: setlistSummaries,
    onCreateSetlist: handleCreateSetlist,
    onOpenSetlist: handleOpenSetlist,
    onDeleteSetlist: handleDeleteSetlist,
    isLoadingLibrary: !libraryLoaded && status === "authenticated",
  };

  if (activeView === "setlist" && setlistDetail) {
    return (
      <SetlistDetailViewScreen
        detail={setlistDetail}
        folders={folders}
        recentes={recentes}
        onBack={handleCloseSetlist}
        onOpenSong={(song) => loadStoredSong(song, "setlist")}
        onAddItem={handleAddSetlistItem}
        onRemoveItem={handleRemoveSetlistItem}
        onMoveItem={handleMoveSetlistItem}
        onShare={isCloud ? handleShareSetlist : undefined}
        shareBusy={shareBusy}
      />
    );
  }

  if (activeView === "home") {
    return <HomeView {...homeProps} />;
  }

  if (activeView === "folder" && activeFolderData) {
    return (
      <FolderView
        folder={activeFolderData}
        folderSearchQuery={folderSearchQuery}
        onFolderSearchQueryChange={setFolderSearchQuery}
        folderAddPendingKey={folderAddPendingKey}
        folderError={folderError}
        onDismissFolderError={() => setFolderError(null)}
        onAddSongToFolder={handleAddSongToFolder}
        onBack={() => {
          setActiveView("home");
          setFolderError(null);
        }}
        onDeleteFolder={handleDeleteFolder}
        onOpenSong={(song) => loadStoredSong(song, "folder")}
        onRemoveSongFromFolder={handleRemoveSongFromFolder}
      />
    );
  }

  if (activeView === "song" && currentSong) {
    const youtubeEmbedUrl = currentSong.youtubeId
      ? `https://www.youtube.com/embed/${encodeURIComponent(
          currentSong.youtubeId,
        )}?rel=0&modestbranding=1`
      : null;

    return (
      <SongViewProvider
        value={{
          // Dados da música
          currentSong,
          songData,
          isParsing,
          parseError,
          // Configurações de exibição
          tone,
          setTone: setToneState,
          capo,
          setCapo: setCapoState,
          simplified,
          setSimplified,
          showTabs,
          setShowTabs,
          mirrored,
          setMirrored,
          fontSizeOffset,
          setFontSizeOffset: setFontSizeOffsetState,
          columns,
          setColumns: setColumnsState,
          spacingOffset,
          setSpacingOffset: setSpacingOffsetState,
          effectiveTransposition,
          // Playback
          zenMode,
          autoScroll,
          setAutoScroll,
          scrollSpeed,
          setScrollSpeed: setScrollSpeedState,
          metronomeActive,
          setMetronomeActive,
          bpm,
          setBpm: setBpmState,
          // UI state
          activeChord,
          setActiveChord,
          displaySettingsOpen,
          setDisplaySettingsOpen,
          saveModalOpen,
          setSaveModalOpen,
          youtubeMiniOpen,
          setYoutubeMiniOpen,
          // Pastas & salvar
          folders,
          newFolderName,
          setNewFolderName,
          isSavedInAnyFolder,
          onToggleSongInFolder: handleToggleSongInFolder,
          onCreateFolderFromSave: handleCreateFolderFromSave,
          // YouTube
          youtubeEmbedUrl,
          youtubeFallbackSearchQuery: `${currentSong.artist} ${currentSong.title}`,
          onYoutubeVideoResolved: handleYoutubeVideoResolved,
          // Ações e navegação
          onOpenSongEditor: handleOpenSongEditor,
          onShareArrangement: isCloud ? handleShareArrangement : undefined,
          shareArrangementDisabled: shareBusy,
          onToggleZen: toggleZenMode,
          onBack: () => {
            loadSongAbortRef.current?.abort();
            loadSongAbortRef.current = null;
            if (songReturnTarget === "artist") {
              setActiveView("artist");
            } else if (songReturnTarget === "folder") {
              setActiveView("folder");
            } else if (songReturnTarget === "setlist") {
              setActiveView("setlist");
            } else {
              setActiveView("home");
            }
            setAutoScroll(false);
            setYoutubeMiniOpen(false);
          },
          onOpenVideo: handleOpenVideo,
          onOpenArtistSongs: () =>
            openArtistSongs(currentSong.artist, currentSong.artistSlug),
          onPrint: handlePrint,
          onTapZone: handleTapZone,
        }}
      >
        <SongView />
      </SongViewProvider>
    );
  }

  if (activeView === "artist" && activeArtist) {
    return (
      <ArtistView
        artistName={activeArtist.artistName}
        artistSlug={activeArtist.artistSlug}
        onBack={() => setActiveView("home")}
        onOpenSong={(res) =>
          loadSong(
            `${res.artistSlug}-${res.slug}`,
            res.title,
            res.artistName,
            res.artistSlug,
            res.slug,
            null,
            undefined,
            "artist",
          )
        }
      />
    );
  }

  return <HomeView {...homeProps} />;
}
