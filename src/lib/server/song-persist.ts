import { randomUUID } from "crypto";
import type { StoredSong } from "@/lib/types";

/** Alinha com o cliente: UUID novo ou legado `song.id` quando `arrangementId` ausente. */
export function resolveArrangementId(song: StoredSong): string {
  const a = song.arrangementId?.trim();
  if (a) return a;
  const id = song.id?.trim();
  if (id) return id;
  return randomUUID();
}

export function sourceArtistSlugForRow(song: StoredSong): string | null {
  const v = song.sourceArtistSlug?.trim() ?? song.artistSlug?.trim();
  return v || null;
}

export function sourceSlugForRow(song: StoredSong): string | null {
  const v = song.sourceSlug?.trim() ?? song.slug?.trim();
  return v || null;
}
