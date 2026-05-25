import { DemoPreviewHost } from "@/components/demo/DemoPreviewHost";
import { DemoWebApp } from "@/components/demo/DemoWebApp";
import { getPublishedDemoPreview } from "@/lib/demo/preview-publish";

export const dynamic = "force-dynamic";

export default async function DemoPage() {
  const { html } = await getPublishedDemoPreview();
  if (html) {
    return <DemoPreviewHost html={html} />;
  }
  return <DemoWebApp />;
}
