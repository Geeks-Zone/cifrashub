import type { Folder, LocalSetlistStored, StoredSong } from "./types";

const STORAGE_FOLDERS = "cifrashub_folders";
const STORAGE_RECENTES = "cifrashub_recentes";
const STORAGE_SETLISTS = "cifrashub_setlists_v1";

/** Chave por usuário: primeira sincronização local → nuvem já feita. */
export function cloudSyncDoneKey(userId: string) {
  return `cifrashub_cloud_sync_${userId}`;
}

export * from "./cloud-api";

function safeSetItem(key: string, value: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    if (
      e instanceof DOMException &&
      (e.name === "QuotaExceededError" || e.code === 22)
    ) {
      console.warn(`localStorage quota exceeded for key "${key}"`);
    }
    return false;
  }
}

function loadJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function saveJson(key: string, value: unknown): boolean {
  return safeSetItem(key, JSON.stringify(value));
}

export function loadFolders(): Folder[] | null {
  return loadJson<Folder[]>(STORAGE_FOLDERS);
}

export function saveFolders(folders: Folder[]): boolean {
  return saveJson(STORAGE_FOLDERS, folders);
}

export function loadRecentes(): StoredSong[] | null {
  return loadJson<StoredSong[]>(STORAGE_RECENTES);
}

export function saveRecentes(songs: StoredSong[]): boolean {
  return saveJson(STORAGE_RECENTES, songs);
}

export function loadLocalSetlists(): LocalSetlistStored[] | null {
  return loadJson<LocalSetlistStored[]>(STORAGE_SETLISTS);
}

export function saveLocalSetlists(setlists: LocalSetlistStored[]): boolean {
  return saveJson(STORAGE_SETLISTS, setlists);
}

export const DEFAULT_FOLDERS: Folder[] = [
  { id: "default", name: "Favoritos", songs: [], isDefault: true },
];
