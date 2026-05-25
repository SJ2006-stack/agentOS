/** DOOM hero demo — enabled in dev unless explicitly disabled via env. */
export function isDoomDemoEnabled(): boolean {
  const flag = process.env.NEXT_PUBLIC_ENABLE_DOOM_DEMO;
  if (flag === "0" || flag === "false") return false;
  if (flag === "1" || flag === "true") return true;
  return process.env.NODE_ENV === "development";
}
