"use client";

import { useState } from "react";
import { Share, X, Download, MoreHorizontal } from "lucide-react";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const DISMISSED_KEY = "pwa-install-dismissed";

export function InstallAppBanner() {
  const { canPrompt, isIos, isInstalled, promptInstall } = usePwaInstall();
  const [dismissed, setDismissed] = useState(
    () => typeof window === "undefined" || localStorage.getItem(DISMISSED_KEY) === "1",
  );
  const [iosDialogOpen, setIosDialogOpen] = useState(false);

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "1");
    setDismissed(true);
  };

  const handleInstall = async () => {
    await promptInstall();
    dismiss();
  };

  const visible = !isInstalled && !dismissed && (canPrompt || isIos);

  if (!visible) return null;

  return (
    <>
      <div className="mt-3 flex w-full items-center gap-3 rounded-xl border border-border bg-muted/40 p-3 text-sm md:hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo-mark.png"
          alt=""
          aria-hidden
          className="size-10 shrink-0 rounded-xl object-contain"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="font-semibold leading-tight">Instalar CifrasHub</p>
          <p className="text-xs text-muted-foreground">
            Acesso rápido • Funciona offline
          </p>
        </div>
        {isIos ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIosDialogOpen(true)}
            className="shrink-0"
          >
            Como instalar
          </Button>
        ) : (
          <Button size="sm" onClick={handleInstall} className="shrink-0">
            <Download />
            Instalar
          </Button>
        )}
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={dismiss}
          aria-label="Fechar"
          className="shrink-0 text-muted-foreground"
        >
          <X />
        </Button>
      </div>

      <Dialog open={iosDialogOpen} onOpenChange={setIosDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Instalar no iPhone / iPad</DialogTitle>
            <DialogDescription>
              Siga os passos abaixo no Safari para adicionar o app à sua tela de
              início.
            </DialogDescription>
          </DialogHeader>
          <ol className="flex flex-col gap-4 text-sm">
            <li className="flex items-start gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                1
              </span>
              <span>
                Toque no ícone de{" "}
                <strong className="inline-flex items-center gap-1">
                  Compartilhar{" "}
                  <Share className="inline size-4 align-text-bottom" />
                </strong>{" "}
                na barra inferior do Safari.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                2
              </span>
              <span>
                Role para baixo e toque em{" "}
                <strong>&quot;Adicionar à Tela de Início&quot;</strong>.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                3
              </span>
              <span>
                Confirme tocando em <strong>&quot;Adicionar&quot;</strong> no canto
                superior direito.
              </span>
            </li>
          </ol>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <MoreHorizontal className="size-3.5" />
            No iPad, o botão de compartilhar fica na barra superior.
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
