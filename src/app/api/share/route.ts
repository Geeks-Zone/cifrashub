import { and, eq, gt, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { shareSnapshots, shareTokens, userSongs } from "@/db/schema";
import { requireUserId } from "@/lib/server/api-auth";
import { rowToStoredSong } from "@/lib/server/cloud-data";
import { getSetlistDetail } from "@/lib/server/setlist-queries";
import type { ShareSnapshotPayload } from "@/lib/share-payload";

const MAX_SHARE_SETLIST_ITEMS = 50;
const MAX_SHARES_PER_HOUR = 30;

export async function POST(req: Request) {
  const authResult = await requireUserId();
  if ("error" in authResult) return authResult.error;

  // Rate limit: max shares per hour per user
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentShares = await db
    .select({ id: shareSnapshots.id })
    .from(shareSnapshots)
    .where(
      and(
        eq(shareSnapshots.createdByUserId, authResult.userId),
        gt(shareSnapshots.createdAt, oneHourAgo),
      ),
    );
  if (recentShares.length >= MAX_SHARES_PER_HOUR) {
    return NextResponse.json(
      { error: "Limite de compartilhamentos por hora atingido. Tente novamente mais tarde." },
      { status: 429 },
    );
  }

  let body: {
    resourceType?: string;
    arrangementId?: string;
    setlistId?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const resourceType = body.resourceType;
  if (resourceType !== "arrangement" && resourceType !== "setlist") {
    return NextResponse.json({ error: "resourceType inválido" }, { status: 400 });
  }

  let payload: ShareSnapshotPayload;

  if (resourceType === "arrangement") {
    const aid = body.arrangementId?.trim();
    if (!aid) {
      return NextResponse.json(
        { error: "arrangementId obrigatório" },
        { status: 400 },
      );
    }
    const rows = await db
      .select()
      .from(userSongs)
      .where(
        and(eq(userSongs.userId, authResult.userId), eq(userSongs.arrangementId, aid)),
      );
    const row =
      rows.find((r) => r.folderId !== null) ?? rows.find((r) => r.isRecent) ?? rows[0];
    if (!row) {
      return NextResponse.json({ error: "Cifra não encontrada" }, { status: 404 });
    }
    payload = { type: "arrangement", song: rowToStoredSong(row) };
  } else {
    const sid = body.setlistId?.trim();
    if (!sid) {
      return NextResponse.json({ error: "setlistId obrigatório" }, { status: 400 });
    }
    const detail = await getSetlistDetail(authResult.userId, sid);
    if (!detail) {
      return NextResponse.json({ error: "Setlist não encontrada" }, { status: 404 });
    }
    if (detail.items.length > MAX_SHARE_SETLIST_ITEMS) {
      return NextResponse.json(
        { error: `Setlist excede o limite de ${MAX_SHARE_SETLIST_ITEMS} itens para compartilhamento.` },
        { status: 400 },
      );
    }
    payload = {
      type: "setlist",
      title: detail.title,
      description: detail.description,
      items: detail.items.map((it) => ({
        position: it.position,
        arrangementId: it.arrangementId,
        notes: it.notes,
        song: it.song,
      })),
    };
  }

  const [snapshot] = await db
    .insert(shareSnapshots)
    .values({
      resourceType,
      payload,
      createdByUserId: authResult.userId,
    })
    .returning();

  const [tokenRow] = await db
    .insert(shareTokens)
    .values({
      snapshotId: snapshot!.id,
      permission: "read",
    })
    .returning();

  return NextResponse.json({
    token: tokenRow!.token,
    snapshotId: snapshot!.id,
  });
}

export async function DELETE(req: Request) {
  const authResult = await requireUserId();
  if ("error" in authResult) return authResult.error;

  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "token obrigatório" }, { status: 400 });
  }

  const [st] = await db
    .select({
      token: shareTokens.token,
      snapshotId: shareTokens.snapshotId,
    })
    .from(shareTokens)
    .innerJoin(shareSnapshots, eq(shareSnapshots.id, shareTokens.snapshotId))
    .where(
      and(
        eq(shareTokens.token, token),
        isNull(shareTokens.revokedAt),
        eq(shareSnapshots.createdByUserId, authResult.userId),
      ),
    )
    .limit(1);

  if (!st) {
    return NextResponse.json({ error: "Token não encontrado" }, { status: 404 });
  }

  await db
    .update(shareTokens)
    .set({ revokedAt: new Date() })
    .where(eq(shareTokens.token, token));

  return NextResponse.json({ ok: true });
}
