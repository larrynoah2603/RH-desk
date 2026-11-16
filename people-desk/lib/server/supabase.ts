import "server-only";
import { cookies } from "next/headers";

const ACCESS = "rhdesk_access";
const REFRESH = "rhdesk_refresh";

export type AuthUser = { id: string; email?: string };
export type Session = { user: AuthUser; accessToken: string };
type Tokens = { access_token: string; refresh_token: string; expires_in: number };

export function supabaseConfig(): { url: string; key: string } | null {
  const rawUrl = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_ANON_KEY?.trim();
  if (!rawUrl || !key) return null;
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== "https:" && !(parsed.hostname === "localhost" && parsed.protocol === "http:")) return null;
    if (parsed.username || parsed.password || parsed.search || parsed.hash) return null;
    return { url: parsed.origin, key };
  } catch {
    return null;
  }
}

export function safeOrigin(request: Request): boolean {
  const header = request.headers.get("origin");
  if (!header) return false;
  try {
    return new URL(header).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export async function supabaseFetch(
  path: string,
  options: RequestInit = {},
  accessToken?: string,
): Promise<Response> {
  const config = supabaseConfig();
  if (!config) throw new Error("Supabase is not configured");
  return fetch(config.url + path, {
    ...options,
    cache: "no-store",
    headers: {
      "apikey": config.key,
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: "Bearer " + accessToken } : {}),
      ...options.headers,
    },
  });
}

async function putTokens(tokens: Tokens): Promise<void> {
  const jar = await cookies();
  const base = {
    path: "/" as const,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
  };
  jar.set(ACCESS, tokens.access_token, {
    ...base,
    maxAge: Math.max(60, Math.min(tokens.expires_in || 3600, 3600)),
  });
  jar.set(REFRESH, tokens.refresh_token, { ...base, maxAge: 30 * 24 * 3600 });
}

export async function clearSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(ACCESS);
  jar.delete(REFRESH);
}

export async function signIn(email: string, password: string): Promise<boolean> {
  const res = await supabaseFetch("/auth/v1/token?grant_type=password", {
    method: "POST", body: JSON.stringify({ email, password }),
  });
  if (!res.ok) return false;
  const tokens = await res.json() as Partial<Tokens>;
  if (!tokens.access_token || !tokens.refresh_token || !tokens.expires_in) return false;
  await putTokens(tokens as Tokens);
  return true;
}

async function fetchUser(accessToken: string): Promise<AuthUser | null> {
  const res = await supabaseFetch("/auth/v1/user", { method: "GET" }, accessToken);
  if (!res.ok) return null;
  const user = await res.json() as Partial<AuthUser>;
  if (typeof user.id !== "string" || !user.id) return null;
  return { id: user.id, email: user.email };
}

export async function readSession(): Promise<Session | null> {
  if (!supabaseConfig()) return null;
  const jar = await cookies();
  const access = jar.get(ACCESS)?.value;
  if (access) {
    const user = await fetchUser(access);
    if (user) return { user, accessToken: access };
  }
  const refresh = jar.get(REFRESH)?.value;
  if (!refresh) return null;
  const response = await supabaseFetch("/auth/v1/token?grant_type=refresh_token", {
    method: "POST", body: JSON.stringify({ refresh_token: refresh }),
  });
  if (!response.ok) {
    await clearSession();
    return null;
  }
  const tokens = await response.json() as Partial<Tokens>;
  if (!tokens.access_token || !tokens.refresh_token || !tokens.expires_in) return null;
  const user = await fetchUser(tokens.access_token);
  if (!user) return null;
  await putTokens(tokens as Tokens);
  return { user, accessToken: tokens.access_token };
}
