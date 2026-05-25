import { FinalDemoPage } from "@/components/final-demo/FinalDemoPage";
import { isHydraConfigured } from "@/lib/hydradb/client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Finale Demo — DevFactory OS",
  description: "Multi-agent web app build — live code assembly and deploy reveal",
};

export default function FinalDemoRoute() {
  return <FinalDemoPage hydraConfigured={isHydraConfigured()} />;
}
