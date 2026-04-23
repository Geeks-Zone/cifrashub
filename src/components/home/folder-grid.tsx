"use client";

import { Folder, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Folder as FolderType } from "@/lib/types";

type FolderGridProps = {
  folders: FolderType[];
  isCreatingFolder: boolean;
  newFolderName: string;
  onNewFolderNameChange: (v: string) => void;
  onStartCreateFolder: () => void;
  onCancelCreateFolder: () => void;
  onSubmitCreateFolder: (e: React.FormEvent) => void;
  onOpenFolder: (folderId: string) => void;
};

export function FolderGrid({
  folders,
  isCreatingFolder,
  newFolderName,
  onNewFolderNameChange,
  onStartCreateFolder,
  onCancelCreateFolder,
  onSubmitCreateFolder,
  onOpenFolder,
}: FolderGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
      {folders.map((folder) => (
        <button
          key={folder.id}
          type="button"
          onClick={() => onOpenFolder(folder.id)}
          className="group/card text-left"
        >
          <Card className="flex h-full flex-col items-start gap-2 border-border/60 bg-card/60 p-4 transition-all duration-200 hover:border-border hover:bg-card">
            <Folder
              className={cn(
                "size-5 transition-colors",
                folder.isDefault || folder.id === "default"
                  ? "text-primary"
                  : "text-muted-foreground group-hover/card:text-foreground/70",
              )}
              fill="currentColor"
              fillOpacity={0.15}
            />
            <h4 className="mt-1 w-full truncate text-[13px] font-semibold text-foreground">
              {folder.title}
            </h4>
            <p className="text-[11px] text-muted-foreground">
              {folder.songs.length} cifras
            </p>
          </Card>
        </button>
      ))}

      {isCreatingFolder ? (
        <Card className="flex min-h-[108px] flex-col justify-between gap-3 border-primary/40 bg-card p-4">
          <form onSubmit={onSubmitCreateFolder} className="flex flex-col gap-3">
            <Input
              autoFocus
              type="text"
              value={newFolderName}
              onChange={(e) => onNewFolderNameChange(e.target.value)}
              placeholder="Nome da pasta..."
              className="border-0 bg-transparent p-0 text-[13px] font-semibold shadow-none focus-visible:ring-0"
            />
            <div className="mt-auto flex w-full gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="flex-1 text-[10px] font-semibold uppercase tracking-wider"
                onClick={onCancelCreateFolder}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                className="flex-1 text-[10px] font-semibold uppercase tracking-wider"
                disabled={!newFolderName.trim()}
              >
                Salvar
              </Button>
            </div>
          </form>
        </Card>
      ) : (
        <button type="button" onClick={onStartCreateFolder} className="text-left">
          <Card className="flex min-h-[108px] flex-col items-center justify-center gap-3 border-dashed border-border/50 bg-transparent p-4 transition-all duration-200 hover:border-border hover:bg-card/40">
            <div className="flex size-8 items-center justify-center rounded-full bg-muted/50 text-muted-foreground transition-colors">
              <Plus className="size-4" />
            </div>
            <span className="text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
              Nova Pasta
            </span>
          </Card>
        </button>
      )}
    </div>
  );
}
