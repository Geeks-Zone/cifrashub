import { NextResponse } from "next/server";

const YT_ID_RE = /^[a-zA-Z0-9_-]{11}$/;
const MAX_Q = 180;
const MIN_Q = 2;

type YtSearchItem = {
  id?: { videoId?: string };
  snippet?: { title?: string };
};

type YtSearchResponse = {
  items?: YtSearchItem[];
  error?: { message?: string };
};

function sanitizeQ(raw: string | null): string | null {
  if (raw == null) return null;
  const t = raw.trim().replace(/\s+/g, " ");
  if (t.length < MIN_Q || t.length > MAX_Q) return null;
  return t;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = sanitizeQ(searchParams.get("q"));
  if (!q) {
    return NextResponse.json(
      { videoId: null as string | null, error: "invalid_query" },
      { status: 400 },
    );
  }

  const apiKey = process.env.YOUTUBE_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      {
        videoId: null as string | null,
        error: "missing_api_key",
        message: "YOUTUBE_API_KEY não configurada no servidor.",
      },
      { status: 503 },
    );
  }

  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("type", "video");
  url.searchParams.set("maxResults", "5");
  url.searchParams.set("videoEmbeddable", "true");
  url.searchParams.set("q", q);
  url.searchParams.set("key", apiKey);

  try {
    const res = await fetch(url.toString(), {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(12_000),
    });

    const data = (await res.json()) as YtSearchResponse;

    if (!res.ok) {
      const msg = data.error?.message ?? res.statusText;
      return NextResponse.json(
        { videoId: null as string | null, error: "youtube_api", message: msg },
        { status: 502 },
      );
    }

    const items = data.items ?? [];
    const candidates: { videoId: string; title: string }[] = [];
    for (const it of items) {
      const id = it.id?.videoId?.trim();
      if (id && YT_ID_RE.test(id)) {
        candidates.push({
          videoId: id,
          title: (it.snippet?.title ?? "").trim() || "Vídeo",
        });
      }
    }

    const first = candidates[0];
    const body = first
      ? {
          videoId: first.videoId,
          title: first.title,
          candidates,
        }
      : { videoId: null as string | null, error: "no_results" as const };

    return NextResponse.json(body, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Falha na busca";
    return NextResponse.json(
      { videoId: null as string | null, error: "network", message },
      { status: 502 },
    );
  }
}
