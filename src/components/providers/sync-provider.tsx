"use client";

import { useCallback, useEffect } from "react";
import { useSession } from "@/hooks/use-session";
import {
  cloudFetchLibrary,
  cloudFetchSetlists,
  cloudSync,
  cloudSyncDoneKey,
  DEFAULT_FOLDERS,
  loadFolders,
  loadLocalSetlists,
  loadRecentes,
  saveLocalSetlists,
  cloudCreateSetlist,
  cloudAddSetlistItem,
} from "@/lib/storage";
import { useLibraryStore } from "@/store/use-library-store";
import type { LocalSetlistStored, Folder, StoredSong } from "@/lib/types";
import { localSetlistsToSummaries } from "@/lib/setlist-local";
import { cloudSyncSignalKey } from "@/lib/sync-signal-key";

const CLOUD_SYNC_POLL_MS = 15_000;

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

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const isCloud = status === "authenticated";
  const userId = session?.user?.id ?? null;
  const syncSignalKey = userId ? cloudSyncSignalKey(userId) : null;

  const setFolders = useLibraryStore((s) => s.setFolders);
  const setRecentes = useLibraryStore((s) => s.setRecentes);
  const setLocalSetlistsRaw = useLibraryStore((s) => s.setLocalSetlistsRaw);
  const setSetlistSummaries = useLibraryStore((s) => s.setSetlistSummaries);
  const setLibraryLoaded = useLibraryStore((s) => s.setLibraryLoaded);

  const applyCloudLibrarySnapshot = useCallback(
    (payload: { folders?: Folder[]; recentes?: StoredSong[] }) => {
      setFolders(
        payload.folders && payload.folders.length > 0 ? payload.folders : DEFAULT_FOLDERS,
      );
      setRecentes(payload.recentes ?? []);
    },
    [setFolders, setRecentes],
  );

  const refreshCloudState = useCallback(async () => {
    if (!isCloud) return;
    if (typeof window !== "undefined" && !navigator.onLine) return;

    const [libraryResult, setlistsResult] = await Promise.allSettled([
      cloudFetchLibrary(),
      cloudFetchSetlists(),
    ]);

    if (libraryResult.status === "fulfilled") {
      applyCloudLibrarySnapshot(libraryResult.value);
    }

    if (setlistsResult.status === "fulfilled") {
      setSetlistSummaries(setlistsResult.value.setlists);
    }
  }, [isCloud, applyCloudLibrarySnapshot, setSetlistSummaries]);

  /** Carrega localStorage ou nuvem/sync na primeira vez */
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

    const performSyncOrFetch = async (isFirstSync: boolean) => {
      if (isFirstSync) {
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
        localStorage.setItem(cloudSyncDoneKey(userId), "1");
      } else {
        const lib = await cloudFetchLibrary();
        if (cancelled) return;
        applyCloudLibrarySnapshot(lib);
      }

      const guestSetlists = loadLocalSetlists();
      if (guestSetlists?.length) {
        await migrateGuestSetlistsProgressive(guestSetlists, saveLocalSetlists);
      }

      try {
        const sl = await cloudFetchSetlists();
        if (!cancelled) setSetlistSummaries(sl.setlists);
      } catch {
        if (!cancelled) setSetlistSummaries([]);
      }
    };

    void (async () => {
      const key = cloudSyncDoneKey(userId);
      const alreadyDone = typeof window !== "undefined" && localStorage.getItem(key) === "1";

      try {
        await performSyncOrFetch(!alreadyDone);
      } catch {
        try {
          await performSyncOrFetch(false); // retry as fetch only
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
  }, [status, userId, applyCloudLibrarySnapshot, setFolders, setLibraryLoaded, setLocalSetlistsRaw, setRecentes, setSetlistSummaries]);

  useEffect(() => {
    if (!isCloud || !userId || !syncSignalKey) return;

    const runRefresh = () => {
      void refreshCloudState();
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        runRefresh();
      }
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== syncSignalKey || !event.newValue) return;
      runRefresh();
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

  return <>{children}</>;
}
