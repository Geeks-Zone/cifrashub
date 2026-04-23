import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { userFolders, userSongs } from "@/db/schema";
import type { Folder, StoredSong } from "@/lib/types";
import { requireUserId } from "@/lib/server/api-auth";
import {
  ensureDefaultFolder,
  loadCloudFoldersAndSongs,
} from "@/lib/server/cloud-data";
import {
  resolveArrangementId,
  sourceArtistSlugForRow,
  sourceSlugForRow,
} from "@/lib/server/song-persist";
import {
  toneCapoUiFromStored,
  youtubeIdForRow,
} from "@/lib/server/stored-song-row";
import { arrangementKey } from "@/lib/stored-song-key";

type SyncBody = {
  folders?: Folder[];
  recentes?: StoredSong[];
};

function dedupeSongsByArrangement(songs: StoredSong[]): StoredSong[] {
  const seen = new Set<string>();
  return songs.filter((s) => {
    const k = arrangementKey(s);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function buildSongRow(
  userId: string,
  folderId: string | null,
  song: StoredSong,
  position: number,
  isRecent: boolean,
) {
  const row = toneCapoUiFromStored(song);
  return {
    userId,
    folderId,
    songId: song.id,
    arrangementId: resolveArrangementId(song),
    sourceArtistSlug: sourceArtistSlugForRow(song),
    sourceSlug: sourceSlugForRow(song),
    title: song.title,
    artist: song.artist,
    artistSlug: song.artistSlug,
    slug: song.slug,
    youtubeId: youtubeIdForRow(song),
    songData: song.songData,
    tone: row.tone,
    capo: row.capo,
    uiPrefs: row.uiPrefs,
    isRecent,
    position,
  };
}

async function resolveFolderId(
  userId: string,
  localFolder: Folder,
  cloudFolders: (typeof userFolders.$inferSelect)[],
): Promise<string> {
  const isDefaultLocal =
    localFolder.isDefault ||
    localFolder.id === "default" ||
    localFolder.title === "Favoritos";

  if (isDefaultLocal) {
    const def = cloudFolders.find((f) => f.isDefault || f.title === "Favoritos");
    if (def) return def.id;
  }

  const byName = cloudFolders.find((f) => f.title === localFolder.title);
  if (byName) return byName.id;

  const position =
    cloudFolders.length === 0
      ? 0
      : Math.max(...cloudFolders.map((f) => f.position)) + 1;

  const [created] = await db
    .insert(userFolders)
    .values({
      userId,
      title: localFolder.title,
      position,
      isDefault: isDefaultLocal,
    })
    .returning();

  cloudFolders.push(created!);
  return created!.id;
}

export async function POST(req: Request) {
  const authResult = await requireUserId();
  if ("error" in authResult) return authResult.error;

  let body: SyncBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  await ensureDefaultFolder(authResult.userId);

  const localFolders = body.folders ?? [];
  const localRecentes = dedupeSongsByArrangement(body.recentes ?? []);

  // 1. Carrega estado cloud em uma única query
  const cloudFolderRows = await db
    .select()
    .from(userFolders)
    .where(eq(userFolders.userId, authResult.userId));

  const allCloudSongs = await db
    .select()
    .from(userSongs)
    .where(eq(userSongs.userId, authResult.userId));

  // Index: "folderId|arrangementId" → row
  const existingByKey = new Map<string, typeof allCloudSongs[number]>();
  // Max position per folder
  const maxPosByFolder = new Map<string, number>();

  for (const r of allCloudSongs) {
    const fk = `${r.folderId ?? ""}|${r.arrangementId}`;
    existingByKey.set(fk, r);
    if (r.folderId) {
      const cur = maxPosByFolder.get(r.folderId) ?? -1;
      if (r.position > cur) maxPosByFolder.set(r.folderId, r.position);
    }
  }

  // 2. Processa pastas: separa updates e inserts
  const toUpdate: Array<{
    id: string;
    song: StoredSong;
  }> = [];
  const toInsert: Array<
    ReturnType<typeof buildSongRow> & { id?: undefined }
  > = [];

  for (const lf of localFolders) {
    const folderId = await resolveFolderId(
      authResult.userId,
      lf,
      cloudFolderRows,
    );
    let nextPos = (maxPosByFolder.get(folderId) ?? -1) + 1;

    for (const song of dedupeSongsByArrangement(lf.songs)) {
      const aid = resolveArrangementId(song);
      const fk = `${folderId}|${aid}`;
      const existing = existingByKey.get(fk);

      if (existing) {
        toUpdate.push({ id: existing.id, song });
      } else {
        toInsert.push(
          buildSongRow(authResult.userId, folderId, song, nextPos, false),
        );
        nextPos++;
        // Mark as existing to avoid duplicates within the same sync
        existingByKey.set(fk, {} as typeof allCloudSongs[number]);
      }
    }
  }

  // 3. Execute updates individuais (SET values diferem por row)
  await Promise.all(
    toUpdate.map(({ id, song }) => {
      const row = toneCapoUiFromStored(song);
      return db
        .update(userSongs)
        .set({
          songId: song.id,
          title: song.title,
          artist: song.artist,
          artistSlug: song.artistSlug,
          slug: song.slug,
          youtubeId: youtubeIdForRow(song),
          songData: song.songData,
          tone: row.tone,
          capo: row.capo,
          uiPrefs: row.uiPrefs,
          sourceArtistSlug: sourceArtistSlugForRow(song),
          sourceSlug: sourceSlugForRow(song),
          isRecent: false,
          updatedAt: new Date(),
        })
        .where(eq(userSongs.id, id));
    }),
  );

  // 4. Batch insert novas músicas
  if (toInsert.length > 0) {
    await db.insert(userSongs).values(toInsert);
  }

  // 5. Merge recentes
  const { recentes: cloudRecentes } = await loadCloudFoldersAndSongs(
    authResult.userId,
  );

  const localKeys = new Set(localRecentes.map((s) => arrangementKey(s)));
  const mergedRecentes = dedupeSongsByArrangement([
    ...localRecentes,
    ...cloudRecentes.filter((s) => !localKeys.has(arrangementKey(s))),
  ]).slice(0, 15);

  await db
    .delete(userSongs)
    .where(
      and(
        eq(userSongs.userId, authResult.userId),
        isNull(userSongs.folderId),
        eq(userSongs.isRecent, true),
      ),
    );

  if (mergedRecentes.length > 0) {
    await db
      .insert(userSongs)
      .values(
        mergedRecentes.map((s, i) =>
          buildSongRow(authResult.userId, null, s, i, true),
        ),
      );
  }

  const payload = await loadCloudFoldersAndSongs(authResult.userId);
  return NextResponse.json(payload);
}
