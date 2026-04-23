import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { userFolders } from "@/db/schema";
import { requireUserId } from "@/lib/server/api-auth";
import {
  assertFolderOwner,
  loadCloudFoldersAndSongs,
} from "@/lib/server/cloud-data";

type RouteCtx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: RouteCtx) {
  const authResult = await requireUserId();
  if ("error" in authResult) return authResult.error;

  const { id } = await ctx.params;
  const folder = await assertFolderOwner(authResult.userId, id);
  if (!folder) {
    return NextResponse.json({ error: "Pasta não encontrada" }, { status: 404 });
  }

  let body: { title?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const title = body.title?.trim();
  if (!title) {
    return NextResponse.json({ error: "Título obrigatório" }, { status: 400 });
  }

  await db
    .update(userFolders)
    .set({ title, updatedAt: new Date() })
    .where(
      and(eq(userFolders.id, id), eq(userFolders.userId, authResult.userId)),
    );

  const { folders } = await loadCloudFoldersAndSongs(authResult.userId);
  return NextResponse.json({ folders });
}

export async function DELETE(_req: Request, ctx: RouteCtx) {
  const authResult = await requireUserId();
  if ("error" in authResult) return authResult.error;

  const { id } = await ctx.params;
  const folder = await assertFolderOwner(authResult.userId, id);
  if (!folder) {
    return NextResponse.json({ error: "Pasta não encontrada" }, { status: 404 });
  }
  if (folder.isDefault) {
    return NextResponse.json(
      { error: "Não é possível excluir a pasta padrão" },
      { status: 400 },
    );
  }

  await db
    .delete(userFolders)
    .where(
      and(eq(userFolders.id, id), eq(userFolders.userId, authResult.userId)),
    );

  const { folders } = await loadCloudFoldersAndSongs(authResult.userId);
  return NextResponse.json({ folders });
}
