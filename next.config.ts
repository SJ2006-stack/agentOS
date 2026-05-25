import type { NextConfig } from "next";

/** GitHub Pages project site: https://<user>.github.io/<repo>/ */
const repoName = "agentOS";
const isGitHubPages = process.env.GITHUB_PAGES === "true";
const basePath = isGitHubPages ? `/${repoName}` : "";

const nextConfig: NextConfig = {
  output: "export",
  ...(basePath ? { basePath, assetPrefix: `${basePath}/` } : {}),
  images: {
    unoptimized: true,
  },
  turbopack: {
    root: process.cwd(),
  },
  serverExternalPackages: ["@hydradb/sdk"],
};

export default nextConfig;
