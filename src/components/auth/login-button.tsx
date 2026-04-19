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
        variant="outline"
        size="sm"
        className={cn(
          "h-9 shrink-0 rounded-full px-3 text-foreground",
          className,
        )}
        title="Entrar com Google"
        aria-label="Entrar com Google"
        onClick={() =>
          void signIn("google").catch((error) => {
            console.error(
              "Failed to initiate Google social login. Please try again or contact support if the issue persists.",
              error,
            );
          })
        }
      >
        <CircleUser className="mr-1.5 size-4" strokeWidth={2} />
        Entrar
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn("rounded-full", className)}
      onClick={() =>
        void signIn("google").catch((error) => {
          console.error(
            "Failed to initiate Google social login. Please try again or contact support if the issue persists.",
            error,
          );
        })
      }
    >
      <CircleUser className="mr-2 size-4" strokeWidth={2} />
      Entrar com Google
    </Button>
  );
}
