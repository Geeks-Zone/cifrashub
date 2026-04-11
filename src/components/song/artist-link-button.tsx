import { ListMusic } from "lucide-react";
import { Button } from "@/components/ui/button";

type ArtistLinkVariant = "header" | "inline";

interface ArtistLinkButtonProps {
  onClick: () => void;
  /** "header" = botão compacto para área do header; "inline" = tag/pill para conteúdo. */
  variant?: ArtistLinkVariant;
}

/**
 * Botão unificado "Ver músicas do artista".
 * Consolida 3 instâncias duplicadas com markup inconsistente no app.
 */
export function ArtistLinkButton({
  onClick,
  variant = "inline",
}: ArtistLinkButtonProps) {
  if (variant === "header") {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-6 shrink-0 rounded-md px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
        onClick={onClick}
        title="Ver todas as músicas do artista"
      >
        <ListMusic className="mr-1 size-3" />
        Músicas
      </Button>
    );
  }

  return (
    <button
      type="button"
      className="inline-flex shrink-0 items-center rounded-md border border-border px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      onClick={onClick}
    >
      Ver músicas do artista
    </button>
  );
}
