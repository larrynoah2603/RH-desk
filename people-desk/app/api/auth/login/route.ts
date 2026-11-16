import { NextResponse } from "next/server";
import { safeOrigin, signIn, supabaseConfig } from "@/lib/server/supabase";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!safeOrigin(request)) return NextResponse.json({ error: "Requête non autorisée." }, { status: 403 });
  if (!supabaseConfig()) return NextResponse.json({ error: "Connexion serveur non configurée." }, { status: 503 });
  let input: unknown;
  try { input = await request.json(); }
  catch { return NextResponse.json({ error: "Requête invalide." }, { status: 400 }); }
  if (!input || typeof input !== "object") return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  const { email, password } = input as Record<string, unknown>;
  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 ||
      typeof password !== "string" || password.length < 1 || password.length > 512) {
    return NextResponse.json({ error: "Identifiants invalides." }, { status: 400 });
  }
  try {
    const success = await signIn(email, password);
    if (!success) return NextResponse.json({ error: "Identifiants incorrects ou compte désactivé." }, { status: 401 });
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Service de connexion indisponible." }, { status: 502 });
  }
}
