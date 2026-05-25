export const dynamic = "force-dynamic";

import { getEnvStatus } from "@/lib/env";

export async function GET() {
  return Response.json(getEnvStatus());
}
