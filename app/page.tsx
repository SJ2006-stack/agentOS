import { DevFactoryOs } from "@/components/DevFactoryOs";
import { isHydraConfigured } from "@/lib/hydradb/client";

export default function Home() {
  const hydraConfigured = isHydraConfigured();

  return <DevFactoryOs hydraConfigured={hydraConfigured} />;
}
