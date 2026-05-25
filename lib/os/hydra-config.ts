export const HYDRA_ENV_FILE = ".env.local";
export const HYDRA_ENV_TEMPLATE = ".env.example";

export const HYDRA_REQUIRED_VARS = [
  "HYDRADB_API_KEY",
  "HYDRADB_TENANT_ID",
] as const;

export function hydraSetupSteps(): string[] {
  return [
    `Copy ${HYDRA_ENV_TEMPLATE} → ${HYDRA_ENV_FILE}`,
    `Set ${HYDRA_REQUIRED_VARS.join(" and ")}`,
    "Restart the dev server (`npm run dev`)",
    "Submit a task or run recall in the terminal",
  ];
}
