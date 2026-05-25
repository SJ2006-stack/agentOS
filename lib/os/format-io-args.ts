/** Human-readable I/O bus args — avoids mid-key JSON truncation in the UI. */
export function formatIoArgs(args: Record<string, unknown>): string {
  const keys = Object.keys(args);
  if (keys.length === 0) return "{}";
  if (keys.length === 1) {
    const key = keys[0]!;
    const value = args[key];
    const text = typeof value === "string" ? value : JSON.stringify(value);
    return `${key}: ${text}`;
  }
  return keys
    .map((key) => {
      const value = args[key];
      const text = typeof value === "string" ? value : JSON.stringify(value);
      return `${key}: ${text}`;
    })
    .join("\n");
}
