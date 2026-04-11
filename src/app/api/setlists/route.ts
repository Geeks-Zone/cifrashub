import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { userSetlists } from "@/db/schema";
import { requireUserId } from "@/lib/server/api-auth";
import { listSetlistsForUser } from "@/lib/server/setlist-queries";

export async function GET() {
  const authResult = await requireUserId();
  if ("error" in authResult) return authResult.error;

  const list = await listSetlistsForUser(authResult.userId);
  return NextResponse.json({ setlists: list });
}

export async function POST(req: Request) {
  const authResult = await requireUserId();
  if ("error" in authResult) return authResult.error;

  let body: { title?: string; description?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const title = body.title?.trim();
  if (!title) {
    return NextResponse.json({ error: "title obrigatório" }, { status: 400 });
  }

  const existing = await db
    .select()
    .from(userSetlists)
    .where(eq(userSetlists.userId, authResult.userId));
  const position =
    existing.length === 0
      ? 0
      : Math.max(...existing.map((r) => r.position)) + 1;

  const [created] = await db
    .insert(userSetlists)
    .values({
      userId: authResult.userId,
      title,
      description: body.description?.trim() || null,
      position,
    })
    .returning();

  const setlists = await listSetlistsForUser(authResult.userId);
  return NextResponse.json({ setlist: created, setlists });
}
