import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { neonAuth } from "@/lib/auth-server";

export async function requireUserId(): Promise<
  { userId: string } | { error: NextResponse }
> {
  const { data: session } = await neonAuth.getSession();
  const userId = session?.user?.id;

  if (!userId) {
    return {
      error: NextResponse.json({ error: "Nao autorizado" }, { status: 401 }),
    };
  }

  // Backward compatibility for databases that still have legacy foreign keys
  // from app tables to the local `user` table while auth comes from Neon Auth.
  await db
    .insert(users)
    .values({
      id: userId,
      name: session.user.name ?? null,
      email: session.user.email ?? null,
      image: session.user.image ?? null,
    })
    .onConflictDoUpdate({
      target: users.id,
      set: {
        name: session.user.name ?? null,
        email: session.user.email ?? null,
        image: session.user.image ?? null,
      },
    });

  return { userId };
}
