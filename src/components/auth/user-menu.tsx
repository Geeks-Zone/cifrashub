"use client";

import { LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { signOut, useSession } from "@/hooks/use-session";
import { cn } from "@/lib/utils";
import { LoginButton } from "@/components/auth/login-button";

type UserMenuProps = {
  className?: string;
  triggerClassName?: string;
};

function UserMenu({ className, triggerClassName }: UserMenuProps) {
  const { data: session } = useSession();
  const user = session?.user;

  if (!user) {
    return null;
  }

  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || window.location.origin)
    .replace(/\/+$/, "");

  const initials =
    user.name
      ?.split(/\s+/)
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ?? "?";

  return (
    <div className={cn(className)}>
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            "flex size-9 items-center justify-center rounded-full bg-muted/60 ring-1 ring-border outline-none select-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring",
            triggerClassName,
          )}
          aria-label="Menu da conta"
        >
          <Avatar size="sm" className="size-8">
            <AvatarImage src={user.image ?? undefined} alt={user.name ?? ""} />
            <AvatarFallback className="text-[10px] font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col gap-0.5">
                <p className="text-sm font-medium">{user.name}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="gap-2"
            onClick={() => signOut({ callbackUrl: baseUrl })}
          >
            <LogOut className="size-4" />
            Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

/** Controle único do header: carregando / login / menu. */
export function AuthHeaderControl({ className }: { className?: string }) {
  const { status } = useSession();

  if (status === "loading") {
    return (
      <div
        className={cn(
          "size-9 shrink-0 animate-pulse rounded-full bg-muted/60 ring-1 ring-border",
          className,
        )}
      />
    );
  }

  if (status === "unauthenticated") {
    return <LoginButton compact className={className} />;
  }

  return <UserMenu className={className} />;
}
