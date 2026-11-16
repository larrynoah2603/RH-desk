import { NextResponse } from "next/server";
import { readSession, safeOrigin, supabaseConfig, supabaseFetch, type Session } from "@/lib/server/supabase";

export const dynamic = "force-dynamic";
const MAX_BYTES = 4096;
type Role = "admin" | "recruiter" | "viewer";
type Member = { organization_id: string; role: Role };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const roles = ["admin","recruiter","viewer"];

function answer(data: unknown,status=200) {
  return NextResponse.json(data,{status,headers:{"Cache-Control":"no-store"}});
}
async function adminContext(): Promise<{session:Session;org:string}|null> {
  const session=await readSession();
  if(!session)return null;
  const query=new URLSearchParams({select:"organization_id,role",user_id:"eq."+session.user.id,order:"created_at.asc",limit:"1"});
  const res=await supabaseFetch("/rest/v1/rh_memberships?"+query.toString(),{},session.accessToken);
  if(!res.ok)throw new Error("membership_lookup_failed");
  const members=await res.json() as Member[];
  const current=members?.[0];
  if(!current || current.role!=="admin" || !UUID.test(current.organization_id))return null;
  return {session,org:current.organization_id};
}
async function rpc(path:string,args:Record<string,string>,token:string) {
  const result=await supabaseFetch("/rest/v1/rpc/"+path,{
    method:"POST",
    body:JSON.stringify(args),
  },token);
  if(!result.ok) {
    const details=await result.json().catch(()=>({})) as {code?:string;message?:string};
    const code=details.code;
    const message=details.message||"";
    const status=code==="42501"?403:code==="22023"?400:code==="23505"?409:result.status===404?503:502;
    const publicMessage=message==="already_member"?"Ce compte est déjà membre.":message==="last_admin_required"?"Le dernier administrateur doit être conservé.":
      message==="cannot_change_own_role"||message==="cannot_remove_self"?"Vous ne pouvez pas modifier votre propre accès.":
      message==="member_not_found"||message==="invitation_not_found"?"Cet élément n’existe plus. Rechargez la page.":
      message==="invalid_invitation"||message==="invalid_role"?"Vérifiez les informations demandées.":
      status===503?"Configuration équipe indisponible : migration Supabase du sprint 4 à appliquer.":
      status===403?"Opération interdite pour ce compte.":"Opération indisponible. Réessayez.";
    return {ok:false as const,status,error:publicMessage};
  }
  return {ok:true as const,value:await result.json()};
}
export async function GET() {
  if(!supabaseConfig())return answer({error:"Serveur non configuré."},503);
  try {
    const context=await adminContext();
    if(!context)return answer({error:"Accès réservé aux administrateurs."},403);
    const result=await rpc("rh_team_overview",{p_org:context.org},context.session.accessToken);
    if(!result.ok)return answer({error:result.error},result.status);
    return answer(result.value);
  }catch{
    return answer({error:"Impossible de consulter les membres."},502);
  }
}
export async function POST(request:Request) {
  if(!safeOrigin(request))return answer({error:"Origine non autorisée."},403);
  if(!supabaseConfig())return answer({error:"Serveur non configuré."},503);
  if(Number(request.headers.get("content-length")||0)>MAX_BYTES)return answer({error:"Requête trop volumineuse."},413);
  let body:Record<string,unknown>;
  try {
    const raw=await request.text();
    if(Buffer.byteLength(raw,"utf8")>MAX_BYTES)return answer({error:"Requête trop volumineuse."},413);
    const parsed:unknown=JSON.parse(raw);
    if(!parsed || typeof parsed!=="object" || Array.isArray(parsed))return answer({error:"Requête invalide."},400);
    body=parsed as Record<string,unknown>;
  }catch{return answer({error:"Requête invalide."},400);}

  let proc:string;
  const args:Record<string,string>={};
  if(body.action==="invite") {
    if(typeof body.email!=="string"||body.email.length>254||!EMAIL.test(body.email.trim())||typeof body.role!=="string"||!roles.includes(body.role))return answer({error:"E-mail ou rôle invalide."},400);
    proc="rh_team_invite";args.p_email=body.email.trim().toLowerCase();args.p_role=body.role;
  } else if(body.action==="role") {
    if(typeof body.userId!=="string"||!UUID.test(body.userId)||typeof body.role!=="string"||!roles.includes(body.role))return answer({error:"Compte ou rôle invalide."},400);
    proc="rh_team_set_role";args.p_user=body.userId;args.p_role=body.role;
  } else if(body.action==="remove") {
    if(typeof body.userId!=="string"||!UUID.test(body.userId))return answer({error:"Identifiant de membre invalide."},400);
    proc="rh_team_remove_member";args.p_user=body.userId;
  } else if(body.action==="cancel") {
    if(typeof body.inviteId!=="string"||!UUID.test(body.inviteId))return answer({error:"Identifiant d’invitation invalide."},400);
    proc="rh_team_cancel_invitation";args.p_invite=body.inviteId;
  } else return answer({error:"Action inconnue."},400);

  try{
    const context=await adminContext();
    if(!context)return answer({error:"Accès réservé aux administrateurs."},403);
    const result=await rpc(proc,{...args,p_org:context.org},context.session.accessToken);
    if(!result.ok)return answer({error:result.error},result.status);
    return answer({ok:true});
  }catch{
    return answer({error:"Serveur indisponible. Aucun changement confirmé."},502);
  }
}
