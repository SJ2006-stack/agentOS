import "server-only";

/** True when the client wants a JSON body (E2E / programmatic callers). */
export function wantsJsonCommandResponse(
  req: Request,
  body?: { format?: string }
): boolean {
  if (body?.format === "json") return true;
  const accept = req.headers.get("accept") ?? "";
  return accept.includes("application/json");
}

export function jsonCommandFault(
  message: string,
  status = 503
): Response {
  return Response.json({ ok: false, error: message }, { status });
}
