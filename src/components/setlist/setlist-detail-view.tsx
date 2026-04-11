"use client";

import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Link2,
  ListMusic,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { flattenLibrarySongs } from "@/lib/library-flat";
import { arrangementKey } from "@/lib/stored-song-key";
import type {
  Folder,
  SetlistDetailView,
  StoredSong,
} from "@/lib/types";

type SetlistDetailViewProps = {
  detail: SetlistDetailView;
  folders: Folder[];
  recentes: StoredSong[];
  onBack: () => void;
  onOpenSong: (song: StoredSong) => void;
  onAddItem: (arrangementId: string) => void;
  onRemoveItem: (itemId: string) => void;
  onMoveItem: (itemId: string, direction: -1 | 1) => void;
  onShare?: () => void;
  shareBusy?: boolean;
  disabled?: boolean;
};

export function SetlistDetailViewScreen({
  detail,
  folders,
  recentes,
  onBack,
  onOpenSong,
  onAddItem,
  onRemoveItem,
  onMoveItem,
  onShare,
  shareBusy,
  disabled,
}: SetlistDetailViewProps) {
  const library = flattenLibrarySongs(folders, recentes);
  const inSet = new Set(detail.items.map((i) => i.arrangementId));
  const addable = library.filter((s) => !inSet.has(arrangementKey(s)));

  const sortedItems = [...detail.items].sort((a, b) => a.position - b.position);

  return (
    <div className="flex min-h-screen flex-col bg-background selection:bg-primary/30">
      <header className="flex items-center justify-between gap-2 border-b border-border/60 p-4">
        <Button
          type="button"
          variant="ghost"
          className="gap-2 text-muted-foreground"
          onClick={onBack}
        >
          <ArrowLeft className="size-5" />
          Voltar
        </Button>
        {onShare ? (
          <div className="flex gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1"
              disabled={disabled || shareBusy}
              onClick={onShare}
            >
              <Link2 className="size-4" />
              {shareBusy ? "…" : "Link"}
            </Button>
          </div>
        ) : (
          <div className="size-8" />
        )}
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 px-4 pb-24 pt-6">
        <div className="mb-6 flex items-start gap-3">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10">
            <ListMusic className="size-6 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-foreground">{detail.title}</h1>
            {detail.description ? (
              <p className="mt-1 text-sm text-muted-foreground">{detail.description}</p>
            ) : null}
          </div>
        </div>

        <div className="mb-4">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Adicionar da biblioteca
          </label>
          <select
            className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
            defaultValue=""
            disabled={disabled || addable.length === 0}
            onChange={(e) => {
              const v = e.target.value;
              if (v) {
                onAddItem(v);
                e.target.value = "";
              }
            }}
          >
            <option value="">
              {addable.length === 0
                ? "Todas já estão na setlist"
                : "Escolher música…"}
            </option>
            {addable.map((s) => (
              <option key={arrangementKey(s)} value={arrangementKey(s)}>
                {s.title} — {s.artist}
              </option>
            ))}
          </select>
        </div>

        {sortedItems.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">
            Nenhuma música. Adicione da sua biblioteca.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {sortedItems.map((it, idx) => (
              <li
                key={it.itemId}
                className="flex items-stretch gap-1 rounded-xl border border-border/60 bg-card/50 p-2"
              >
                <div className="flex flex-col justify-center gap-0.5 border-r border-border/50 pr-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="size-7"
                    disabled={disabled || idx === 0}
                    onClick={() => onMoveItem(it.itemId, -1)}
                  >
                    <ChevronUp className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="size-7"
                    disabled={disabled || idx === sortedItems.length - 1}
                    onClick={() => onMoveItem(it.itemId, 1)}
                  >
                    <ChevronDown className="size-4" />
                  </Button>
                </div>
                <button
                  type="button"
                  className="min-w-0 flex-1 px-2 text-left"
                  disabled={!it.song}
                  onClick={() => it.song && onOpenSong(it.song)}
                >
                  <p className="truncate font-medium text-foreground">
                    {it.song?.title ?? "(música removida da biblioteca)"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {it.song?.artist ?? it.arrangementId}
                  </p>
                  {it.notes ? (
                    <p className="mt-1 text-xs text-muted-foreground">{it.notes}</p>
                  ) : null}
                </button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                  disabled={disabled}
                  onClick={() => onRemoveItem(it.itemId)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
