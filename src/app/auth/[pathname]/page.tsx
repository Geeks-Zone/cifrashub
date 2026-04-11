"use client";

import { AuthView } from "@neondatabase/neon-js/auth/react/ui";
import { useParams } from "next/navigation";

export default function AuthPage() {
  const params = useParams();
  const pathname = params.pathname as string;

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
      <AuthView pathname={pathname} />
    </div>
  );
}
