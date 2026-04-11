import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { userFolders } from "@/db/schema";
import { requireUserId } from "@/lib/server/api-auth";
import { loadCloudFoldersAndSongs } from "@/lib/server/cloud-data";

export async function GET() {
  const authResult = await requireUserId();
  if ("error" in authResult) return authResult.error;

  const { folders } = await loadCloudFoldersAndSongs(authResult.userId);
  return NextResponse.json({ folders });
}

export async function POST(req: Request) {
  const authResult = await requireUserId();
  if ("error" in authResult) return authResult.error;

  let body: { name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ error: "Nome obrigatório" }, { status: 400 });
  }

  const existing = await db
    .select()
    .from(userFolders)
    .where(eq(userFolders.userId, authResult.userId));

  const position =
    existing.length === 0
      ? 0
      : Math.max(...existing.map((f) => f.position)) + 1;

  const [created] = await db
    .insert(userFolders)
    .values({
      userId: authResult.userId,
      name,
      position,
      isDefault: false,
    })
    .returning();

  const { folders } = await loadCloudFoldersAndSongs(authResult.userId);
  const folderDto = folders.find((f) => f.id === created!.id);

  return NextResponse.json({ folder: folderDto ?? null, folders });
}
