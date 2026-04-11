import type { SectionType } from "./types";

const NOTES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
] as const;

const FLAT_TO_SHARP: Record<string, string> = {
  Cb: "B",
  Db: "C#",
  Eb: "D#",
  Fb: "E",
  Gb: "F#",
  Ab: "G#",
  Bb: "A#",
};

/** Raiz de tom (ex.: G, F#) como no JSON do Cifra Club. */
function normalizeKeyRoot(root: string): string {
  const t = root.trim();
  return FLAT_TO_SHARP[t] ?? t;
}

/** Tom efetivo ao usar capotraste: sobe semitons a partir da raiz escrita. */
export function transposeRootNote(root: string, semitones: number): string {
  const r = normalizeKeyRoot(root);
  if (semitones === 0) return r;
  const index = NOTES.indexOf(r as (typeof NOTES)[number]);
  if (index === -1) return r;
  let newIndex = (index + semitones) % 12;
  if (newIndex < 0) newIndex += 12;
  return NOTES[newIndex];
}

export function normalizeChord(chord: string): string {
  return chord.replace(/[A-G]b/g, (match) => FLAT_TO_SHARP[match] ?? match);
}

export function transposeChord(chord: string, steps: number): string {
  if (!chord || steps === 0) return chord;
  return normalizeChord(chord)
    .split("/")
    .map((part) => {
      return part.replace(/^[A-G][#]?/, (match) => {
        const index = NOTES.indexOf(match as (typeof NOTES)[number]);
        if (index === -1) return match;
        let newIndex = (index + steps) % 12;
        if (newIndex < 0) newIndex += 12;
        return NOTES[newIndex];
      });
    })
    .join("/");
}

function isMinorKey(key: string): boolean {
  return key.endsWith("m") && !key.endsWith("dim");
}

/**
 * Calcula estado do toggle relativo maior/menor.
 * Retorna o tom destino e os labels para o botão.
 */
export function getRelativeKeyToggle(
  writtenKey: string,
  tone: number,
): { targetTone: number; isAtRelative: boolean; label: string } {
  const minor = isMinorKey(writtenKey);
  const relativeOffset = minor ? 3 : -3;
  const normalizedTone = ((tone % 12) + 12) % 12;
  const isAtRelative = normalizedTone === ((relativeOffset % 12) + 12) % 12;

  const targetTone = isAtRelative ? 0 : relativeOffset;
  const currentKey = transposeRootNote(writtenKey, isAtRelative ? 0 : tone);
  const targetNote = transposeRootNote(currentKey, isAtRelative ? -relativeOffset : relativeOffset);

  const label = isAtRelative
    ? minor
      ? `Voltar p/ Menor (${transposeRootNote(writtenKey, 0)}m)`
      : `Voltar p/ Maior (${transposeRootNote(writtenKey, 0)})`
    : minor
      ? `Relativo Maior (${targetNote})`
      : `Relativo Menor (${targetNote}m)`;

  return { targetTone, isAtRelative, label };
}

export function simplifyChord(chord: string): string {
  if (!chord) return "";
  const simple = chord.split("/")[0] ?? "";
  const match = simple.match(/^([A-G][#b]?m?)/);
  return match?.[1] ?? simple;
}

export function classifySection(label: string): SectionType {
  const lower = label.toLowerCase();
  if (/intro/.test(lower)) return "intro";
  if (/pre.?refr[aã]o|pre.?chorus/.test(lower)) return "pre-chorus";
  if (/vers[oõ]|parte|estrofe/.test(lower)) return "verse";
  if (/refr[aã]o|chorus/.test(lower)) return "chorus";
  if (/ponte|bridge/.test(lower)) return "bridge";
  if (/tab\b/.test(lower)) return "tab";
  if (/solo/.test(lower)) return "solo";
  if (/final|outro/.test(lower)) return "outro";
  return "verse";
}
