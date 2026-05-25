import path from "path";
import { fileURLToPath } from "url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

/** GitHub Pages project site: https://<user>.github.io/<repo>/ — never enable on Vercel. */
const repoName = "agentOS";
const isGitHubPages = process.env.GITHUB_PAGES === "true";
const basePath = isGitHubPages ? `/${repoName}` : "";

/** Prefer stable production host on Vercel production builds; preview uses deployment host. */
function resolveVercelDeployUrlForBuild() {
  const vercelEnv = process.env.VERCEL_ENV?.trim();
  const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  const deploymentHost = process.env.VERCEL_URL?.trim();

  const host =
    vercelEnv === "production" && productionHost
      ? productionHost
      : deploymentHost ?? productionHost;
  if (!host) return "";

  const bare = host.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return `https://${bare}`;
}

const vercelDeployUrl = resolveVercelDeployUrlForBuild();

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
