import { classifySection } from "@/lib/music";
import { parseChordLinePair } from "@/lib/parser";
import type { LyricLine, Section, SectionType } from "@/lib/types";

/** Remove linhas/blocos vazios antes de gravar. Mantém seções só com cabeçalho (`content: []`). */
export function cleanSongSections(sections: Section[]): Section[] {
  return sections.map((s) => {
    const cleanedContent = s.content
      .map((line) => {
        if (line.length === 1 && line[0]?.isTab) {
          const t = line[0].text.replace(/\s+$/u, "");
          if (!t.trim()) return null;
          return [{ ...line[0], text: t }] as LyricLine;
        }

        // Mantém linhas explicitamente vazias que servem como quebra de parágrafo
        if (line.length === 1 && !line[0]?.chord && !line[0]?.text) {
          return line;
        }

        const filtered = line.filter(
          (b) => b.chord.trim() || b.text.trim(),
        ) as LyricLine;
        return filtered.length > 0 ? filtered : null;
      })
      .filter((line): line is LyricLine => line !== null);

    // Remove empty lines at the very end of the section content
    while (cleanedContent.length > 0) {
      const last = cleanedContent[cleanedContent.length - 1];
      if (last && last.length === 1 && !last[0]?.chord && !last[0]?.text && !last[0]?.isTab) {
        cleanedContent.pop();
      } else {
        break;
      }
    }

    return {
      ...s,
      content: cleanedContent,
    };
  });
}

/** Mesmo padrão de acorde que o parser HTML (mantido alinhado). */
const CHORD_PATTERN =
  "([A-G][#b]?(?:maj|min|M)?(?:m(?!aj))?(?:\\d{1,2})?(?:sus[24]?|add\\d?|dim|aug)?(?:/[A-G][#b]?)?)\\b";

const SECTION_RE = /^\[(.+?)\]/;

/** Igual ao fluxo HTML: tags coladas viram linha de acordes legível. */
function chordLineFromAngleMarkers(line: string): string {
  return line.replace(/‹CHORD:([^›]+)›\s*/g, "$1  ").trimEnd();
}

function lineHasAngleChordMarkers(line: string): boolean {
  return /‹CHORD:/.test(line);
}

function isChordOnlyLine(line: string): boolean {
  const t = line.trim();
  if (!t) return false;
  const chordRe = new RegExp(CHORD_PATTERN);
  if (!chordRe.test(t)) return false;
  const remainder = t.replace(new RegExp(CHORD_PATTERN, "g"), "").trim();
  return remainder.length === 0;
}

function isTabLine(line: string, stripped: string): boolean {
  return (
    /-{4,}/.test(stripped) ||
    /^[eBGDAE1-6]?\|.*-{2,}/i.test(stripped)
  );
}

