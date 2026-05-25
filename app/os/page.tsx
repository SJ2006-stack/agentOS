import { DevFactoryOs } from "@/components/shell/DevFactoryOs";
import { OsSpawnBootstrap } from "@/components/landing/OsSpawnBootstrap";
import { getEnvStatus, validateServerEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

export default function OsPage() {
  validateServerEnv();
  const envStatus = getEnvStatus();

  return (
    <>
      <OsSpawnBootstrap />
      <DevFactoryOs envStatus={envStatus} />
    </>
  );
}
