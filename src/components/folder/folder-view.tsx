"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Bookmark,
  ChevronLeft,
  Folder,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FolderSearch } from "./folder-search";
import { FolderSongCard } from "./folder-song-card";
import { arrangementKey } from "@/lib/stored-song-key";
import type { Folder as FolderType, SearchResultSong, StoredSong } from "@/lib/types";

type FolderViewProps = {
  folder: FolderType;
  folderSearchQuery: string;
  onFolderSearchQueryChange: (q: string) => void;
  folderAddPendingKey: string | null;
  folderError: string | null;
  onDismissFolderError: () => void;
  onAddSongToFolder: (res: SearchResultSong) => void;
  onBack: () => void;
  onDeleteFolder: (folderId: string) => void;
  onOpenSong: (song: StoredSong) => void;
  onRemoveSongFromFolder: (song: StoredSong) => void;
};

export function FolderView({
  folder,
  folderSearchQuery,
  onFolderSearchQueryChange,
  folderAddPendingKey,
  folderError,
  onDismissFolderError,
  onAddSongToFolder,
  onBack,
  onDeleteFolder,
  onOpenSong,
  onRemoveSongFromFolder,
}: FolderViewProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col selection:bg-primary/30">
      <header className="relative z-10 flex items-center justify-between p-4">
        <Button
          type="button"
          variant="ghost"
          className="gap-2 text-muted-foreground"
          onClick={onBack}
        >
          <ChevronLeft className="size-6" />
          <span className="font-bold">Início</span>
        </Button>
        <div className="size-8" />
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-20 animate-in fade-in duration-300">
        <div className="mb-6 flex items-end justify-between gap-4 border-b border-border pb-4">
          <div>
            <h2 className="flex items-center gap-3 text-3xl font-bold text-foreground">
              <Folder
                className="size-7 text-primary"
                fill="currentColor"
                fillOpacity={0.2}
              />
              {folder.name}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {folder.songs.length} músicas salvas offline
            </p>
          </div>
          {!folder.isDefault && folder.id !== "default" && (
            <Button
              type="button"
              variant="ghost"
              className="gap-2 text-muted-foreground hover:text-destructive"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="size-[18px]" />
              <span className="hidden text-sm font-medium sm:inline">
                Apagar Pasta
              </span>
            </Button>
          )}
        </div>

        {folderError && (
          <Alert variant="destructive" className="mb-4 animate-in fade-in">
            <AlertTriangle className="size-4" />
            <AlertTitle className="sr-only">Erro</AlertTitle>
            <AlertDescription className="flex flex-1 items-start gap-2 pr-8">
              <span className="flex-1 text-sm">{folderError}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="shrink-0"
                onClick={onDismissFolderError}
              >
                <X className="size-4" />
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <FolderSearch
          query={folderSearchQuery}
          onQueryChange={onFolderSearchQueryChange}
          activeFolderSongs={folder.songs}
          folderAddPendingKey={folderAddPendingKey}
          onAddSong={onAddSongToFolder}
        />

        {folder.songs.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground">
            <Bookmark className="mx-auto mb-4 size-12 opacity-20" />
            <p>Esta pasta está vazia.</p>
            <p className="mt-2 text-sm">
              Use a barra acima para buscar músicas e salvá-as aqui.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {folder.songs.map((song) => (
              <FolderSongCard
                key={arrangementKey(song)}
                song={song}
                onOpen={() => onOpenSong(song)}
                onRemove={() => onRemoveSongFromFolder(song)}
              />
            ))}
          </div>
        )}
      </main>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar pasta &ldquo;{folder.name}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              Todas as {folder.songs.length} cifras salvas nesta pasta serão
              removidas. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onDeleteFolder(folder.id)}
            >
              Apagar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
