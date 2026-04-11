"use client";

import { Music, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { StoredSong } from "@/lib/types";

type FolderSongCardProps = {
  song: StoredSong;
  onOpen: () => void;
  onRemove: () => void;
};

export function FolderSongCard({ song, onOpen, onRemove }: FolderSongCardProps) {
  return (
    <div className="group relative">
      <button type="button" onClick={onOpen} className="w-full text-left">
        <Card className="flex w-full items-center gap-4 border-border bg-card p-4 transition-colors hover:border-muted-foreground">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
            <Music className="size-5" />
          </div>
          <div className="min-w-0 flex-1 pr-10">
            <h3 className="truncate text-base font-bold text-foreground">
              {song.title}
            </h3>
            <p className="truncate text-sm text-muted-foreground">
              {song.artist}
            </p>
          </div>
        </Card>
      </button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="absolute top-1/2 right-4 z-10 size-8 -translate-y-1/2 rounded-full bg-muted opacity-0 transition-opacity group-hover:opacity-100 hover:bg-destructive/20 hover:text-destructive"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
      >
        <Trash2 className="size-3.5" />
      </Button>
    </div>
  );
}
