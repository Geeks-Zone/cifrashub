function isCloudflareBlock(text: string): boolean {
  return (
    text.includes("cf-browser-verification") ||
    text.includes("Just a moment...") ||
    text.includes("Attention Required!")
  );
}

async function fetchWithProxies(
  url: string,
  signal?: AbortSignal,
): Promise<string | null> {
  try {
    const directRes = await fetch(url, { signal });
    if (directRes.ok) {
      const text = await directRes.text();
      if (!isCloudflareBlock(text)) return text;
    }
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw e;
  }

  const encodedUrl = encodeURIComponent(url);
  const proxies = [
    `https://api.codetabs.com/v1/proxy?quest=${encodedUrl}`,
    `https://api.allorigins.win/raw?url=${encodedUrl}`,
    `https://corsproxy.io/?${encodedUrl}`,
    `https://thingproxy.freeboard.io/fetch/${encodeURI(url)}`,
    `https://api.allorigins.win/get?url=${encodedUrl}`,
  ];

  for (const proxy of proxies) {
    signal?.throwIfAborted();
    try {
      const res = await fetch(proxy, { cache: "no-store", signal });
      if (!res.ok) continue;
      let dataText = await res.text();

      if (proxy.includes("/get?url=")) {
        try {
          dataText = JSON.parse(dataText).contents as string;
        } catch {
          continue;
        }
      }

      if (dataText && !isCloudflareBlock(dataText)) {
        return dataText;
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") throw e;
    }
  }
  return null;
}

const PRINT_URL = (artistSlug: string, slug: string) =>
  `https://www.cifraclub.com.br/${artistSlug}/${slug}/imprimir.html`;
const PAGE_URL = (artistSlug: string, slug: string) =>
  `https://www.cifraclub.com.br/${artistSlug}/${slug}/`;

export async function fetchChordsHtml(
  artistSlug: string,
  slug: string,
  signal?: AbortSignal,
): Promise<string> {
  /** Impressão costuma ter o `<pre>` da cifra de forma mais estável para o parser. */
  const urlsToTry = [PRINT_URL(artistSlug, slug), PAGE_URL(artistSlug, slug)];

  let html: string | null = null;
  for (const url of urlsToTry) {
    signal?.throwIfAborted();
    html = await fetchWithProxies(url, signal);
    if (html) break;
  }

  if (!html) {
    throw new Error(
      "Os servidores proxy públicos estão temporariamente congestionados. Dica: ative a extensão 'Allow CORS' no Chrome.",
    );
  }
  return html;
}
