import path from "path";
import { fileURLToPath } from "url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

/** GitHub Pages project site: https://<user>.github.io/<repo>/ */
const repoName = "agentOS";
const isGitHubPages = process.env.GITHUB_PAGES === "true";
const basePath = isGitHubPages ? `/${repoName}` : "";

/** Inlined at build time on Vercel so client can resolve deploy URL without runtime VERCEL_URL. */
const vercelHost = process.env.VERCEL_URL?.trim();
const vercelDeployUrl = vercelHost
  ? `https://${vercelHost.replace(/^https?:\/\//, "").replace(/\/$/, "")}`
  : "";

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: projectRoot,
  ...(isGitHubPages ? { output: "export" } : {}),
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
    ...(vercelDeployUrl
      ? { NEXT_PUBLIC_VERCEL_DEPLOY_URL: vercelDeployUrl }
      : {}),
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
