import { cache } from "react";
import type { Metadata } from "next";
import { and, eq, gt, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { shareSnapshots, shareTokens } from "@/db/schema";
import type { ShareSnapshotPayload } from "@/lib/share-payload";
import { PublicShareView } from "@/components/share/public-share-view";

type PageProps = { params: Promise<{ token: string }> };

/** Deduplicated via React cache — generateMetadata + page share a single query. */
const fetchSharePayload = cache(async function fetchSharePayload(
  token: string,
): Promise<ShareSnapshotPayload | null> {
  const tokenTrim = token?.trim();
  if (!tokenTrim) return null;

  const [row] = await db
    .select({ payload: shareSnapshots.payload })
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

  return (row?.payload as ShareSnapshotPayload) ?? null;
});

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { token } = await params;
  const payload = await fetchSharePayload(token);

  if (!payload) {
    return { title: "Link inválido" };
  }

  if (payload.type === "arrangement") {
    return {
      title: `${payload.song.title} — ${payload.song.artist}`,
      description: `Cifra de ${payload.song.title} por ${payload.song.artist}`,
    };
  }

  return {
    title: payload.title,
    description: payload.description ?? `Setlist: ${payload.title}`,
  };
}

export default async function SharedPage({ params }: PageProps) {
  const { token } = await params;
  const payload = await fetchSharePayload(token);

  return <PublicShareView payload={payload} />;
}
