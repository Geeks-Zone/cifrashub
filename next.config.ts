import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  experimental: {
    /** `lucide-react` aqui + Turbopack em dev pode gerar "module factory is not available" em ícones após HMR. */
    optimizePackageImports: ["@neondatabase/neon-js"],
  },
};

export default nextConfig;
