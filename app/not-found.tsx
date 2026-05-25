import Link from "next/link";

/** Ensures App Router 404 is static — avoids Pages Router /_document fallback (Next 15.5.x). */
export const dynamic = "force-static";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-transparent p-8 font-mono text-os-green">
      <h1 className="text-2xl text-os-cyan">404</h1>
      <p className="text-os-dim">Page not found.</p>
      <Link href="/" className="text-os-amber underline-offset-4 hover:underline">
        Back home
      </Link>
    </main>
  );
}
