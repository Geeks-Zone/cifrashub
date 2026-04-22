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
  const baseUrl =
    (process.env.NEXT_PUBLIC_BASE_URL ||
      (typeof window !== "undefined" ? window.location.origin : "/")
    ).replace(/\/+$/, "");
  return authClient.signIn.social({
    provider,
    callbackURL: baseUrl,
  });
}

export function signOut(options?: { callbackUrl?: string }): void {
  void authClient.signOut().then(() => {
    if (options?.callbackUrl && typeof window !== "undefined") {
      window.location.href = options.callbackUrl;
    }
  });
}
