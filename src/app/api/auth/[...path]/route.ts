import { neonAuth } from "@/lib/auth-server";

export const { GET, POST, PUT, PATCH, DELETE } = neonAuth.handler();
