import { NextResponse } from "next/server";
import { supabaseConfig } from "@/lib/server/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  const remote = process.env.NEXT_PUBLIC_RH_DESK_REMOTE === "1";
  const configured = Boolean(supabaseConfig());
  const healthy = !remote || configured;
  return NextResponse.json(
    { status: healthy ? "ok" : "configuration_required", mode: remote ? "remote" : "demo" },
    { status: healthy ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
