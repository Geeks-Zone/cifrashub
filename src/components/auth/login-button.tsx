"use client";

import { LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signIn } from "@/hooks/use-session";
import { cn } from "@/lib/utils";

type LoginButtonProps = {
  className?: string;
  /** Ícone compacto (cabe no header ao lado dos controles). */
  compact?: boolean;
};

export function LoginButton({ className, compact }: LoginButtonProps) {
  if (compact) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn(
          "size-9 shrink-0 rounded-full bg-muted/60 text-muted-foreground ring-1 ring-border hover:bg-muted hover:text-foreground",
          className,
        )}
        title="Entrar com Google"
        onClick={() => signIn("google")}
      >
        <LogIn className="size-4" />
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn("rounded-full", className)}
      onClick={() => signIn("google")}
    >
      <LogIn className="mr-2 size-4" />
      Entrar com Google
    </Button>
  );
}
