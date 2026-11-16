import { NextResponse } from "next/server";
import { parsePeopleDeskData } from "@/lib/domain/validation";
import { readSession, safeOrigin, supabaseConfig, supabaseFetch, type Session } from "@/lib/server/supabase";

export const dynamic = "force-dynamic";
const MAX_PAYLOAD = 1_048_576;
type Member = { organization_id: string; role: "admin" | "recruiter" | "viewer" };

function reply(payload: unknown, status = 200) {
  return NextResponse.json(payload, { status, headers: { "Cache-Control": "no-store" } });
}

async function findMembership(session: Session): Promise<Member | null> {
  const query = new URLSearchParams({
    select: "organization_id,role",
    user_id: "eq." + session.user.id,
    order: "created_at.asc",
    limit: "1",
  });
  const response = await supabaseFetch("/rest/v1/rh_memberships?" + query.toString(), {}, session.accessToken);
  if (!response.ok) throw new Error("membership_lookup_failed");
  const rows = await response.json() as Member[];
  if (!Array.isArray(rows) || !rows.length) return null;
  const member = rows[0];
  if (!member || !["admin", "recruiter", "viewer"].includes(member.role)) return null;
  return member;
}

export async function GET() {
  if (!supabaseConfig()) return reply({ error: "Serveur non configuré." }, 503);
  try {
    const session = await readSession();
    if (!session) return reply({ error: "Connexion requise." }, 401);
    const membership = await findMembership(session);
    if (!membership) return reply({ error: "Aucune organisation associée à ce compte." }, 403);
    const query = new URLSearchParams({
      select: "data,revision",
      organization_id: "eq." + membership.organization_id,
      limit: "1",
    });
    const response = await supabaseFetch("/rest/v1/rh_workspaces?" + query.toString(), {}, session.accessToken);
    if (!response.ok) return reply({ error: "Lecture du workspace impossible." }, 502);
    const rows = await response.json() as Array<{ data: unknown; revision: number }>;
    if (!Array.isArray(rows) || !rows.length) return reply({ error: "Espace non initialisé. Contactez l’administrateur." }, 409);
    const data = parsePeopleDeskData(rows[0]?.data);
    const revision = rows[0]?.revision;
    if (!data || typeof revision !== "number" || !Number.isSafeInteger(revision)) {
      return reply({ error: "Les données serveur sont invalides." }, 500);
    }
    return reply({
      data,
      revision,
      role: membership.role,
      organizationId: membership.organization_id,
      userEmail: session.user.email ?? null,
    });
  } catch {
    return reply({ error: "Service de données indisponible." }, 502);
  }
}

export async function PUT(request: Request) {
  if (!safeOrigin(request)) return reply({ error: "Origine non autorisée." }, 403);
  if (!supabaseConfig()) return reply({ error: "Serveur non configuré." }, 503);
  const length = Number(request.headers.get("content-length") || 0);
  if (length > MAX_PAYLOAD + 500) return reply({ error: "Sauvegarde trop volumineuse." }, 413);
  try {
    const session = await readSession();
    if (!session) return reply({ error: "Connexion requise." }, 401);
    const membership = await findMembership(session);
    if (!membership) return reply({ error: "Accès interdit." }, 403);
    if (membership.role === "viewer") return reply({ error: "Accès en lecture seule." }, 403);

    const rawBody = await request.text();
    if (rawBody.length > MAX_PAYLOAD + 500) return reply({ error: "Sauvegarde trop volumineuse." }, 413);
    let body: unknown;
    try { body = JSON.parse(rawBody); }
    catch { return reply({ error: "JSON invalide." }, 400); }
    if (!body || typeof body !== "object") return reply({ error: "Requête incorrecte." }, 400);
    const input = body as Record<string, unknown>;
    const data = parsePeopleDeskData(input.data);
    const revision = input.revision;
    if (!data || typeof revision !== "number" || !Number.isSafeInteger(revision) || revision < 0) {
      return reply({ error: "Sauvegarde ou révision invalide." }, 400);
    }
    if (Buffer.byteLength(JSON.stringify(data), "utf8") > MAX_PAYLOAD) {
      return reply({ error: "Sauvegarde trop volumineuse." }, 413);
    }
    const response = await supabaseFetch("/rest/v1/rpc/rh_save_workspace", {
      method: "POST",
      body: JSON.stringify({
        p_org: membership.organization_id,
        p_data: data,
        p_expected_revision: revision,
      }),
    }, session.accessToken);
    if (!response.ok) {
      const problem = await response.json().catch(() => ({})) as { code?: string; message?: string };
      if (problem.code === "40001" || problem.message === "revision_conflict") {
        return reply({ error: "Conflit : données modifiées par un autre utilisateur. Rechargez l’espace." }, 409);
      }
      if (problem.code === "42501") return reply({ error: "Permission refusée." }, 403);
      if (problem.code === "22023") return reply({ error: "Données invalides." }, 400);
      return reply({ error: "Enregistrement serveur impossible." }, 502);
    }
    const newRevision: unknown = await response.json();
    if (typeof newRevision !== "number" || !Number.isSafeInteger(newRevision)) {
      return reply({ error: "Réponse de synchronisation invalide." }, 502);
    }
    return reply({ revision: newRevision });
  } catch {
    return reply({ error: "Service de données indisponible." }, 502);
  }
}
