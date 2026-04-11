import { and, eq, gt, isNull, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { shareSnapshots, shareTokens } from "@/db/schema";
import type { ShareSnapshotPayload } from "@/lib/share-payload";

type RouteCtx = { params: Promise<{ token: string }> };

export async function GET(_req: Request, ctx: RouteCtx) {
  const { token } = await ctx.params;
  const tokenTrim = token?.trim();
  if (!tokenTrim) {
    return NextResponse.json({ error: "token inválido" }, { status: 400 });
  }

  const [row] = await db
    .select({
      payload: shareSnapshots.payload,
    })
    .from(shareTokens)
    .innerJoin(shareSnapshots, eq(shareSnapshots.id, shareTokens.snapshotId))
    .where(
      and(
        eq(shareTokens.token, tokenTrim),
        isNull(shareTokens.revokedAt),
        or(
          isNull(shareTokens.expiresAt),
          gt(shareTokens.expiresAt, new Date()),
        ),
      ),
    )
    .limit(1);

  if (!row) {
    return NextResponse.json({ error: "Link inválido ou expirado" }, { status: 404 });
  }

  return NextResponse.json({
    payload: row.payload as ShareSnapshotPayload,
  });
}
