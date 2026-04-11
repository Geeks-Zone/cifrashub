"use client";

import { CircleUser } from "lucide-react";
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
        aria-label="Entrar com Google"
        onClick={() => signIn("google")}
      >
        <CircleUser className="size-4" strokeWidth={2} />
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
      <CircleUser className="mr-2 size-4" strokeWidth={2} />
      Entrar com Google
    </Button>
  );
}
