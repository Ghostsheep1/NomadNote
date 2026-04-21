/** @type {import('next').NextConfig} */
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(fileURLToPath(import.meta.url));
const isStaticExport = process.env.NEXT_PUBLIC_STATIC_EXPORT === "1";

const nextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: projectRoot,
  },
  ...(isStaticExport
    ? {
        output: "export",
        trailingSlash: true,
      }
    : {}),
  images: {
    ...(isStaticExport ? { unoptimized: true } : {}),
    remotePatterns: [
      { protocol: "https", hostname: "**.openstreetmap.org" },
      { protocol: "https", hostname: "**.tile.openstreetmap.org" },
      { protocol: "https", hostname: "a.tile.openstreetmap.org" },
      { protocol: "https", hostname: "b.tile.openstreetmap.org" },
      { protocol: "https", hostname: "c.tile.openstreetmap.org" },
    ],
  },
};

export default nextConfig;
