"use client";

import { Bookmark, Guitar, Loader2 } from "lucide-react";
import { AuthHeaderControl } from "@/components/auth/user-menu";
import { SearchBar } from "./search-bar";
import { FolderGrid } from "./folder-grid";
import { RecentList } from "./recent-list";
import { SetlistsHomeSection } from "@/components/setlist/setlists-home-section";
import { useSearchDebounced } from "@/hooks/use-search";
import type {
  Folder,
  SearchResultArtist,
  SearchResultSong,
  SetlistSummary,
  StoredSong,
} from "@/lib/types";

type HomeViewProps = {
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  onSelectSearchResult: (res: SearchResultSong) => void;
  onSelectArtistResult: (artist: SearchResultArtist) => void;
  folders: Folder[];
  isCreatingFolder: boolean;
  newFolderName: string;
  onNewFolderNameChange: (v: string) => void;
  onStartCreateFolder: () => void;
  onCancelCreateFolder: () => void;
  onSubmitCreateFolder: (e: React.FormEvent) => void;
  onOpenFolder: (folderId: string) => void;
  recentes: StoredSong[];
  onSelectRecent: (song: StoredSong) => void;
  onRemoveRecent: (song: StoredSong) => void;
  onClearRecentes: () => void;
  setlists: SetlistSummary[];
  onCreateSetlist: (title: string) => void;
  onOpenSetlist: (id: string) => void;
  onDeleteSetlist: (id: string) => void;
  /** True enquanto a biblioteca está sendo carregada do servidor (usuário autenticado). */
  isLoadingLibrary?: boolean;
};

export function HomeView({
  searchQuery,
  onSearchQueryChange,
  onSelectSearchResult,
  onSelectArtistResult,
  folders,
  isCreatingFolder,
  newFolderName,
  onNewFolderNameChange,
  onStartCreateFolder,
  onCancelCreateFolder,
  onSubmitCreateFolder,
  onOpenFolder,
  recentes,
  onSelectRecent,
  onRemoveRecent,
  onClearRecentes,
  setlists,
  onCreateSetlist,
  onOpenSetlist,
  onDeleteSetlist,
  isLoadingLibrary = false,
}: HomeViewProps) {
  const { results, isSearching } = useSearchDebounced(searchQuery);

  return (
    <div className="flex min-h-screen flex-col bg-background selection:bg-primary/30">
      <header className="relative z-10 flex w-full items-center justify-end p-5">
        <AuthHeaderControl />
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center px-5 pt-12 pb-24">
        <div className="mb-14 flex w-full flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="mb-10 flex items-center gap-4">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
              <Guitar className="size-8 text-primary" />
            </div>
            <h1 className="text-5xl font-extrabold tracking-tight text-foreground md:text-6xl">
              Cifras<span className="text-primary">Pro</span>
            </h1>
          </div>
          <SearchBar
            value={searchQuery}
            onChange={onSearchQueryChange}
            results={results}
            isSearching={isSearching}
            onSelect={onSelectSearchResult}
            onSelectArtist={onSelectArtistResult}
          />
        </div>

        {!searchQuery && (
          <div className="flex w-full flex-col gap-12 animate-in fade-in fill-mode-both delay-150 duration-700">
            {isLoadingLibrary ? (
              <div className="flex flex-col items-center gap-4 py-16 text-muted-foreground">
                <Loader2 className="size-6 animate-spin text-primary" />
                <p className="text-sm">Carregando biblioteca…</p>
              </div>
            ) : (
              <>
                <section className="flex flex-col gap-5">
                  <h3 className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.15em] text-muted-foreground uppercase">
                    <Bookmark className="size-3.5" />
                    Minhas Pastas
                  </h3>
                  <FolderGrid
                    folders={folders}
                    isCreatingFolder={isCreatingFolder}
                    newFolderName={newFolderName}
                    onNewFolderNameChange={onNewFolderNameChange}
                    onStartCreateFolder={onStartCreateFolder}
                    onCancelCreateFolder={onCancelCreateFolder}
                    onSubmitCreateFolder={onSubmitCreateFolder}
                    onOpenFolder={onOpenFolder}
                  />
                </section>
                <SetlistsHomeSection
                  setlists={setlists}
                  onCreate={onCreateSetlist}
                  onOpen={onOpenSetlist}
                  onDelete={onDeleteSetlist}
                />
                <RecentList
                  recentes={recentes}
                  onSelect={onSelectRecent}
                  onRemove={onRemoveRecent}
                  onClearAll={onClearRecentes}
                />
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
