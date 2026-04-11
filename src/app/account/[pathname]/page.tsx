"use client";

import { AccountView } from "@neondatabase/neon-js/auth/react/ui";
import { useParams } from "next/navigation";

export default function AccountPage() {
  const params = useParams();
  const pathname = params.pathname as string;

  return (
    <div className="min-h-[calc(100vh-4rem)] p-4">
      <AccountView pathname={pathname} />
    </div>
  );
}
