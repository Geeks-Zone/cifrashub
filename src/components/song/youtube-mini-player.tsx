"use client";

import { memo, useEffect, useRef, useState } from "react";
import { Loader2, X } from "lucide-react";

type YoutubeMiniPlayerProps = {
  open: boolean;
  onClose: () => void;
  embedUrl: string | null;
  isParsing: boolean;
  parseError: string | null;
  fallbackSearchQuery: string;
  onVideoResolved?: (videoId: string) => void;
  songId: string;
};

export const YoutubeMiniPlayer = memo(function YoutubeMiniPlayer({
  open,
  onClose,
  embedUrl,
  isParsing,
  parseError,
  fallbackSearchQuery,
  onVideoResolved,
  songId,
}: YoutubeMiniPlayerProps) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const panelRef = useRef<HTMLElement | null>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  const [fallbackLoading, setFallbackLoading] = useState(false);
  const [fallbackFailed, setFallbackFailed] = useState(false);
  const [retryToken, setRetryToken] = useState(0);

  // Drag logic
  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e: PointerEvent) => {
      const panel = panelRef.current;
      if (!panel) return;
      const rect = panel.getBoundingClientRect();
      const maxX = Math.max(0, window.innerWidth - rect.width);
      const maxY = Math.max(0, window.innerHeight - rect.height);
      setPos({
        x: Math.min(maxX, Math.max(0, e.clientX - dragOffsetRef.current.x)),
        y: Math.min(maxY, Math.max(0, e.clientY - dragOffsetRef.current.y)),
      });
    };
    const onUp = () => setIsDragging(false);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [isDragging]);

  // Reset state when closed or song changes
  useEffect(() => {
    if (!open) {
      setFallbackLoading(false);
      setFallbackFailed(false);
      setRetryToken(0);
      setPos(null);
    }
  }, [open]);

  // YouTube fallback search
  useEffect(() => {
    if (!open || embedUrl || isParsing || !onVideoResolved) return;

    let cancelled = false;
    setFallbackLoading(true);
    setFallbackFailed(false);

    void (async () => {
      try {
        const res = await fetch(
          `/api/youtube-search?q=${encodeURIComponent(fallbackSearchQuery)}`,
        );
        const data = (await res.json()) as { videoId?: string | null; error?: string };
        if (cancelled) return;
        const id = typeof data.videoId === "string" ? data.videoId.trim() : "";
        if (id && /^[a-zA-Z0-9_-]{11}$/.test(id)) {
          onVideoResolved(id);
        } else {
          setFallbackFailed(true);
        }
      } catch {
        if (!cancelled) setFallbackFailed(true);
      } finally {
        if (!cancelled) setFallbackLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [open, embedUrl, isParsing, fallbackSearchQuery, songId, retryToken, onVideoResolved]);

  if (!open) return null;

  const shouldSearch = open && Boolean(onVideoResolved) && !embedUrl && !isParsing;
  const showSearchSpinner = shouldSearch && (!fallbackFailed || fallbackLoading);

  const handlePointerDown = (e: React.PointerEvent) => {
    const panel = panelRef.current;
    if (!panel) return;
    const rect = panel.getBoundingClientRect();
    dragOffsetRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    setPos({ x: rect.left, y: rect.top });
    setIsDragging(true);
  };

  return (
    <section
      ref={panelRef}
      className="no-print fixed z-40 w-[min(82vw,300px)] overflow-hidden rounded-xl border border-border bg-card shadow-2xl"
      style={pos ? { left: pos.x, top: pos.y } : { right: 12, bottom: 12 }}
    >
      <div
        className="flex cursor-grab touch-none items-center justify-between border-b border-border px-2.5 py-1.5 active:cursor-grabbing"
        onPointerDown={handlePointerDown}
      >
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          YouTube
        </p>
        <button
          type="button"
          className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          onClick={onClose}
          aria-label="Fechar mini player"
        >
          <X className="size-4" />
        </button>
      </div>
      <div className="aspect-video w-full bg-black">
        {isParsing ? (
          <MiniPlayerMessage icon={<Loader2 className="size-7 animate-spin text-muted-foreground" />}>
            Carregando vídeo junto com a cifra…
          </MiniPlayerMessage>
        ) : embedUrl ? (
          <iframe
            className="h-full w-full"
            src={embedUrl}
            title="Mini player do YouTube"
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        ) : showSearchSpinner ? (
          <MiniPlayerMessage icon={<Loader2 className="size-7 animate-spin text-muted-foreground" />}>
            Buscando vídeo no YouTube…
          </MiniPlayerMessage>
        ) : (
          <MiniPlayerMessage>
            <p className="text-xs text-muted-foreground">
              {parseError
                ? "Não foi possível carregar a cifra. Você ainda pode buscar o áudio no YouTube."
                : fallbackFailed
                  ? "Não achamos um vídeo automático para tocar aqui. Tente de novo ou abra a busca no YouTube."
                  : "Não encontramos o vídeo associado a esta cifra no Cifra Club."}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {fallbackFailed && (
                <button
                  type="button"
                  className="text-xs font-medium text-primary underline-offset-4 hover:underline"
                  onClick={() => setRetryToken((t) => t + 1)}
                >
                  Tentar de novo
                </button>
              )}
              <a
                href={`https://www.youtube.com/results?search_query=${encodeURIComponent(fallbackSearchQuery)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-primary underline-offset-4 hover:underline"
              >
                Abrir busca no YouTube
              </a>
            </div>
          </MiniPlayerMessage>
        )}
      </div>
    </section>
  );
});

function MiniPlayerMessage({
  icon,
  children,
}: {
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full min-h-[140px] flex-col items-center justify-center gap-2 px-3 text-center">
      {icon}
      {children}
    </div>
  );
}
