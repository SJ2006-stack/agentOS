import { DevFactoryOs } from "@/components/shell/DevFactoryOs";
import { OsSpawnBootstrap } from "@/components/landing/OsSpawnBootstrap";
import { getEnvStatus, validateServerEnv } from "@/lib/env";

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
