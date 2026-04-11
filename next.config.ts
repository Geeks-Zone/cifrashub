import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "@neondatabase/neon-js",
    ],
  },
};

export default nextConfig;
