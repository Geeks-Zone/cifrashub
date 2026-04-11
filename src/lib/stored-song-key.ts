import type { CurrentSongMeta, StoredSong } from "@/lib/types";

/** Chave estável para localizar o mesmo arranjo em pastas/recentes e ao persistir. */
export function arrangementKey(
  s: Pick<StoredSong, "id" | "arrangementId">,
): string {
  return s.arrangementId ?? s.id;
}

export function currentSongKey(m: CurrentSongMeta): string {
  return m.arrangementId ?? m.id;
}
