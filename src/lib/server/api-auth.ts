import { neonAuth } from "@/lib/auth-server";
import { NextResponse } from "next/server";

export async function requireUserId(): Promise<
  { userId: string } | { error: NextResponse }
> {
  const { data: session } = await neonAuth.getSession();
  const userId = session?.user?.id;
  if (!userId) {
    return {
      error: NextResponse.json({ error: "Não autorizado" }, { status: 401 }),
    };
  }
  return { userId };
}