function lyricLineToPlainPair(line: LyricLine): string[] {
  if (line.length === 1 && line[0]?.isTab) {
    return [line[0].text];
  }
  if (line.length === 0) return [];

  let chordLine = "";
  let lyricLine = "";
  for (const b of line) {
    const lyricStart = lyricLine.length;
    while (chordLine.length < lyricStart) chordLine += " ";
    if (b.chord) {
      if (chordLine.length > lyricStart) {
        chordLine += "  ";
      } else if (
        lyricStart > 0 &&
        chordLine.length === lyricStart &&
        chordLine.length > 0
      ) {
        const lastCh = chordLine[chordLine.length - 1];
        if (lastCh && lastCh !== " " && /[A-G#b0-9/]/.test(lastCh)) {
          chordLine += "  ";
        }
      }
      chordLine += b.chord;
    }
    const sp = b.spaceAfter === false ? "" : " ";
    lyricLine += b.text + sp;
  }
  while (chordLine.length < lyricLine.length) chordLine += " ";

  const cl = chordLine.trimEnd();
  const ll = lyricLine.trimEnd();
  if (cl && ll) return [cl, ll];
  if (cl && !ll) return [cl];
  if (!cl && ll) return [ll];
  return [];
}

/** Uma seção como bloco de texto plano (rótulo + linhas), sem linha em branco final entre seções. */
export function sectionToPlainText(section: Section): string {
  const parts: string[] = [section.label];
  for (const row of section.content) {
    const out = lyricLineToPlainPair(row);
    for (const ln of out) parts.push(ln);
  }
  return parts.join("\n");
}

/**
 * Converte a cifra estruturada em texto no estilo “arquivo .txt” (seções + linhas de acorde / letra).
 */
export function sectionsToPlainText(sections: Section[]): string {
  const parts: string[] = [];
  for (const sec of sections) {
    parts.push(sec.label);
    for (const row of sec.content) {
      const out = lyricLineToPlainPair(row);
      for (const ln of out) parts.push(ln);
    }
    parts.push("");
  }
  return parts.join("\n").replace(/\n+$/u, "");
}

/** Junta blocos de seção no mesmo formato que `sectionsToPlainText` (linha em branco entre seções). */
export function joinSectionPlainTexts(blocks: string[]): string {
  if (blocks.length === 0) return "";
  return blocks.join("\n\n").replace(/\n+$/u, "");
}

type ParsePlainCifraResult =
  | { ok: true; data: Section[] }
  | { ok: false; error: string };

/**
 * Interpreta texto multilinha no estilo Cifra Club: `[Seção]`, linha só de acordes + linha de letra opcional, tablaturas, linha só de letra.
 */
export function parsePlainTextCifra(raw: string): ParsePlainCifraResult {
  const normalized = raw
    .replace(/\r\n/g, "\n")
    .replace(/<CHORD:([^>]+)>/gi, "‹CHORD:$1›");
  const text = normalized.trim();
  if (!text) {
    return { ok: false, error: "Digite o conteúdo da cifra." };
  }

  const lines = normalized.split("\n");
  const sections: Section[] = [];
  let currentLabel = "[Verso]";
  let currentType: SectionType = "verse";
  let currentLines: LyricLine[] = [];
  /**
   * `true` até existir conteúdo ou um cabeçalho explícito no arquivo — evita gravar um `[Verso]` vazio
   * antes do primeiro `[Intro]` (ou primeira linha de letra).
   */
  let isImplicitEmptyDefaultSection = true;

  const flushSection = () => {
    if (currentLines.length > 0) {
      sections.push({
        type: currentType,
        label: currentLabel,
        content: [...currentLines],
      });
      isImplicitEmptyDefaultSection = false;
      return;
    }
    if (!isImplicitEmptyDefaultSection) {
      sections.push({
        type: currentType,
        label: currentLabel,
        content: [],
      });
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const stripped = line.trim();

    const secMatch = stripped.match(SECTION_RE);
    if (
      secMatch &&
      !isChordOnlyLine(line) &&
      !isTabLine(line, stripped)
    ) {
      flushSection();
      currentLines = [];
      currentLabel = stripped;
      currentType = classifySection(secMatch[1] ?? "");
      isImplicitEmptyDefaultSection = false;
      continue;
    }

    if (isTabLine(line, stripped)) {
      const tabText = line.replace(/\s+$/, "");
      currentLines.push([
        { chord: "", text: tabText, isTab: true, spaceAfter: true },
      ]);
      isImplicitEmptyDefaultSection = false;
      continue;
    }

    const isMarkerChordLine =
      lineHasAngleChordMarkers(line) &&
      !isTabLine(line, stripped) &&
      !SECTION_RE.test(stripped);

    if (isChordOnlyLine(line) || isMarkerChordLine) {
      const chordLineClean = isMarkerChordLine
        ? chordLineFromAngleMarkers(line)
        : line;
      let lyricLine = "";
      const nextLine = lines[i + 1];
      if (
        i + 1 < lines.length &&
        nextLine !== undefined &&
        !isChordOnlyLine(nextLine) &&
        !lineHasAngleChordMarkers(nextLine) &&
        !SECTION_RE.test(nextLine.trim()) &&
        !isTabLine(nextLine, nextLine.trim())
      ) {
        lyricLine = nextLine;
        i++;
      }
      const blocks = parseChordLinePair(chordLineClean, lyricLine);
      if (blocks.length > 0) {
        currentLines.push(blocks);
        isImplicitEmptyDefaultSection = false;
      }
      continue;
    }

    if (stripped) {
      currentLines.push([{ chord: "", text: stripped, spaceAfter: true }]);
      isImplicitEmptyDefaultSection = false;
    } else {
      // Linha em branco intencional (quebra de parágrafo)
      if (currentLines.length > 0) {
        const last = currentLines[currentLines.length - 1];
        const isAlreadyEmpty = last && last.length === 1 && !last[0]?.chord && !last[0]?.text && !last[0]?.isTab;
        if (!isAlreadyEmpty) {
          currentLines.push([{ chord: "", text: "", spaceAfter: true }]);
        }
      }
    }
  }

  flushSection();

  if (sections.length === 0) {
    return {
      ok: false,
      error: "Não foi possível montar seções a partir do texto.",
    };
  }

  return { ok: true, data: sections };
}
