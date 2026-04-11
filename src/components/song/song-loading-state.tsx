import { Loader2 } from "lucide-react";

/**
 * Estado de carregamento da cifra (parsing em andamento).
 * Extraído do song-view.tsx para reutilização e testabilidade.
 */
export function SongLoadingState() {
  return (
    <div className="no-print flex flex-col items-center justify-center gap-5 py-24 text-muted-foreground">
      <Loader2 className="size-9 animate-spin text-primary" />
      <p className="animate-pulse text-sm font-medium">
        A afinar as cordas e preparar a cifra…
      </p>
    </div>
  );
}
