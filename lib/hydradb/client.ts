import "server-only";
import { HydraDBClient } from "@hydradb/sdk";
import { readTrimmedEnv } from "@/lib/config/env";

const DEFAULT_TENANT = "devfactory-os";

let client: HydraDBClient | null = null;

export function isHydraConfigured(): boolean {
  return readTrimmedEnv("HYDRADB_API_KEY") !== undefined;
}

export function getHydraTenantId(): string {
  return process.env.HYDRADB_TENANT_ID ?? DEFAULT_TENANT;
}

export function getHydraClient(): HydraDBClient | null {
  const apiKey = readTrimmedEnv("HYDRADB_API_KEY");
  if (!apiKey) return null;
  if (!client) {
    client = new HydraDBClient({ token: apiKey });
  }
  return client;
}

export async function ensureTenant(): Promise<string | null> {
  const hydra = getHydraClient();
  if (!hydra) return null;
  const tenantId = getHydraTenantId();
  try {
    await hydra.tenant.create({ tenant_id: tenantId });
  } catch {
    // tenant may already exist
  }
  return tenantId;
}
