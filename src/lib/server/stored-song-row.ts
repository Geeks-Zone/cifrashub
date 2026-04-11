import type { StoredSong, StoredSongUiPrefs } from "@/lib/types";
import { isValidYoutubeId } from "@/lib/youtube";

/** ID válido para embed ou `null` (não persiste string inválida no banco). */
export function youtubeIdForRow(s: Pick<StoredSong, "youtubeId">): string | null {
  const v = s.youtubeId?.trim();
  return isValidYoutubeId(v) ? v : null;
}

function uiPrefsFromStored(s: StoredSong): StoredSongUiPrefs | null {
  const u: StoredSongUiPrefs = {};
  if (s.simplified !== undefined) u.simplified = s.simplified;
  if (s.showTabs !== undefined) u.showTabs = s.showTabs;
  if (s.mirrored !== undefined) u.mirrored = s.mirrored;
  if (s.fontSizeOffset !== undefined) u.fontSizeOffset = s.fontSizeOffset;
  if (s.columns !== undefined) u.columns = s.columns;
  if (s.spacingOffset !== undefined) u.spacingOffset = s.spacingOffset;
  return Object.keys(u).length > 0 ? u : null;
}

export function toneCapoUiFromStored(s: StoredSong): {
  tone: number;
  capo: number;
  uiPrefs: StoredSongUiPrefs | null;
} {
  return {
    tone: s.tone ?? 0,
    capo: s.capo ?? 0,
    uiPrefs: uiPrefsFromStored(s),
  };
}
