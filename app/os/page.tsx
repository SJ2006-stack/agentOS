import { DevFactoryOs } from "@/components/shell/DevFactoryOs";
import { OsSpawnBootstrap } from "@/components/landing/OsSpawnBootstrap";
import { isHydraConfigured } from "@/lib/hydradb/client";

export default function OsPage() {
  const hydraConfigured = isHydraConfigured();

  return (
    <>
      <OsSpawnBootstrap />
      <DevFactoryOs hydraConfigured={hydraConfigured} />
    </>
  );
}
