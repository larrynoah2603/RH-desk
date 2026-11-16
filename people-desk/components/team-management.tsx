"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Check, Clock3, MailPlus, RotateCcw, ShieldCheck, Trash2, UsersRound } from "lucide-react";
import { IS_REMOTE_MODE, useRemoteStatus } from "@/lib/storage/store";
import "./team-management.css";

type Role = "admin"|"recruiter"|"viewer";
type Member = { userId:string;email:string;role:Role;createdAt:string };
type Invite = { id:string;email:string;role:Role;createdAt:string;expiresAt:string };
type Team = { members:Member[];invitations:Invite[] };
const titles:Record<Role,string>={admin:"Administrateur",recruiter:"Recruteur",viewer:"Lecteur"};
const descriptions:Record<Role,string>={
  admin:"Accès intégral, gestion de l’équipe et paramètres de l’organisation.",
  recruiter:"Gestion du recrutement, sans modification des paramètres ni des membres.",
  viewer:"Consultation des dossiers, sans autorisation de modification.",
};
const validEmail=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function frenchDate(date:string):string{
  const value=new Date(date);
  return Number.isNaN(value.getTime())?"—":new Intl.DateTimeFormat("fr-FR",{day:"numeric",month:"short",year:"numeric"}).format(value);
}
export function TeamManagement(){
  const remote=useRemoteStatus();
  const [team,setTeam]=useState<Team|null>(null);
  const [currentEmail,setCurrentEmail]=useState("");
  const [loading,setLoading]=useState(true);
  const [clock,setClock]=useState(0);
  const [busy,setBusy]=useState(false);
  const [email,setEmail]=useState("");
  const [role,setRole]=useState<Role>("recruiter");
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");

  const reload=useCallback(async()=>{
    setLoading(true);setError("");
    try{
      const response=await fetch("/api/team",{credentials:"same-origin",cache:"no-store"});
      const data=await response.json() as Team & {error?:string};
      if(!response.ok)throw new Error(data.error||"Impossible de charger les membres.");
      if(!Array.isArray(data.members)||!Array.isArray(data.invitations))throw new Error("Réponse d’équipe invalide.");
      setTeam(data);
      setClock(Date.now());
    }catch(err){setTeam(null);setError(err instanceof Error?err.message:"Erreur réseau.");}
    finally{setLoading(false);}
  },[]);

  useEffect(()=>{
    if(!IS_REMOTE_MODE||remote.role!=="admin")return;
    queueMicrotask(()=>void reload());
    void fetch("/api/auth/session",{credentials:"same-origin",cache:"no-store"}).then(r=>r.json()).then((res:{email?:string})=>setCurrentEmail(res.email??"")).catch(()=>undefined);
  },[remote.role,reload]);

  async function mutate(payload:Record<string,string>,success:string){
    setBusy(true);setError("");setNotice("");
    try{
      const response=await fetch("/api/team",{
        method:"POST",credentials:"same-origin",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify(payload)
      });
      const result=await response.json() as {error?:string};
      if(!response.ok)throw new Error(result.error??"Opération impossible.");
      setNotice(success);
      await reload();
    }catch(err){setError(err instanceof Error?err.message:"Erreur réseau.");}
    finally{setBusy(false);}
  }

  async function invite(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    const normalized=email.trim().toLowerCase();
    if(!validEmail.test(normalized)||normalized.length>254){
      setError("Adresse e-mail invalide.");return;
    }
    await mutate({action:"invite",email:normalized,role},"Invitation créée. Le compte doit ensuite être créé et confirmé dans Supabase Auth, puis l’utilisateur doit se connecter à RH Desk pour activer l’accès.");
    setEmail("");
  }

  function setMemberRole(member:Member,nextRole:Role){
    if(member.role===nextRole)return;
    if(!window.confirm("Modifier le rôle de "+member.email+" en « "+titles[nextRole]+" » ? Le changement d’autorisation sera immédiat côté serveur."))return;
    void mutate({action:"role",userId:member.userId,role:nextRole},"Rôle mis à jour.");
  }
  function removeMember(member:Member){
    if(!window.confirm("Révoquer l’accès RH Desk de "+member.email+" ? Son compte Supabase Auth ne sera pas supprimé."))return;
    void mutate({action:"remove",userId:member.userId},"Accès révoqué.");
  }
  function cancel(invitation:Invite){
    if(!window.confirm("Annuler l’invitation en attente pour "+invitation.email+" ?"))return;
    void mutate({action:"cancel",inviteId:invitation.id},"Invitation annulée.");
  }

  if(!IS_REMOTE_MODE||remote.role!=="admin"){
    return <main className="rh-team-page"><div className="rh-team-panel" role="alert"><h1>Accès administrateur requis</h1><p>Ce module est réservé aux administrateurs de l’édition RH Desk en ligne.</p></div></main>;
  }
  return <main className="rh-team-page">
    <div className="rh-team-heading"><div><p className="rh-team-kicker">RH DESK / ADMINISTRATION</p><h1>Utilisateurs et accès</h1><p>Invitez votre équipe, définissez les responsabilités et suivez les accès à votre organisation.</p></div>
      <button type="button" onClick={()=>void reload()} disabled={busy||loading}><RotateCcw size={17} aria-hidden="true"/> Actualiser</button>
    </div>
    {error&&<div className="rh-team-message rh-team-error" role="alert">{error}</div>}
    {notice&&<div className="rh-team-message rh-team-success" role="status"><Check size={16} aria-hidden="true"/>{notice}</div>}
    <section className="rh-team-explanation" aria-label="Sécurité des comptes">
      <ShieldCheck aria-hidden="true" size={22}/><div><strong>Contrôle des accès par organisation</strong><p>Seuls les administrateurs peuvent modifier les rôles et les invitations. Un lecteur ne peut pas enregistrer de modifications RH.</p></div>
    </section>
    <div className="rh-team-grid">
      <section className="rh-team-panel rh-team-members">
        <div className="rh-team-section-head"><div><h2><UsersRound size={18} aria-hidden="true"/> Membres actifs</h2><p>Comptes ayant accès à l’espace RH</p></div><span>{team?.members.length??"—"}</span></div>
        {loading?<p role="status" className="rh-team-loading">Chargement des membres…</p>:!team?<p>Aucune liste disponible.</p>:team.members.length===0?<p>Aucun membre actif.</p>:
          <div className="rh-team-member-list">{team.members.map(member=>{
            const self=member.email.toLowerCase()===currentEmail.toLowerCase();
            return <article key={member.userId} className="rh-team-member">
              <div className="rh-team-avatar" aria-hidden="true">{member.email.slice(0,2).toUpperCase()}</div>
              <div className="rh-team-member-info"><strong>{member.email}</strong><small>Depuis le {frenchDate(member.createdAt)} {self?"· Votre compte":""}</small></div>
              <div className="rh-team-member-actions"><label><span className="sr-only">Rôle de {member.email}</span><select aria-label={"Rôle de "+member.email} value={member.role} disabled={busy||self} title={descriptions[member.role]} onChange={event=>setMemberRole(member,event.target.value as Role)}>
                {(["admin","recruiter","viewer"] as Role[]).map(item=><option key={item} value={item}>{titles[item]}</option>)}
              </select></label>
                {!self&&<button type="button" title={"Révoquer "+member.email} aria-label={"Révoquer "+member.email} onClick={()=>removeMember(member)} disabled={busy}><Trash2 size={16} aria-hidden="true"/></button>}
              </div>
            </article>;
          })}</div>}
        <p className="rh-team-footnote">Votre propre accès administrateur ne peut pas être révoqué depuis cette interface. Les modifications sont contrôlées également côté Supabase.</p>
      </section>
      <aside className="rh-team-panel rh-team-invite">
        <div className="rh-team-section-head"><div><h2><MailPlus size={18} aria-hidden="true"/> Préparer une invitation</h2><p>Autorisez une nouvelle adresse e-mail</p></div></div>
        <form onSubmit={event=>void invite(event)}>
          <label>Adresse e-mail professionnelle<input type="email" autoComplete="off" value={email} onChange={event=>setEmail(event.target.value)} required maxLength={254} placeholder="collaborateur@entreprise.com" disabled={busy}/></label>
          <label>Rôle attribué<select value={role} onChange={event=>setRole(event.target.value as Role)} disabled={busy}>{(["recruiter","viewer","admin"] as Role[]).map(value=><option key={value} value={value}>{titles[value]}</option>)}</select></label>
          <p className="rh-team-role-help">{descriptions[role]}</p>
          <button className="rh-team-submit" type="submit" disabled={busy}>{busy?"Enregistrement…":"Enregistrer l’invitation"}</button>
        </form>
        <div className="rh-team-important"><strong>Invitation interne, sans envoi d’e-mail</strong><p>Cette action ne crée pas de compte Supabase Auth et n’envoie aucun message. Créez ensuite l’utilisateur dans <strong>Supabase → Authentication → Users</strong>, confirmez son e-mail, puis demandez-lui de se connecter à RH Desk. L’accès sera activé à sa première connexion.</p></div>
      </aside>
    </div>
    <section className="rh-team-panel rh-team-pending">
      <div className="rh-team-section-head"><div><h2><Clock3 size={18} aria-hidden="true"/> Invitations en attente</h2><p>Invitations non encore réclamées, valables 14 jours</p></div><span>{team?.invitations.length??"—"}</span></div>
      {loading?<p role="status">Chargement…</p>:team?.invitations.length===0?<p className="rh-team-loading">Aucune invitation en attente.</p>:
        <div className="rh-team-invite-list">{team?.invitations.map(inv=>{
          const expired=clock>0&&new Date(inv.expiresAt).getTime()<clock;
          return <div key={inv.id} className="rh-team-invite-row"><div><strong>{inv.email}</strong><small>{titles[inv.role]} · {expired?"Expirée le":"Expire le"} {frenchDate(inv.expiresAt)}</small></div>
            <button type="button" disabled={busy} onClick={()=>cancel(inv)}>Annuler</button></div>;
        })}</div>}
    </section>
  </main>;
}
