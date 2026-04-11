"use client";

import { Minimize } from "lucide-react";
import { Button } from "@/components/ui/button";

type ZenExitButtonProps = {
  onExit: () => void;
};

export function ZenExitButton({ onExit }: ZenExitButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      size="icon-lg"
      className="no-print fixed top-4 right-4 z-50 size-12 rounded-full border-border bg-background/50 backdrop-blur-sm"
      onClick={onExit}
      title="Sair do modo palco"
    >
      <Minimize className="size-5" />
    </Button>
  );
}
