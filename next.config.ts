import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  serverExternalPackages: ["@hydradb/sdk"],
};

export default nextConfig;
