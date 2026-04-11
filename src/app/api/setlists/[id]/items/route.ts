import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { userSetlistItems, userSetlists } from "@/db/schema";
import { requireUserId } from "@/lib/server/api-auth";
import {
  assertUserOwnsArrangement,
  getSetlistDetail,
} from "@/lib/server/setlist-queries";

type RouteCtx = { params: Promise<{ id: string }> };

async function assertSetlistOwner(userId: string, setlistId: string) {
  const [row] = await db
    .select({ id: userSetlists.id })
    .from(userSetlists)
    .where(and(eq(userSetlists.id, setlistId), eq(userSetlists.userId, userId)))
    .limit(1);
  return row;
}

export async function POST(req: Request, ctx: RouteCtx) {
  const authResult = await requireUserId();
  if ("error" in authResult) return authResult.error;

  const { id: setlistId } = await ctx.params;
  const owner = await assertSetlistOwner(authResult.userId, setlistId);
  if (!owner) {
    return NextResponse.json({ error: "Setlist não encontrada" }, { status: 404 });
  }

  let body: { arrangementId?: string; notes?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const aid = body.arrangementId?.trim();
  if (!aid) {
    return NextResponse.json({ error: "arrangementId obrigatório" }, { status: 400 });
  }
  const ok = await assertUserOwnsArrangement(authResult.userId, aid);
  if (!ok) {
    return NextResponse.json(
      { error: "Arranjo não encontrado na sua biblioteca" },
      { status: 400 },
    );
  }

  const current = await db
    .select()
    .from(userSetlistItems)
    .where(eq(userSetlistItems.setlistId, setlistId));
  const position =
    current.length === 0
      ? 0
      : Math.max(...current.map((r) => r.position)) + 1;

  await db.insert(userSetlistItems).values({
    setlistId,
    arrangementId: aid,
    position,
    notes: body.notes?.trim() || null,
  });

  const detail = await getSetlistDetail(authResult.userId, setlistId);
  return NextResponse.json(detail);
}

/** Atualiza positions com um único UPDATE ... CASE. */
async function batchUpdatePositions(
  setlistId: string,
  orderedIds: string[],
) {
  if (orderedIds.length === 0) return;
  const cases = orderedIds
    .map((id, i) => sql`when ${id} then ${i}`)
    .reduce((acc, c) => sql`${acc} ${c}`);

  await db
    .update(userSetlistItems)
    .set({
      position: sql`case ${userSetlistItems.id} ${cases} end`,
    })
    .where(
      and(
        eq(userSetlistItems.setlistId, setlistId),
        inArray(userSetlistItems.id, orderedIds),
      ),
    );
}

export async function PATCH(req: Request, ctx: RouteCtx) {
  const authResult = await requireUserId();
  if ("error" in authResult) return authResult.error;

  const { id: setlistId } = await ctx.params;
  const owner = await assertSetlistOwner(authResult.userId, setlistId);
  if (!owner) {
    return NextResponse.json({ error: "Setlist não encontrada" }, { status: 404 });
  }

  let body: { orderedItemIds?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const order = body.orderedItemIds;
  if (!Array.isArray(order) || !order.every((x) => typeof x === "string")) {
    return NextResponse.json({ error: "orderedItemIds inválido" }, { status: 400 });
  }

  const items = await db
    .select()
    .from(userSetlistItems)
    .where(eq(userSetlistItems.setlistId, setlistId));
  const idSet = new Set(items.map((i) => i.id));
  if (order.length !== items.length || !order.every((id) => idSet.has(id))) {
    return NextResponse.json(
      { error: "orderedItemIds deve listar todos os itens exatamente uma vez" },
      { status: 400 },
    );
  }

  await batchUpdatePositions(setlistId, order);

  const detail = await getSetlistDetail(authResult.userId, setlistId);
  return NextResponse.json(detail);
}

export async function DELETE(req: Request, ctx: RouteCtx) {
  const authResult = await requireUserId();
  if ("error" in authResult) return authResult.error;

  const { id: setlistId } = await ctx.params;
  const owner = await assertSetlistOwner(authResult.userId, setlistId);
  if (!owner) {
    return NextResponse.json({ error: "Setlist não encontrada" }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const itemId = searchParams.get("itemId");
  if (!itemId) {
    return NextResponse.json({ error: "itemId obrigatório" }, { status: 400 });
  }

  await db
    .delete(userSetlistItems)
    .where(
      and(
        eq(userSetlistItems.setlistId, setlistId),
        eq(userSetlistItems.id, itemId),
      ),
    );

  // Recompacta positions em um único UPDATE
  const remaining = await db
    .select({ id: userSetlistItems.id })
    .from(userSetlistItems)
    .where(eq(userSetlistItems.setlistId, setlistId))
    .orderBy(asc(userSetlistItems.position), asc(userSetlistItems.createdAt));

  await batchUpdatePositions(
    setlistId,
    remaining.map((r) => r.id),
  );

  const detail = await getSetlistDetail(authResult.userId, setlistId);
  return NextResponse.json(detail);
}
