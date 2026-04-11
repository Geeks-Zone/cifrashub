"use client";

import { useState } from "react";
import { ListMusic, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SetlistSummary } from "@/lib/types";

type SetlistsHomeSectionProps = {
  setlists: SetlistSummary[];
  onCreate: (title: string) => void;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  disabled?: boolean;
};

export function SetlistsHomeSection({
  setlists,
  onCreate,
  onOpen,
  onDelete,
  disabled,
}: SetlistsHomeSectionProps) {
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);

  return (
    <section className="flex w-full flex-col gap-4">
      <h3 className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.15em] text-muted-foreground uppercase">
        <ListMusic className="size-3.5 shrink-0" />
        Setlists
      </h3>

      {creating ? (
        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            const t = title.trim();
            if (!t || disabled) return;
            onCreate(t);
            setTitle("");
            setCreating(false);
          }}
        >
          <Input
            placeholder="Nome da setlist"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="flex-1"
          />
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={disabled || !title.trim()}>
              Criar
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setCreating(false);
                setTitle("");
              }}
            >
              Cancelar
            </Button>
          </div>
        </form>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-fit gap-2"
          disabled={disabled}
          onClick={() => setCreating(true)}
        >
          <Plus className="size-4" />
          Nova setlist
        </Button>
      )}

      {setlists.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhuma setlist ainda. Crie uma para montar o repertório do show.
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {setlists.map((sl) => (
            <li
              key={sl.id}
              className="flex items-center gap-1 rounded-xl border border-border/60 bg-card/40 px-2 py-1"
            >
              <button
                type="button"
                className="min-w-0 flex-1 truncate py-2 text-left text-sm font-medium text-foreground hover:underline"
                onClick={() => onOpen(sl.id)}
              >
                {sl.title}
              </button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="shrink-0 text-muted-foreground hover:text-destructive"
                title="Remover setlist"
                disabled={disabled}
                onClick={() => onDelete(sl.id)}
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
