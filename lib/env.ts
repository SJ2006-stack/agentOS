import "server-only";

import { z } from "zod";
import { isGeminiConfigured } from "@/lib/ai/model";
import { readTrimmedEnv } from "@/lib/config/env";
import type { OsEnvStatus } from "@/lib/env-types";
import { isHydraConfigured } from "@/lib/hydradb/client";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export type { OsEnvStatus } from "@/lib/env-types";

const optionalNonEmpty = z
  .string()
  .trim()
  .min(1)
  .optional()
  .or(z.literal("").transform(() => undefined));

export const serverEnvSchema = z.object({
  GEMINI_API_KEY: optionalNonEmpty,
  GOOGLE_API_KEY: optionalNonEmpty,
  HYDRADB_API_KEY: optionalNonEmpty,
  HYDRADB_TENANT_ID: optionalNonEmpty,
  NEXT_PUBLIC_SUPABASE_URL: optionalNonEmpty,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: optionalNonEmpty,
  SUPABASE_SERVICE_ROLE_KEY: optionalNonEmpty,
  NEXT_PUBLIC_APP_URL: optionalNonEmpty,
  DEMO_DEPLOY_URL: optionalNonEmpty,
  TAVILY_API_KEY: optionalNonEmpty,
  SERPER_API_KEY: optionalNonEmpty,
});

const REQUIRED_ENV_KEYS = [
  "GEMINI_API_KEY",
  "HYDRADB_API_KEY",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

function readEnvRecord(): Record<string, string | undefined> {
  return {
    GEMINI_API_KEY: readTrimmedEnv("GEMINI_API_KEY"),
    GOOGLE_API_KEY: readTrimmedEnv("GOOGLE_API_KEY"),
    HYDRADB_API_KEY: readTrimmedEnv("HYDRADB_API_KEY"),
    HYDRADB_TENANT_ID: readTrimmedEnv("HYDRADB_TENANT_ID"),
    NEXT_PUBLIC_SUPABASE_URL: readTrimmedEnv("NEXT_PUBLIC_SUPABASE_URL"),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: readTrimmedEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    SUPABASE_SERVICE_ROLE_KEY: readTrimmedEnv("SUPABASE_SERVICE_ROLE_KEY"),
    NEXT_PUBLIC_APP_URL: readTrimmedEnv("NEXT_PUBLIC_APP_URL"),
    DEMO_DEPLOY_URL: readTrimmedEnv("DEMO_DEPLOY_URL"),
    TAVILY_API_KEY: readTrimmedEnv("TAVILY_API_KEY"),
    SERPER_API_KEY: readTrimmedEnv("SERPER_API_KEY"),
  };
}

/** Validate env shape at boot; logs issues without crashing the app. */
export function validateServerEnv(): z.ZodSafeParseResult<z.infer<typeof serverEnvSchema>> {
  return serverEnvSchema.safeParse(readEnvRecord());
}

export function getEnvStatus(): OsEnvStatus {
  const geminiConfigured = isGeminiConfigured();
  const hydraConfigured = isHydraConfigured();
  const supabaseConfigured = isSupabaseConfigured();

  const missingRequired = REQUIRED_ENV_KEYS.filter((key) => {
    if (key === "GEMINI_API_KEY") return !geminiConfigured;
    if (key === "HYDRADB_API_KEY") return !hydraConfigured;
    return readTrimmedEnv(key) === undefined;
  });

  return {
    geminiConfigured,
    hydraConfigured,
    supabaseConfigured,
    missingRequired,
  };
}
