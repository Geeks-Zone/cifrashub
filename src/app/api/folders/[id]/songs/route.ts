import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { userSongs } from "@/db/schema";
import type { StoredSong } from "@/lib/types";
import { requireUserId } from "@/lib/server/api-auth";
import {
  assertFolderOwner,
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

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: RouteCtx) {
  const authResult = await requireUserId();
  if ("error" in authResult) return authResult.error;

  const { id: folderId } = await ctx.params;
  const folder = await assertFolderOwner(authResult.userId, folderId);
  if (!folder) {
    return NextResponse.json({ error: "Pasta não encontrada" }, { status: 404 });
  }

  const { folders } = await loadCloudFoldersAndSongs(authResult.userId);
  const f = folders.find((x) => x.id === folderId);
  return NextResponse.json({ songs: f?.songs ?? [] });
}

export async function POST(req: Request, ctx: RouteCtx) {
  const authResult = await requireUserId();
  if ("error" in authResult) return authResult.error;

  const { id: folderId } = await ctx.params;
  const folder = await assertFolderOwner(authResult.userId, folderId);
  if (!folder) {
    return NextResponse.json({ error: "Pasta não encontrada" }, { status: 404 });
  }

  let body: StoredSong;
  try {
    body = (await req.json()) as StoredSong;
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  if (
    !body?.id ||
    !body.title ||
    !body.songData ||
    !Array.isArray(body.songData)
  ) {
    return NextResponse.json({ error: "Dados da música inválidos" }, { status: 400 });
  }

  const aid = resolveArrangementId(body);
  const existing = await db
    .select()
    .from(userSongs)
    .where(
      and(
        eq(userSongs.userId, authResult.userId),
        eq(userSongs.folderId, folderId),
        eq(userSongs.arrangementId, aid),
      ),
    )
    .limit(1);

  const rowSong = toneCapoUiFromStored(body);
  const yt = youtubeIdForRow(body);
  const srcArt = sourceArtistSlugForRow(body);
  const srcSlug = sourceSlugForRow(body);

  if (existing.length > 0) {
    await db
      .update(userSongs)
      .set({
        songId: body.id,
        title: body.title,
        artist: body.artist,
        artistSlug: body.artistSlug,
        slug: body.slug,
        youtubeId: yt,
        songData: body.songData,
        tone: rowSong.tone,
        capo: rowSong.capo,
        uiPrefs: rowSong.uiPrefs,
        sourceArtistSlug: srcArt,
        sourceSlug: srcSlug,
        isRecent: false,
        updatedAt: new Date(),
      })
      .where(eq(userSongs.id, existing[0]!.id));
  } else {
    const maxPosRows = await db
      .select()
      .from(userSongs)
      .where(
        and(eq(userSongs.userId, authResult.userId), eq(userSongs.folderId, folderId)),
      );

    const position =
      maxPosRows.length === 0
        ? 0
        : Math.max(...maxPosRows.map((r) => r.position)) + 1;

    await db.insert(userSongs).values({
      userId: authResult.userId,
      folderId,
      songId: body.id,
      arrangementId: aid,
      sourceArtistSlug: srcArt,
      sourceSlug: srcSlug,
      title: body.title,
      artist: body.artist,
      artistSlug: body.artistSlug,
      slug: body.slug,
      youtubeId: yt,
      songData: body.songData,
      tone: rowSong.tone,
      capo: rowSong.capo,
      uiPrefs: rowSong.uiPrefs,
      isRecent: false,
      position,
    });
  }

  const { folders } = await loadCloudFoldersAndSongs(authResult.userId);
  return NextResponse.json({ folders });
}

export async function DELETE(req: Request, ctx: RouteCtx) {
  const authResult = await requireUserId();
  if ("error" in authResult) return authResult.error;

  const { id: folderId } = await ctx.params;
  const folder = await assertFolderOwner(authResult.userId, folderId);
  if (!folder) {
    return NextResponse.json({ error: "Pasta não encontrada" }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const arrangementId =
    searchParams.get("arrangementId") ?? searchParams.get("songId");
  if (!arrangementId) {
    return NextResponse.json(
      { error: "arrangementId obrigatório" },
      { status: 400 },
    );
  }

  await db
    .delete(userSongs)
    .where(
      and(
        eq(userSongs.userId, authResult.userId),
        eq(userSongs.folderId, folderId),
        eq(userSongs.arrangementId, arrangementId),
      ),
    );

  const { folders } = await loadCloudFoldersAndSongs(authResult.userId);
  return NextResponse.json({ folders });
}
