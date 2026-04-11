import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { userSetlists } from "@/db/schema";
import { requireUserId } from "@/lib/server/api-auth";
import {
  getSetlistDetail,
  listSetlistsForUser,
} from "@/lib/server/setlist-queries";

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: RouteCtx) {
  const authResult = await requireUserId();
  if ("error" in authResult) return authResult.error;

  const { id } = await ctx.params;
  const detail = await getSetlistDetail(authResult.userId, id);
  if (!detail) {
    return NextResponse.json({ error: "Setlist não encontrada" }, { status: 404 });
  }
  return NextResponse.json(detail);
}

export async function PATCH(req: Request, ctx: RouteCtx) {
  const authResult = await requireUserId();
  if ("error" in authResult) return authResult.error;

  const { id } = await ctx.params;
  let body: { title?: string; description?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const [row] = await db
    .select()
    .from(userSetlists)
    .where(and(eq(userSetlists.id, id), eq(userSetlists.userId, authResult.userId)))
    .limit(1);
  if (!row) {
    return NextResponse.json({ error: "Setlist não encontrada" }, { status: 404 });
  }

  await db
    .update(userSetlists)
    .set({
      ...(body.title !== undefined ? { title: body.title.trim() || row.title } : {}),
      ...(body.description !== undefined
        ? { description: body.description?.trim() || null }
        : {}),
      updatedAt: new Date(),
    })
    .where(eq(userSetlists.id, id));

  const detail = await getSetlistDetail(authResult.userId, id);
  return NextResponse.json(detail);
}

export async function DELETE(_req: Request, ctx: RouteCtx) {
  const authResult = await requireUserId();
  if ("error" in authResult) return authResult.error;

  const { id } = await ctx.params;
  await db
    .delete(userSetlists)
    .where(and(eq(userSetlists.id, id), eq(userSetlists.userId, authResult.userId)));

  const setlists = await listSetlistsForUser(authResult.userId);
  return NextResponse.json({ setlists });
}
