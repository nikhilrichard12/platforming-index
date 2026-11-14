/**
 * The new part check is called from a content script running on someone
 * else's page, so these two routes answer cross-origin requests from the
 * extension. Nothing else in the app does.
 */
export function corsHeaders(origin: string | null): Record<string, string> {
  const allowed =
    origin && (origin.startsWith("chrome-extension://") || origin.startsWith("moz-extension://"))
      ? origin
      : "*";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

export function preflight(req: Request): Response {
  return new Response(null, { status: 204, headers: corsHeaders(req.headers.get("origin")) });
}
