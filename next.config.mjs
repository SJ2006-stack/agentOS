import path from "path";
import { fileURLToPath } from "url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

/** GitHub Pages project site: https://<user>.github.io/<repo>/ */
const repoName = "agentOS";
const isGitHubPages = process.env.GITHUB_PAGES === "true";
const basePath = isGitHubPages ? `/${repoName}` : "";

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: projectRoot,
  ...(isGitHubPages ? { output: "export" } : {}),
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  ...(basePath ? { basePath, assetPrefix: `${basePath}/` } : {}),
  images: {
    unoptimized: true,
  },
  turbopack: {
    root: projectRoot,
  },
  serverExternalPackages: ["@hydradb/sdk"],
};

export default nextConfig;
