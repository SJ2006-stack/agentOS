export const dynamic = "force-static";

import { isOpenRouterConfigured } from "@/lib/ai/model";
import { isHydraConfigured } from "@/lib/hydradb/client";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export async function GET() {
  return Response.json({
    openRouterConfigured: isOpenRouterConfigured(),
    hydraConfigured: isHydraConfigured(),
    supabaseConfigured: isSupabaseConfigured(),
  });
}
