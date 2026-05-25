import Link from "next/link";

/** Ensures App Router 404 is static — avoids Pages Router /_document fallback (Next 15.5.x). */
export const dynamic = "force-static";

export default function NotFound() {
  return (
    <main>
      <h1>404</h1>
      <p>Page not found.</p>
      <Link href="/">Back home</Link>
    </main>
  );
}
