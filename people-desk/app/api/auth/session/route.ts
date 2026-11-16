import { NextResponse } from "next/server";
import { readSession, supabaseConfig } from "@/lib/server/supabase";
import { isLocalEdition, localConfigValid, localSession } from "@/lib/server/local-edition";

export const dynamic = "force-dynamic";

export async function GET() {
  if (isLocalEdition()) {
    if (!localConfigValid()) return NextResponse.json({ configured: false, authenticated: false }, { status: 503 });
    const session = await localSession();
    return NextResponse.json({ configured: true, authenticated: Boolean(session), email: session?.email ?? null, edition: "local" }, { status: session ? 200 : 401, headers: { "Cache-Control": "no-store" } });
  }
  if (!supabaseConfig()) {
    return NextResponse.json({ configured: false, authenticated: false }, { status: 503 });
  }
  try {
    const session = await readSession();
    return NextResponse.json(
      { configured: true, authenticated: Boolean(session), email: session?.user.email ?? null },
      { status: session ? 200 : 401, headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 502 });
  }
}
