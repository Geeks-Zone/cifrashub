import { NextResponse } from "next/server";
import { extractYoutubeIdFromHtml } from "@/lib/parser";

/** Slugs do Cifra Club; evita SSRF / path injection. */
const SLUG_SEGMENT_RE = /^[a-z0-9-]{1,120}$/i;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const artistSlug = searchParams.get("artistSlug")?.trim() ?? "";
  const slug = searchParams.get("slug")?.trim() ?? "";

  if (!SLUG_SEGMENT_RE.test(artistSlug) || !SLUG_SEGMENT_RE.test(slug)) {
    return NextResponse.json(
      { youtubeId: null, error: "Parâmetros inválidos" },
      { status: 400 },
    );
  }

  const pageUrl = `https://www.cifraclub.com.br/${artistSlug}/${slug}/`;

  try {
    const res = await fetch(pageUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(25_000),
    });

    if (!res.ok) {
      return NextResponse.json(
        { youtubeId: null, error: `Cifra Club respondeu ${res.status}` },
        { status: 502 },
      );
    }

    const html = await res.text();
    const youtubeId = extractYoutubeIdFromHtml(html) ?? null;

    return NextResponse.json({ youtubeId });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Falha ao buscar página";
    return NextResponse.json({ youtubeId: null, error: message }, { status: 502 });
  }
}
