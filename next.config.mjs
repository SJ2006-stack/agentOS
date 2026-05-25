import path from "path";
import { fileURLToPath } from "url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

/** GitHub Pages project site: https://<user>.github.io/<repo>/ — never enable on Vercel. */
const repoName = "agentOS";
const isGitHubPages = process.env.GITHUB_PAGES === "true";
const basePath = isGitHubPages ? `/${repoName}` : "";

function isPerDeploymentVercelHost(host) {
  const h = host.replace(/^https?:\/\//, "").replace(/\/$/, "").toLowerCase();
  return h.endsWith("-projects.vercel.app") || h.includes("-git-");
}

/** Prefer explicit DEMO_DEPLOY_URL, then stable Vercel production host (never *-projects.vercel.app). */
function resolveVercelDeployUrlForBuild() {
  const explicit =
    process.env.DEMO_DEPLOY_URL?.trim() ??
    process.env.NEXT_PUBLIC_DEMO_DEPLOY_URL?.trim() ??
    process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) {
    const bare = explicit.replace(/^https?:\/\//, "").replace(/\/$/, "");
    return bare.startsWith("http") ? bare : `https://${bare}`;
  }

  const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  const branchHost = process.env.VERCEL_BRANCH_URL?.trim();
  const deploymentHost = process.env.VERCEL_URL?.trim();

  for (const host of [productionHost, branchHost, deploymentHost]) {
    if (!host) continue;
    const bare = host.replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (!isPerDeploymentVercelHost(bare)) return `https://${bare}`;
  }

  if (productionHost) {
    const bare = productionHost.replace(/^https?:\/\//, "").replace(/\/$/, "");
    return `https://${bare}`;
  }
  return "";
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
