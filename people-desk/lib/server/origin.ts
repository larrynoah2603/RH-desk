/**
 * CSRF protection for state-changing API requests.
 *
 * Render terminates TLS at the edge: the browser sees HTTPS, but Next.js
 * may receive an internal HTTP URL. Comparing Origin to request.url directly
 * therefore rejects valid same-origin POSTs on Render.
 *
 * Prefer a deployment-controlled canonical origin rather than any client-
 * controlled Host/X-Forwarded-* header. Render provides RENDER_EXTERNAL_URL.
 * Other hosts/custom domains may set RH_DESK_PUBLIC_ORIGIN explicitly.
 */
function canonicalOrigin(raw: string): string | null {
  try {
    const url = new URL(raw);
    if (url.username || url.password || url.search || url.hash || url.pathname !== "/") return null;
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (url.protocol === "http:" && !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export type OriginConfig = {
  publicOrigin?: string;
  renderExternalUrl?: string;
};

export function safeOrigin(request: Request, config?: OriginConfig): boolean {
  const rawOrigin = request.headers.get("origin");
  if (!rawOrigin) return false;

  const incoming = canonicalOrigin(rawOrigin);
  // Origin headers are serialized origins (no path, slash, query, or fragment).
  if (!incoming || incoming !== rawOrigin) return false;

  const configured = config ?? {
    publicOrigin: process.env.RH_DESK_PUBLIC_ORIGIN,
    renderExternalUrl: process.env.RENDER_EXTERNAL_URL,
  };
  const deployedOrigin = configured.publicOrigin || configured.renderExternalUrl;
  if (deployedOrigin) {
    // An invalid deployment config must fail closed, never fall back to
    // untrusted proxy-provided host headers.
    return incoming === canonicalOrigin(deployedOrigin);
  }

  try {
    // Direct local development without a TLS-terminating proxy.
    return incoming === new URL(request.url).origin;
  } catch {
    return false;
  }
}
