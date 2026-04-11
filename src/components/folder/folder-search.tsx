"use client";

import { Check, Loader2, Plus, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useSearchDebounced } from "@/hooks/use-search";
import type { SearchResultSong, StoredSong } from "@/lib/types";

type FolderSearchProps = {
  query: string;
  onQueryChange: (q: string) => void;
  activeFolderSongs: StoredSong[];
  /** Se não for `null`, indica qual resultado está em importação. */
  folderAddPendingKey: string | null;
  onAddSong: (res: SearchResultSong) => void;
};

export function FolderSearch({
  query,
  onQueryChange,
  activeFolderSongs,
  folderAddPendingKey,
  onAddSong,
}: FolderSearchProps) {
  const { results, isSearching } = useSearchDebounced(query);
  const songResults = results.filter(
    (res): res is SearchResultSong => res.type === "song",
  );
  const showDropdown = query.trim().length >= 2;

  const songKey = (r: SearchResultSong) => `${r.artistSlug}-${r.slug}`;

  return (
    <div className="relative mb-8 w-full">
      <div className="relative flex items-center gap-2 overflow-hidden rounded-2xl border border-border bg-card shadow-lg focus-within:border-primary/50">
        <Search className="absolute left-4 size-[18px] text-muted-foreground" />
        <Input
          type="text"
          placeholder="Pesquisar e adicionar mais cifras..."
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          className="h-12 border-0 bg-transparent pl-12 pr-10 text-sm shadow-none focus-visible:ring-0"
        />
        {isSearching && (
          <Loader2 className="absolute right-4 size-4 animate-spin text-primary" />
        )}
        {query && !isSearching && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="absolute right-2 text-muted-foreground"
            onClick={() => onQueryChange("")}
          >
            <X className="size-4" />
          </Button>
        )}
      </div>

      {showDropdown && (
        <div className="absolute top-full right-0 left-0 z-20 mt-2 overflow-hidden rounded-2xl border border-border bg-popover shadow-2xl">
          <ScrollArea className="max-h-[300px]">
            <div className="flex flex-col gap-0.5 p-2">
              {songResults.length === 0 && !isSearching ? (
                <p className="p-4 text-center text-sm text-muted-foreground">
                  Nenhum resultado encontrado.
                </p>
              ) : (
                songResults.map((res, i) => {
                  const inFolder = activeFolderSongs.some(
                    (s) => s.id === songKey(res),
                  );
                  return (
                    <button
                      key={`${res.slug}-${i}`}
                      type="button"
                      disabled={folderAddPendingKey !== null || inFolder}
                      onClick={() => onAddSong(res)}
                      className="flex w-full items-center justify-between rounded-xl p-3 text-left transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <div className="min-w-0 flex-1 pr-4">
                        <p className="truncate text-sm font-bold text-foreground">
                          {res.title}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {res.artistName}
                        </p>
                      </div>
                      <div
                        className={cn(
                          "flex size-8 shrink-0 items-center justify-center rounded-full transition-colors",
                          inFolder
                            ? "bg-muted text-muted-foreground"
                            : "bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground",
                        )}
                      >
                        {folderAddPendingKey === songKey(res) ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : inFolder ? (
                          <Check className="size-4" />
                        ) : (
                          <Plus className="size-4" />
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
