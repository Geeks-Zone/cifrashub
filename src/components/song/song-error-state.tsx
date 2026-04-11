import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

/**
 * Estado de erro de parsing da cifra.
 * Extraído do song-view.tsx para reutilização e testabilidade.
 */
export function SongErrorState({ error }: { error: string }) {
  return (
    <Alert variant="destructive" className="no-print">
      <AlertTriangle className="size-5" />
      <AlertTitle>Ops, algo falhou!</AlertTitle>
      <AlertDescription className="text-sm opacity-90">{error}</AlertDescription>
    </Alert>
  );
}
