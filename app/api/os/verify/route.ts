export const dynamic = "force-dynamic";

import { isGeminiConfigured } from "@/lib/ai/model";
import { isHydraConfigured } from "@/lib/hydradb/client";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export async function GET() {
  return Response.json({
    geminiConfigured: isGeminiConfigured(),
    hydraConfigured: isHydraConfigured(),
    supabaseConfigured: isSupabaseConfigured(),
  });
}
