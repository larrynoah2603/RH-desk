import { NextResponse } from "next/server";
import { readSession, supabaseConfig } from "@/lib/server/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
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
