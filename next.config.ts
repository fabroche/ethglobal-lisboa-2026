import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Imagen Docker mínima para Dokploy (ver Dockerfile).
  output: "standalone",
  // Fija la raíz del workspace (evita que Turbopack infiera mal la raíz si hay
  // un package-lock.json suelto en el HOME).
  turbopack: { root: import.meta.dirname },

  // Hosts allowed to load dev assets and the HMR socket.
  //
  // WHY: the dev server binds 0.0.0.0 so a phone can scan the join QR (S3.6), but
  // reaching it by LAN address made the Turbopack HMR WebSocket fail its handshake,
  // and that stops the page hydrating at all. The visible symptom is nothing to do
  // with sockets: buttons do nothing, and the create form falls back to a native
  // GET submit (`/create?deadline=…`) because there is no onSubmit to intercept it.
  //
  // Production is unaffected — verified: the same LAN address works against
  // `next build`. This is a dev-only fix for a dev-only failure.
  allowedDevOrigins: ["10.1.1.167", "localhost", "127.0.0.1"],

  experimental: {
    // Server Actions con payloads algo mayores (subir CSV/reportes, etc.).
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
};

export default nextConfig;
