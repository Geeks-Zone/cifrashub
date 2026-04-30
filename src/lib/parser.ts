import { classifySection, transposeRootNote } from "./music";
import { isValidYoutubeId } from "./youtube";
import type { LyricBlock, LyricLine, Section, SectionType, StoredSong } from "./types";

/** Evita `import from "crypto"` aqui: o parser roda no cliente e o bundle usa crypto-browserify sem randomUUID. */
function randomUuid(): string {
  const c = globalThis.crypto;
  if (typeof c?.randomUUID === "function") return c.randomUUID();
  const bytes = new Uint8Array(16);
  if (typeof c?.getRandomValues === "function") c.getRandomValues(bytes);
  else for (let i = 0; i < 16; i++) bytes[i] = (Math.random() * 256) | 0;
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const h = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

const CHORD_PATTERN =
  "([A-G][#b]?(?:maj|min|M)?(?:m(?!aj))?(?:\\d{1,2})?(?:sus[24]?|add\\d?|dim|aug)?(?:/[A-G][#b]?)?)\\b";

export function parseChordLinePair(chordLine: string, lyricLine: string): LyricBlock[] {
  const blocks: LyricBlock[] = [];
  const matches = [...chordLine.matchAll(new RegExp(CHORD_PATTERN, "g"))];

  if (matches.length === 0) {
    const text = lyricLine.replace(/\r?\n$/, "");
    if (text.trim() || lyricLine === "") {
      blocks.push({ chord: "", text, spaceAfter: true });
    }
    return blocks;
  }

  const firstIndex = matches[0]?.index ?? 0;
  if (firstIndex > 0) {
    const prefix = lyricLine.slice(0, firstIndex);
    if (prefix.trim()) {
      blocks.push({
        chord: "",
        text: prefix.trimEnd(),
        spaceAfter: /\s+$/.test(prefix) || prefix.length < firstIndex,
      });
    }
  }

  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    if (!m || m.index === undefined) continue;
    const chord = m[1] as string;
    const start = m.index;
    const next = matches[i + 1];
    const end =
      next?.index !== undefined
        ? next.index
        : Math.max(lyricLine.length, start + chord.length);

    const textSegment = start < lyricLine.length ? lyricLine.slice(start, end) : "";
    const textClean = textSegment.trimEnd();
    let spaceAfter = /\s+$/.test(textSegment);
    if (textClean === "" && i < matches.length - 1) spaceAfter = true;

    blocks.push({ chord, text: textClean, spaceAfter });
  }
  return blocks;
}

const CHORD_MARKER_RE = /‹CHORD:([^›]+)›/;
const SECTION_RE = /^\[(.+?)\]/;

