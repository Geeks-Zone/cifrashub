"use client";

import { Music, Rows3 } from "lucide-react";
import { SongContent } from "@/components/song/song-content";
import type { ShareSnapshotPayload } from "@/lib/share-payload";

type Props = {
  payload: ShareSnapshotPayload | null;
};

export function PublicShareView({ payload }: Props) {
  if (!payload) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
        <p className="text-destructive">Link inválido ou expirado.</p>
      </div>
    );
  }

  if (payload.type === "arrangement") {
    const s = payload.song;
    return (
      <div className="min-h-screen bg-background px-4 py-10 text-foreground">
        <header className="mx-auto mb-10 max-w-3xl">
          <h1 className="text-3xl font-bold tracking-tight">{s.title}</h1>
          <p className="mt-1 text-lg text-muted-foreground">{s.artist}</p>
          <p className="mt-4 text-xs text-muted-foreground">
            Conteúdo compartilhado (somente leitura).
          </p>
        </header>
        <div className="mx-auto max-w-3xl">
          <SongContent
            songData={s.songData}
            showTabs
            simplified={false}
            effectiveTransposition={s.tone ?? 0}
            fontSizeOffset={0}
            columns={1}
            spacingOffset={0}
            onChordClick={() => {}}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-10 text-foreground">
      <header className="mx-auto mb-8 max-w-3xl">
        <div className="mb-3 flex items-center gap-2 text-primary">
          <Rows3 className="size-6" />
          <span className="text-xs font-semibold tracking-wide uppercase">
            Setlist
          </span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">{payload.title}</h1>
        {payload.description ? (
          <p className="mt-2 text-muted-foreground">{payload.description}</p>
        ) : null}
        <p className="mt-4 text-xs text-muted-foreground">
          Conteúdo compartilhado (somente leitura).
        </p>
      </header>
      <ol className="mx-auto flex max-w-3xl list-decimal flex-col gap-8 pl-5">
        {[...payload.items]
          .sort((a, b) => a.position - b.position)
          .map((it) => (
            <li key={`${it.arrangementId}-${it.position}`} className="pl-2">
              {it.song ? (
                <>
                  <div className="mb-4 flex items-start gap-2">
                    <Music className="mt-1 size-4 shrink-0 text-primary" />
                    <div>
                      <h2 className="text-xl font-semibold">{it.song.title}</h2>
                      <p className="text-sm text-muted-foreground">{it.song.artist}</p>
                      {it.notes ? (
                        <p className="mt-2 text-sm text-muted-foreground">{it.notes}</p>
                      ) : null}
                    </div>
                  </div>
                  <SongContent
                    songData={it.song.songData}
                    showTabs
                    simplified={false}
                    effectiveTransposition={it.song.tone ?? 0}
                    fontSizeOffset={0}
                    columns={1}
                    spacingOffset={0}
                    onChordClick={() => {}}
                  />
                </>
              ) : (
                <p className="text-muted-foreground">Música indisponível no snapshot.</p>
              )}
            </li>
          ))}
      </ol>
    </div>
  );
}
