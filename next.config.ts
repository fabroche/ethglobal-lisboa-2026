import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Imagen Docker mínima para Dokploy (ver Dockerfile).
  output: "standalone",
  // Fija la raíz del workspace (evita que Turbopack infiera mal la raíz si hay
  // un package-lock.json suelto en el HOME).
  turbopack: { root: import.meta.dirname },
  experimental: {
    // Server Actions con payloads algo mayores (subir CSV/reportes, etc.).
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
};

export default nextConfig;
