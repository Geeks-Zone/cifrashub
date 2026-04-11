import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { userSongs } from "@/db/schema";
import type { StoredSong } from "@/lib/types";
import { requireUserId } from "@/lib/server/api-auth";
import { loadCloudFoldersAndSongs } from "@/lib/server/cloud-data";
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

export async function GET() {
  const authResult = await requireUserId();
  if ("error" in authResult) return authResult.error;

  const { recentes } = await loadCloudFoldersAndSongs(authResult.userId);
  return NextResponse.json({ recentes });
}

/** Substitui a lista de recentes (até 15 itens, como no client). */
export async function POST(req: Request) {
  const authResult = await requireUserId();
  if ("error" in authResult) return authResult.error;

  let body: { songs?: StoredSong[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const songs = body.songs;
  if (!Array.isArray(songs)) {
    return NextResponse.json({ error: "songs deve ser array" }, { status: 400 });
  }

  const seen = new Set<string>();
  const deduped = songs.filter((s) => {
    if (!s?.id) return false;
    const k = arrangementKey(s);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  const trimmed = deduped.slice(0, 15);

  await db
    .delete(userSongs)
    .where(
      and(
        eq(userSongs.userId, authResult.userId),
        isNull(userSongs.folderId),
        eq(userSongs.isRecent, true),
      ),
    );

  if (trimmed.length > 0) {
    await db.insert(userSongs).values(
      trimmed.map((s, i) => {
        const row = toneCapoUiFromStored(s);
        return {
          userId: authResult.userId,
          folderId: null,
          songId: s.id,
          arrangementId: resolveArrangementId(s),
          sourceArtistSlug: sourceArtistSlugForRow(s),
          sourceSlug: sourceSlugForRow(s),
          title: s.title,
          artist: s.artist,
          artistSlug: s.artistSlug,
          slug: s.slug,
          youtubeId: youtubeIdForRow(s),
          songData: s.songData,
          tone: row.tone,
          capo: row.capo,
          uiPrefs: row.uiPrefs,
          isRecent: true,
          position: i,
        };
      }),
    );
  }

  const { recentes } = await loadCloudFoldersAndSongs(authResult.userId);
  return NextResponse.json({ recentes });
}

export async function DELETE() {
  const authResult = await requireUserId();
  if ("error" in authResult) return authResult.error;

  await db
    .delete(userSongs)
    .where(
      and(
        eq(userSongs.userId, authResult.userId),
        isNull(userSongs.folderId),
        eq(userSongs.isRecent, true),
      ),
    );

  return NextResponse.json({ recentes: [] });
}
