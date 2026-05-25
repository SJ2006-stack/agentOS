/** True when running on Vercel (server or client bundle with NEXT_PUBLIC_VERCEL_URL). */
export function isVercelDeployment(): boolean {
  return (
    process.env.VERCEL === "1" ||
    Boolean(process.env.NEXT_PUBLIC_VERCEL_URL?.trim())
  );
}

/** Short setup instructions for GEMINI_API_KEY (local vs Vercel). */
export function getGeminiKeySetupHint(): string {
  if (isVercelDeployment()) {
    return (
      "set GEMINI_API_KEY in Vercel → Project → Settings → Environment Variables " +
      "(Production), then redeploy"
    );
  }
  return (
    "set GEMINI_API_KEY in .env.local (https://aistudio.google.com/apikey) and restart npm run dev"
  );
}

/** Shell-visible fault when Gemini is not configured. */
export function getGeminiKeyFault(): string {
  return `[fault] GEMINI_API_KEY missing — ${getGeminiKeySetupHint()}\n`;
}

/** Plain error message (no [fault] prefix) for JSON/API responses. */
export function getGeminiKeyFaultMessage(): string {
  return `GEMINI_API_KEY missing — ${getGeminiKeySetupHint()}`;
}
