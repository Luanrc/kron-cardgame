import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = process.env.KRON_SITES === "1" ? {} : {
  turbopack: { resolveAlias: { "kron-room-handler": "./server/room-handler.ts" } },
  webpack(config) {
    config.resolve.alias["kron-room-handler"] = path.resolve(process.cwd(), "server/room-handler.ts");
    return config;
  },
};

export default nextConfig;
