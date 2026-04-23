"use client";

import { authClient } from "@/lib/auth";

/** Compatível com o formato usado no app (loading | authenticated | unauthenticated). */
export function useSession() {
  const { data, isPending, error, refetch } = authClient.useSession();

  if (isPending) {
    return {
      data: null,
      status: "loading" as const,
      update: refetch,
    };
  }

  if (data?.user) {
    return {
      data: {
        user: {
          id: data.user.id,
          name: data.user.name,
          email: data.user.email,
          image: data.user.image ?? null,
        },
      },
      status: "authenticated" as const,
      update: refetch,
    };
  }

  return {
    data: null,
    status: "unauthenticated" as const,
    update: refetch,
    error,
  };
}

export function signIn(
  provider: "google",
): ReturnType<typeof authClient.signIn.social> {
  const callbackURL =
    typeof window !== "undefined"
      ? `${window.location.pathname}${window.location.search}${window.location.hash}` || "/"
      : "/";

  return authClient.signIn.social({
    provider,
    callbackURL,
  });
}

export async function signOut(options?: { callbackUrl?: string }): Promise<void> {
  try {
    await authClient.signOut();
  } catch (error) {
    console.error("Sign out failed:", error);
  } finally {
    if (options?.callbackUrl && typeof window !== "undefined") {
      window.location.replace(options.callbackUrl);
    } else if (typeof window !== "undefined") {
      window.location.reload();
    }
  }
}
