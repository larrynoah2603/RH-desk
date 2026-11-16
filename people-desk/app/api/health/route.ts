import { NextResponse } from "next/server";
import { supabaseConfig } from "@/lib/server/supabase";
import { isLocalEdition, localConfigValid } from "@/lib/server/local-edition";

export const dynamic = "force-dynamic";

export async function GET() {
  if (isLocalEdition()) {
    const ready = localConfigValid();
    return NextResponse.json({ status: ready ? "ok" : "configuration_required", mode: "local" }, { status: ready ? 200 : 503, headers: { "Cache-Control": "no-store" } });
  }
  const remote = process.env.NEXT_PUBLIC_RH_DESK_REMOTE === "1";
  const configured = Boolean(supabaseConfig());
  const healthy = !remote || configured;
  return NextResponse.json(
    { status: healthy ? "ok" : "configuration_required", mode: remote ? "remote" : "demo" },
    { status: healthy ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