const KEY_ROOT_RE = /key:\s*["']([A-G][#b]?)["']/;

/**
 * `key` e `capo` no script da página (ex.: principal + impressão) do Cifra Club.
 */
function extractCifraClubKeyCapo(htmlContent: string): {
  writtenKey?: string;
  capo?: number;
} {
  // 1. Tenta extrair do script JS (key: 'G', capo: 7)
  const blockMatch = htmlContent.match(
    /urlAPI3:\s*["'][^"']+["']([\s\S]{0,3500}?)chords:\s*\[/,
  );
  const block = blockMatch?.[1] ?? htmlContent;
  const keyM = block.match(KEY_ROOT_RE) ?? htmlContent.match(KEY_ROOT_RE);
  const capoM = block.match(/capo:\s*(\d+)/);
  let writtenRaw = keyM?.[1]?.trim();
  let capoRaw = capoM?.[1];

  // 2. Fallback: extrai do HTML visível <div id="cifra_tom">
  //    Ex.: <a ...>D</a> (forma dos acordes no tom de G) Capotraste na 7ª casa
  if (!writtenRaw) {
    const tomBlockM = htmlContent.match(
      /id=["']cifra_tom["'][^>]*>([\s\S]*?)<\/div>/i,
    );
    if (tomBlockM) {
      const tomHtml = tomBlockM[1];
      // Tom principal: conteúdo do <a> ou primeiro texto com nota
      const tomLinkM = tomHtml.match(/<a[^>]*>\s*([A-G][#b♯♭]?m?)\s*<\/a>/i);
      if (tomLinkM) {
        writtenRaw = tomLinkM[1].replace("♯", "#").replace("♭", "b").trim();
      }
      // "forma dos acordes no tom de X" → writtenKey real (o que se toca)
      const formaM = tomHtml.match(/forma\s+dos\s+acordes\s+no\s+tom\s+de\s+([A-G][#b♯♭]?m?)/i);
      if (formaM) {
        writtenRaw = formaM[1].replace("♯", "#").replace("♭", "b").trim();
      }
      // Capotraste na Nª casa
      if (capoRaw === undefined) {
        const capoHtmlM = tomHtml.match(/[Cc]apotraste\s+na\s+(\d+)/);
        if (capoHtmlM) capoRaw = capoHtmlM[1];
      }
    }
  }

  if (!writtenRaw && capoRaw === undefined) return {};
  const capo =
    capoRaw !== undefined
      ? Math.min(24, Math.max(0, parseInt(capoRaw, 10)))
      : undefined;
  return {
    ...(writtenRaw ? { writtenKey: writtenRaw } : {}),
    ...(capo !== undefined ? { capo } : {}),
  };
}

/**
 * Extrai o ID do vídeo associado à cifra no Cifra Club.
 * Prioridade: `youtubeId` (curadoria do site) → URLs de embed/watch → `videoId` por último
 * (na página costumam divergir: `videoId` ≠ vídeo oficial da cifra).
 */
export function extractYoutubeIdFromHtml(htmlContent: string): string | undefined {
  const tryPattern = (pattern: RegExp, haystack: string): string | undefined => {
    const match = haystack.match(pattern);
    const maybeId = match?.[1]?.trim();
    return isValidYoutubeId(maybeId) ? maybeId : undefined;
  };

  const curatedPatterns: RegExp[] = [
    /["']youtubeId["']\s*:\s*["']([a-zA-Z0-9_-]{11})["']/,
    /youtubeId\s*:\s*["']([a-zA-Z0-9_-]{11})["']/,
  ];

  for (const pattern of curatedPatterns) {
    const id = tryPattern(pattern, htmlContent);
    if (id) return id;
  }

  const urlPatterns: RegExp[] = [
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube-nocookie\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /data-video(?:id)?=["']([a-zA-Z0-9_-]{11})["']/i,
  ];

  for (const pattern of urlPatterns) {
    const id = tryPattern(pattern, htmlContent);
    if (id) return id;
  }

  const ariaCurated = tryPattern(
    /aria-label=["']https?:\/\/www\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    htmlContent,
  );
  if (ariaCurated) return ariaCurated;

  // Fallback em DOM (somente no browser — rotas Node/API usam só regex acima).
  if (typeof DOMParser !== "undefined") {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, "text/html");

    const iframeSrc =
      doc.querySelector("iframe[src*='youtube']")?.getAttribute("src") ?? "";
    const iframeEmbedMatch = iframeSrc.match(/embed\/([a-zA-Z0-9_-]{11})/);
    if (isValidYoutubeId(iframeEmbedMatch?.[1])) return iframeEmbedMatch[1];
    const iframeWatchMatch = iframeSrc.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
    if (isValidYoutubeId(iframeWatchMatch?.[1])) return iframeWatchMatch[1];

    const watchHref =
      doc
        .querySelector("a[href*='youtube.com/watch?v='], a[aria-label*='youtube.com/watch?v=']")
        ?.getAttribute("href") ??
      doc
        .querySelector("a[href*='youtube.com/watch?v='], a[aria-label*='youtube.com/watch?v=']")
        ?.getAttribute("aria-label") ??
      "";
    const hrefMatch = watchHref.match(/v=([a-zA-Z0-9_-]{11})/);
    if (isValidYoutubeId(hrefMatch?.[1])) return hrefMatch[1];
  }

  const fallbackVideoIdPatterns: RegExp[] = [
    /["']videoId["']\s*:\s*["']([a-zA-Z0-9_-]{11})["']/,
    /videoId\s*:\s*["']([a-zA-Z0-9_-]{11})["']/,
  ];

  for (const pattern of fallbackVideoIdPatterns) {
    const id = tryPattern(pattern, htmlContent);
    if (id) return id;
  }

  return undefined;
}

function parseHtmlCifra(htmlContent: string): Section[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, "text/html");

  doc.querySelectorAll("br").forEach((br) => br.replaceWith("\n"));
  doc.querySelectorAll("b").forEach((el) => {
    el.replaceWith(`‹CHORD:${el.textContent ?? ""}›`);
  });
  doc.querySelectorAll("span.cnt, span.tablatura").forEach((el) => {
    const tabbed = (el.textContent ?? "")
      .split("\n")
      .map((l) => "‹TAB_LINE›" + l)
      .join("\n");
    el.replaceWith(tabbed);
  });

  const lines = (doc.body.textContent ?? "").split("\n");
  const sections: Section[] = [];
  let currentLabel = "[Verso]";
  let currentType: SectionType = "verse";
  let currentLines: LyricLine[] = [];

  const flushSection = () => {
    if (currentLines.length > 0) {
      sections.push({
        type: currentType,
        label: currentLabel,
        content: [...currentLines],
      });
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const stripped = line.trim();

    const secMatch = stripped.match(SECTION_RE);
    if (
      secMatch &&
      !CHORD_MARKER_RE.test(line) &&
      !line.includes("‹TAB_LINE›")
    ) {
      flushSection();
      currentLines = [];
      currentLabel = stripped;
      currentType = classifySection(secMatch[1] ?? "");
      continue;
    }

    if (
      line.includes("‹TAB_LINE›") ||
      /-{4,}/.test(stripped) ||
      /^[eBGDAE1-6]?\|.*-{2,}/i.test(stripped)
    ) {
      const tabText = line
        .replace(/‹TAB_LINE›/g, "")
        .replace(/\s+$/, "");
      currentLines.push([
        {
          chord: "",
          text: tabText,
          isTab: true,
          spaceAfter: true,
        },
      ]);
      continue;
    }

    if (CHORD_MARKER_RE.test(line)) {
      const chordLineClean = line;
      let lyricLine = "";
      const nextLine = lines[i + 1];
      if (
        i + 1 < lines.length &&
        nextLine !== undefined &&
        !CHORD_MARKER_RE.test(nextLine) &&
        !SECTION_RE.test(nextLine.trim()) &&
        !nextLine.includes("‹TAB_LINE›")
      ) {
        lyricLine = nextLine;
        i++;
      }
      const blocks = parseChordLinePair(
        chordLineClean.replace(/‹CHORD:([^›]+)›/g, "$1"),
        lyricLine,
      );
      if (blocks.length > 0) currentLines.push(blocks);
      continue;
    }

    if (stripped) {
      currentLines.push([{ chord: "", text: stripped, spaceAfter: true }]);
    }
  }
  flushSection();
  return sections;
}

export function processHtmlAndExtract(
  htmlContent: string,
  songId: string,
  title: string,
  artistName: string,
  artistSlug: string,
  slug: string,
): StoredSong {
  const youtubeId = extractYoutubeIdFromHtml(htmlContent);
  const { writtenKey, capo: parsedCapo } = extractCifraClubKeyCapo(htmlContent);
  let cifraWrittenKey: string | undefined;
  let cifraCapo: number | undefined;
  let cifraSoundingKey: string | undefined;
  if (writtenKey) cifraWrittenKey = writtenKey;
  if (parsedCapo !== undefined) cifraCapo = parsedCapo;
  if (writtenKey && parsedCapo !== undefined) {
    cifraSoundingKey = transposeRootNote(writtenKey, parsedCapo);
  } else if (writtenKey) {
    cifraSoundingKey = transposeRootNote(writtenKey, 0);
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, "text/html");

  let extractedTitle = doc.querySelector("h1")?.textContent?.trim();
  let extractedArtist = doc.querySelector("h2")?.textContent?.trim();
  
  if (!extractedTitle || !extractedArtist) {
    const titleTag = doc.querySelector("title")?.textContent;
    if (titleTag && titleTag.includes(" - ")) {
      const parts = titleTag.split(" - ");
      extractedTitle = extractedTitle || parts[0]?.trim();
      extractedArtist = extractedArtist || parts[1]?.trim();
    }
  }

  extractedTitle = extractedTitle || title || slug.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  extractedArtist = extractedArtist || artistName || artistSlug.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

  let contentNode: Element | null =
    doc.querySelector("#cifra_conteudo") ??
    doc.querySelector(".g-fix pre") ??
    doc.querySelector(".cifra_cnt pre") ??
    doc.querySelector(".cifra_cnt");

  if (!contentNode) {
    const preElements = Array.from(doc.querySelectorAll("pre"));
    if (preElements.length > 0) {
      contentNode = preElements.sort(
        (a, b) => (b.textContent ?? "").length - (a.textContent ?? "").length,
      )[0]!;
    }
  }
  if (!contentNode || (contentNode.textContent ?? "").trim().length < 20) {
    throw new Error("Cifra indisponível neste formato.");
  }

  const parsedSections = parseHtmlCifra(contentNode.outerHTML);
  if (parsedSections.length > 0) {
    return {
      id: songId,
      arrangementId: randomUuid(),
      title: extractedTitle,
      artist: extractedArtist,
      artistSlug,
      slug,
      sourceArtistSlug: artistSlug,
      sourceSlug: slug,
      youtubeId,
      songData: parsedSections,
      cifraWrittenKey,
      cifraSoundingKey,
      cifraCapo,
    };
  }
  throw new Error("Erro ao processar cifra.");
}
