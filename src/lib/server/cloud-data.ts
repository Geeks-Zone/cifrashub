import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { userFolders, userSongs } from "@/db/schema";
import type { Folder, StoredSong } from "@/lib/types";

export function rowToStoredSong(row: typeof userSongs.$inferSelect): StoredSong {
  return {
    id: row.songId,
    arrangementId: row.arrangementId,
    title: row.title,
    artist: row.artist,
    artistSlug: row.artistSlug,
    slug: row.slug,
    ...(row.sourceArtistSlug ? { sourceArtistSlug: row.sourceArtistSlug } : {}),
    ...(row.sourceSlug ? { sourceSlug: row.sourceSlug } : {}),
    ...(row.youtubeId ? { youtubeId: row.youtubeId } : {}),
    songData: row.songData,
    tone: row.tone,
    capo: row.capo,
    ...(row.uiPrefs
      ? {
          ...(row.uiPrefs.simplified !== undefined ? { simplified: row.uiPrefs.simplified } : {}),
          ...(row.uiPrefs.showTabs !== undefined ? { showTabs: row.uiPrefs.showTabs } : {}),
          ...(row.uiPrefs.mirrored !== undefined ? { mirrored: row.uiPrefs.mirrored } : {}),
          ...(row.uiPrefs.fontSizeOffset !== undefined ? { fontSizeOffset: row.uiPrefs.fontSizeOffset } : {}),
          ...(row.uiPrefs.columns !== undefined ? { columns: row.uiPrefs.columns } : {}),
          ...(row.uiPrefs.spacingOffset !== undefined ? { spacingOffset: row.uiPrefs.spacingOffset } : {}),
        }
      : {}),
  };
}

/** Garante ao menos a pasta padrão “Favoritos”. */
export async function ensureDefaultFolder(userId: string) {
  const existing = await db
    .select()
    .from(userFolders)
    .where(eq(userFolders.userId, userId));

  if (existing.length === 0) {
    await db.insert(userFolders).values({
      userId,
      title: "Favoritos",
      position: 0,
      isDefault: true,
    });
    return;
  }

  const hasDefault = existing.some((f) => f.isDefault);
  if (!hasDefault) {
    const first = [...existing].sort((a, b) => a.position - b.position)[0]!;
    await db
      .update(userFolders)
      .set({ isDefault: true, updatedAt: new Date() })
      .where(eq(userFolders.id, first.id));
  }
}

export async function loadCloudFoldersAndSongs(userId: string): Promise<{
  folders: Folder[];
  recentes: StoredSong[];
}> {
  await ensureDefaultFolder(userId);

  const folderRows = await db
    .select()
    .from(userFolders)
    .where(eq(userFolders.userId, userId))
    .orderBy(asc(userFolders.position), asc(userFolders.createdAt));

  const songRows = await db
    .select()
    .from(userSongs)
    .where(eq(userSongs.userId, userId));

  const folders: Folder[] = folderRows.map((f) => ({
    id: f.id,
    title: f.title,
    isDefault: f.isDefault,
    songs: songRows
      .filter((s) => s.folderId === f.id && !s.isRecent)
      .sort((a, b) => a.position - b.position)
      .map(rowToStoredSong),
  }));

  const recentes = songRows
    .filter((s) => s.folderId === null && s.isRecent)
    .sort((a, b) => a.position - b.position)
    .map(rowToStoredSong);

  return { folders, recentes };
}

export async function assertFolderOwner(userId: string, folderId: string) {
  const [row] = await db
    .select()
    .from(userFolders)
    .where(and(eq(userFolders.id, folderId), eq(userFolders.userId, userId)))
    .limit(1);
  return row ?? null;
}
