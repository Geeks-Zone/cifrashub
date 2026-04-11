import { Loader2 } from "lucide-react";

/**
 * Loading state para a rota /editar (App Router Suspense boundary).
 * Exibido enquanto a página do editor é carregada/hidratada.
 */
export default function EditarLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4 text-muted-foreground">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="text-sm">Carregando editor…</p>
      </div>
    </div>
  );
}
