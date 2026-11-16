import { NextResponse } from "next/server";
import { clearSession, readSession, safeOrigin, supabaseFetch } from "@/lib/server/supabase";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!safeOrigin(request)) return NextResponse.json({ error: "Requête non autorisée." }, { status: 403 });
  try {
    const session = await readSession();
    if (session) {
      await supabaseFetch("/auth/v1/logout", { method: "POST" }, session.accessToken).catch(() => undefined);
    }
  } catch { /* cookies are cleared regardless of upstream availability */ }
  await clearSession();
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
