"use client";

import { useState } from "react";
import Link from "next/link";
import { useStore, useWorkspaceData, useRemoteStatus } from "@/lib/storage/store";
import { dashboardKpis, jobStats, reportKpis, stageCounts } from "@/lib/domain/metrics";
import { STAGES, type Stage } from "@/lib/domain/types";
import { STAGE_LABELS, formatDate, formatMoney } from "@/lib/domain/labels";
import { validateCandidate, validateInterview, validateJob, validateOffer, validateReview } from "@/lib/domain/validation";
import { downloadFile, serializeData, candidatesCsv, jobStatsCsv, calendarIcs } from "@/lib/storage/export";
import { parsePeopleDeskData } from "@/lib/domain/validation";
import { useToast } from "@/components/toast-provider";
import { usePrefs } from "@/lib/i18n";
import "./workspace-pages.css";

export type WorkspacePage = "dashboard" | "jobs" | "candidates" | "pipeline" | "interviews" | "reviews" | "offers" | "reports" | "settings";
type FormMode = "job" | "candidate" | "interview" | "review" | "offer" | null;
type FormData = Record<string, string>;
const titles: Record<WorkspacePage, string> = {
  dashboard: "Vue d’ensemble", jobs: "Postes ouverts", candidates: "Candidatures",
  pipeline: "Pipeline de recrutement", interviews: "Entretiens", reviews: "Évaluations",
  offers: "Offres d’embauche", reports: "Rapports", settings: "Paramètres",
};
const stageLabel = (stage: Stage) => STAGE_LABELS[stage]?.fr ?? stage;
const field = (label: string, name: string, type = "text", required = false) => ({ label, name, type, required });
const columns = {
  job: [field("Intitulé du poste", "title", "text", true), field("Département", "department", "text", true), field("Localisation", "location", "text", true), field("Postes à pourvoir", "openings", "number", true), field("Fourchette salariale", "salary", "text", true), field("Responsable", "owner"), field("Description du poste", "description", "textarea", true), field("Compétences (séparées par virgule)", "skills")],
  candidate: [field("Nom complet", "name", "text", true), field("E-mail", "email", "email", true), field("Téléphone", "phone"), field("Localisation", "location"), field("Compétences (séparées par virgule)", "skills", "text", true), field("Présentation", "summary", "textarea")],
  interview: [field("Date et heure", "start", "datetime-local", true), field("Durée (minutes)", "duration", "number", true), field("Interviewer", "interviewer", "text", true), field("Objet", "topic", "text", true), field("Notes", "notes", "textarea")],
  review: [field("Commentaires", "comments", "textarea", true), field("Points forts", "strengths", "textarea"), field("Risques", "risks", "textarea"), field("Auteur", "author")],
  offer: [field("Titre", "title"), field("Salaire", "salary", "number", true), field("Date de début", "startDate", "date", true), field("Notes", "notes", "textarea")],
};

export function WorkspacePages({ page }: { page: WorkspacePage }) {
  const store = useStore();
  const data = useWorkspaceData();
  const remote = useRemoteStatus();
  const canWrite = !store.isRemoteMode() || remote.role !== "viewer";
  const canAdmin = !store.isRemoteMode() || remote.role === "admin";
  const { locale } = usePrefs();
  const { toast } = useToast();
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [form, setForm] = useState<FormData>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [settings, setSettings] = useState<FormData>({});
  const [stageFilter, setStageFilter] = useState("all");
  const kpis = dashboardKpis(data);
  const jobName = (id: string) => data.jobs.find((job) => job.id === id)?.title ?? "Poste inconnu";
  const candidateName = (id: string) => data.candidates.find((candidate) => candidate.id === id)?.name ?? "Candidat inconnu";
  const matches = (value: string) => value.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase());
  const candidates = data.candidates.filter((c) => matches(c.name + " " + c.email + " " + jobName(c.jobId)) && (stageFilter === "all" || c.stage === stageFilter));
  const notify = (result: { ok: boolean; error?: string }, message: string) => {
    if (result.ok) { setError(""); setFormMode(null); setEditing(null); setForm({}); toast(store.isRemoteMode() ? "Modification appliquée · synchronisation en cours" : message); }
    else { setError(result.error ?? "Opération impossible"); toast({ kind: "error", title: "Échec de l’opération", description: result.error ?? "Vérifiez les informations." }); }
  };
  const open = (mode: Exclude<FormMode, null>, item?: Record<string, unknown>) => {
    setFormMode(mode); setEditing(typeof item?.id === "string" ? item.id : null); setError("");
    const values: FormData = {};
    for (const [key, value] of Object.entries(item ?? {})) {
      if (typeof value === "string" || typeof value === "number") values[key] = String(value);
      if (key === "skills" && Array.isArray(value)) values[key] = value.join(", ");
    }
    if (mode === "interview" && values.start) values.start = values.start.slice(0, 16);
    if (mode === "interview" && !values.duration) values.duration = "45";
    if (mode === "job" && !values.openings) values.openings = "1";
    if (mode === "review") for (const k of ["skills", "communication", "problemSolving", "culture", "motivation"]) values[k] = "3";
    setForm(values);
  };
  function save(e: React.FormEvent) {
    e.preventDefault(); setError("");
    if (formMode === "job") {
      const input = { title: form.title ?? "", department: form.department ?? "", location: form.location ?? "", type: form.type ?? "fulltime", openings: form.openings ?? "1", salary: form.salary ?? "", description: form.description ?? "", skills: form.skills ?? "", owner: form.owner };
      const errors = validateJob(input);
      if (Object.keys(errors).length) return setError("Vérifiez les champs obligatoires du poste.");
      notify(editing ? store.updateJob(editing, input) : store.createJob(input), editing ? "Poste mis à jour" : "Poste créé");
    }
    if (formMode === "candidate") {
      const input = { name: form.name ?? "", email: form.email ?? "", phone: form.phone, jobId: form.jobId ?? "", source: form.source ?? "careers", location: form.location, summary: form.summary, skills: form.skills ?? "" };
      const validation = validateCandidate(input, data.candidates, editing ?? undefined);
      if (!data.jobs.some((j) => j.id === input.jobId) || Object.keys(validation).length) return setError("Vérifiez les données du candidat, les compétences, l’e-mail et le poste.");
      const skills = input.skills.split(",").map((s) => s.trim()).filter(Boolean);
      notify(editing ? store.updateCandidate(editing, { ...input, source: input.source as "careers", skills }) : store.createCandidate({ ...input, source: input.source as "careers", skills }), editing ? "Candidat modifié" : "Candidat ajouté");
    }
    if (formMode === "interview") {
      const input = { candidateId: form.candidateId ?? "", start: form.start ? new Date(form.start).toISOString() : "", duration: Number(form.duration ?? 45), interviewer: form.interviewer ?? "", kind: form.kind ?? "video", topic: form.topic ?? "", notes: form.notes };
      if (!data.candidates.some((c) => c.id === input.candidateId) || Object.keys(validateInterview(input, data.interviews, editing ?? undefined)).length) return setError("Date, disponibilité ou informations de l’entretien invalides.");
      notify(editing ? store.updateInterview(editing, { ...input, kind: input.kind as "video" }) : store.scheduleInterview({ ...input, kind: input.kind as "video" }), editing ? "Entretien mis à jour" : "Entretien programmé");
    }
    if (formMode === "review") {
      const input = { candidateId: form.candidateId ?? "", interviewId: form.interviewId || undefined, comments: form.comments ?? "", strengths: form.strengths, risks: form.risks, author: form.author, recommendation: form.recommendation ?? "yes", scores: Object.fromEntries(["skills", "communication", "problemSolving", "culture", "motivation"].map((key) => [key, Number(form[key] ?? 3)])) };
      if (Object.keys(validateReview(input, data.candidates)).length) return setError("Sélectionnez un candidat, une recommandation et renseignez les notes.");
      notify(editing ? store.updateReview(editing, input) : store.createReview(input), editing ? "Évaluation mise à jour" : "Évaluation enregistrée");
    }
    if (formMode === "offer") {
      const input = { candidateId: form.candidateId ?? "", salary: form.salary ?? "", title: form.title, currency: form.currency ?? "EUR", startDate: form.startDate ?? "", notes: form.notes };
      if (Object.keys(validateOffer(input, data.candidates, editing ? data.offers.filter((offer) => offer.id !== editing) : data.offers)).length) return setError("Le candidat, le salaire ou la date de début ne sont pas valides.");
      notify(editing ? store.updateOffer(editing, { salary: Number(form.salary), currency: input.currency, title: input.title, startDate: input.startDate, notes: input.notes }) : store.createOffer(input), editing ? "Offre actualisée" : "Offre créée");
    }
  }
  function remove(what: "candidate" | "interview" | "review" | "offer", id: string) {
    if (!window.confirm("Confirmer la suppression ? Cette action est irréversible.")) return;
    const result = what === "candidate" ? store.deleteCandidate(id) : what === "interview" ? store.deleteInterview(id) : what === "review" ? store.deleteReview(id) : store.deleteOffer(id);
    notify(result, "Élément supprimé");
  }
  function getOptions(kind: "candidate" | "job") { return kind === "job" ? data.jobs.map((j) => ({ value: j.id, label: j.title })) : data.candidates.map((c) => ({ value: c.id, label: c.name })); }
  const actions: Partial<Record<WorkspacePage, FormMode>> = { jobs: "job", candidates: "candidate", interviews: "interview", reviews: "review", offers: "offer" };
  return (
    <main id="main-content" className="rh-page">
      <div className="rh-heading"><div><p className="rh-eyebrow">PEOPLE DESK / ESPACE RH</p><h1>{titles[page]}</h1><p className="rh-muted">Gérez vos recrutements et suivez les décisions en un seul endroit.</p></div>
        {canWrite && actions[page] && <button className="rh-primary" type="button" onClick={() => open(actions[page]!)}>+ Ajouter</button>}
      </div>
      {!canWrite && <p role="status" className="rh-panel rh-muted">Accès en lecture seule : les modifications sont réservées aux administrateurs et recruteurs.</p>}
      {page === "dashboard" && <>
        <div className="rh-stats">{[["Postes ouverts",kpis.openJobs],["Candidats actifs",kpis.activeCandidates],["Entretiens à venir",kpis.upcomingInterviews],["Offres en attente",kpis.pendingOffers]].map(([name,count])=><div className="rh-stat" key={name}><span>{name}</span><strong>{count}</strong></div>)}</div>
        <div className="rh-grid"><section className="rh-panel"><h2>Étapes de recrutement</h2>{STAGES.map((stage)=><div className="rh-progress" key={stage}><span>{stageLabel(stage)}</span><div><i style={{width: `${Math.round(100*(stageCounts(data)[stage]||0)/Math.max(1,data.candidates.length))}%`}}/></div><b>{stageCounts(data)[stage]}</b></div>)}</section>
          <section className="rh-panel"><h2>Accès rapide</h2>{[["Candidatures","candidates"],["Entretiens","interviews"],["Postes","jobs"],["Rapports","reports"]].map(([label,href])=><Link className="rh-link" key={href} href={`/${href}`}>{label} <span>→</span></Link>)}<p className="rh-muted">Les données restent dans le navigateur utilisé. Exportez régulièrement une sauvegarde.</p></section></div>
      </>}
      {["jobs","candidates","interviews","reviews","offers"].includes(page) && <div className="rh-toolbar"><input aria-label="Rechercher" placeholder="Rechercher un nom, un poste..." value={search} onChange={(e)=>setSearch(e.target.value)}/>{page==="candidates"&&<select aria-label="Filtrer par étape" value={stageFilter} onChange={(e)=>setStageFilter(e.target.value)}><option value="all">Toutes les étapes</option>{STAGES.map((stage)=><option key={stage} value={stage}>{stageLabel(stage)}</option>)}</select>}</div>}
      {page === "jobs" && <div className="rh-cards">{data.jobs.filter((j)=>matches(j.title+" "+j.department+" "+j.location)).map((job)=><article className="rh-panel" key={job.id}><div className="rh-cardhead"><h2>{job.title}</h2><span className="rh-pill">{job.status}</span></div><p className="rh-muted">{job.department} · {job.location}</p><p>{job.description}</p><p><strong>{job.openings}</strong> poste(s) · {job.salary}</p><p>{data.candidates.filter((c)=>c.jobId===job.id).length} candidature(s)</p><div className="rh-actions"><button disabled={!canWrite} onClick={()=>open("job",job)}>Modifier</button><select disabled={!canWrite} aria-label={`Statut du poste ${job.title}`} value={job.status} onChange={(e)=>notify(store.setJobStatus(job.id,e.target.value as typeof job.status),"Statut modifié")}><option value="open">Ouvert</option><option value="paused">En pause</option><option value="archived">Archivé</option></select></div></article>)}</div>}
      {page === "candidates" && <div className="rh-panel rh-overflow"><table className="rh-table"><thead><tr><th>Candidat</th><th>Poste</th><th>Étape</th><th>Date</th><th>Actions</th></tr></thead><tbody>{candidates.map((candidate)=><tr key={candidate.id}><td><strong>{candidate.name}</strong><small>{candidate.email}</small></td><td>{jobName(candidate.jobId)}</td><td><select disabled={!canWrite} aria-label={`Étape de ${candidate.name}`} value={candidate.stage} onChange={(e)=>notify(store.moveStage(candidate.id,e.target.value as Stage),"Étape modifiée")}>{STAGES.map((stage)=><option value={stage} key={stage}>{stageLabel(stage)}</option>)}</select></td><td>{formatDate(candidate.createdAt,locale)}</td><td><button disabled={!canWrite} onClick={()=>open("candidate",candidate)}>Modifier</button><button disabled={!canWrite} className="rh-danger" onClick={()=>remove("candidate",candidate.id)}>Supprimer</button></td></tr>)}</tbody></table></div>}
      {page === "pipeline" && <div className="rh-kanban">{STAGES.map((stage)=><section className="rh-panel" key={stage}><h2>{stageLabel(stage)} <small>({data.candidates.filter((c)=>c.stage===stage).length})</small></h2>{data.candidates.filter((c)=>c.stage===stage).map((c)=><div className="rh-kanban-card" key={c.id}><strong>{c.name}</strong><small>{jobName(c.jobId)}</small><select disabled={!canWrite} aria-label={`Déplacer ${c.name}`} value={c.stage} onChange={(e)=>notify(store.moveStage(c.id,e.target.value as Stage),"Candidat déplacé")}>{STAGES.map((next)=><option key={next} value={next}>{stageLabel(next)}</option>)}</select></div>)}</section>)}</div>}
      {page === "interviews" && <div className="rh-cards">{data.interviews.filter((i)=>matches(candidateName(i.candidateId)+" "+i.topic)).sort((a,b)=>a.start.localeCompare(b.start)).map((i)=><article className="rh-panel" key={i.id}><div className="rh-cardhead"><h2>{candidateName(i.candidateId)}</h2><span className="rh-pill">{i.status}</span></div><p>{i.topic}</p><p>{formatDate(i.start,locale,{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"})} · {i.duration} min</p><p className="rh-muted">{i.interviewer} · {i.kind}</p><div className="rh-actions"><button disabled={!canWrite} onClick={()=>open("interview",i)}>Modifier</button>{i.status==="scheduled"&&<><button disabled={!canWrite} onClick={()=>notify(store.setInterviewStatus(i.id,"done"),"Entretien terminé")}>Terminer</button><button disabled={!canWrite} onClick={()=>notify(store.setInterviewStatus(i.id,"cancelled"),"Entretien annulé")}>Annuler</button></>}<button disabled={!canWrite} className="rh-danger" onClick={()=>remove("interview",i.id)}>Supprimer</button></div></article>)}</div>}
      {page === "reviews" && <div className="rh-cards">{data.reviews.filter((r)=>matches(candidateName(r.candidateId))).map((r)=><article className="rh-panel" key={r.id}><div className="rh-cardhead"><h2>{candidateName(r.candidateId)}</h2><span className="rh-pill">{r.recommendation}</span></div><p>{r.comments}</p><p className="rh-muted">{r.author} · {formatDate(r.createdAt,locale)}</p><div className="rh-actions"><button disabled={!canWrite} className="rh-danger" onClick={()=>remove("review",r.id)}>Supprimer</button></div></article>)}</div>}
      {page === "offers" && <div className="rh-cards">{data.offers.filter((o)=>matches(candidateName(o.candidateId)+" "+o.title)).map((o)=><article className="rh-panel" key={o.id}><div className="rh-cardhead"><h2>{candidateName(o.candidateId)}</h2><span className="rh-pill">{o.status}</span></div><h3>{o.title}</h3><p className="rh-money">{formatMoney(o.salary,o.currency,locale)}</p><p>Prise de poste : {formatDate(o.startDate,locale)}</p><div className="rh-actions"><button disabled={!canWrite} onClick={()=>open("offer",o)}>Modifier</button>{(["draft","review","approved","sent"].includes(o.status))&&<button disabled={!canWrite} onClick={()=>notify(store.advanceOffer(o.id,({draft:"review",review:"approved",approved:"sent",sent:"accepted"} as Record<string,"review"|"approved"|"sent"|"accepted">)[o.status]),"Offre mise à jour")}>Étape suivante</button>}<button disabled={!canWrite} className="rh-danger" onClick={()=>remove("offer",o.id)}>Supprimer</button></div></article>)}</div>}
      {page === "reports" && <><div className="rh-stats">{[["Candidatures",data.candidates.length],["Embauches",kpis.hires],["Offres acceptées",data.offers.filter((o)=>o.status==="accepted").length],["Taux de conversion",`${reportKpis(data,new Date(0)).conversionRate}%`]].map(([name,val])=><div className="rh-stat" key={name}><span>{name}</span><strong>{val}</strong></div>)}</div><section className="rh-panel"><h2>Exportation des rapports</h2><div className="rh-actions"><button onClick={()=>downloadFile("candidats.csv",candidatesCsv(data,locale),"text/csv")}>Exporter les candidats (CSV)</button><button onClick={()=>downloadFile("postes.csv",jobStatsCsv(jobStats(data),data,locale),"text/csv")}>Exporter les postes (CSV)</button><button onClick={()=>downloadFile("entretiens.ics",calendarIcs(data),"text/calendar")}>Exporter le calendrier (ICS)</button></div></section></>}
      {page === "settings" && <div className="rh-grid"><section className="rh-panel"><h2>Organisation</h2><form className="rh-form" onSubmit={(e)=>{e.preventDefault();notify(store.updateSettings({companyName:settings.companyName??data.settings.companyName,contactEmail:settings.contactEmail??data.settings.contactEmail,hiringLead:settings.hiringLead??data.settings.hiringLead},false),"Paramètres enregistrés");}}>{[["Nom de l’organisation","companyName"],["Adresse de contact","contactEmail"],["Responsable du recrutement","hiringLead"]].map(([label,key])=><label key={key}>{label}<input value={settings[key]??String(data.settings[key as keyof typeof data.settings])} onChange={(e)=>setSettings((s)=>({...s,[key]:e.target.value}))}/></label>)}<button disabled={!canAdmin} className="rh-primary" type="submit">Enregistrer</button></form></section><section className="rh-panel"><h2>Gestion des données</h2><p className="rh-muted">Mode démonstration local : données non partagées entre appareils, sans authentification. N’importez pas de données personnelles sensibles.</p><div className="rh-settings-actions"><button onClick={()=>downloadFile("people-desk-sauvegarde.json",serializeData(data),"application/json")}>Télécharger la sauvegarde JSON</button><label className="rh-file-label">Importer une sauvegarde JSON<input disabled={!canAdmin} type="file" accept=".json,application/json" onChange={async (e)=>{const file=e.target.files?.[0];if(!file)return;try{const incoming=parsePeopleDeskData(JSON.parse(await file.text()));if(!incoming)throw new Error("Structure incorrecte");if(window.confirm("Remplacer les données actuelles ?"))notify(store.importData(incoming),"Sauvegarde importée");}catch{toast({kind:"error",title:"Sauvegarde JSON invalide"});}e.target.value="";}}/></label><button disabled={!canAdmin} className="rh-danger" onClick={()=>{if(window.confirm("Effacer les données locales ? Exportez une sauvegarde avant de continuer."))notify(store.clearAll(),"Données effacées");}}>Effacer les données</button><button disabled={!canAdmin} onClick={()=>{if(window.confirm("Restaurer les exemples et remplacer vos données ?"))notify(store.restoreSeed(),"Démonstration restaurée");}}>Restaurer les exemples</button></div></section></div>}
      {["jobs","candidates","interviews","reviews","offers"].includes(page) && ((page==="jobs"&&data.jobs.length===0)||(page==="candidates"&&candidates.length===0)||(page==="interviews"&&data.interviews.length===0)||(page==="reviews"&&data.reviews.length===0)||(page==="offers"&&data.offers.length===0))&&<p className="rh-panel rh-muted">Aucun résultat. Utilisez « Ajouter » pour créer votre premier enregistrement.</p>}
      {formMode && <div className="rh-modal-backdrop" onMouseDown={(e)=>{if(e.target===e.currentTarget)setFormMode(null)}}><section className="rh-modal" role="dialog" aria-modal="true" aria-labelledby="rh-modal-title"><div className="rh-cardhead"><h2 id="rh-modal-title">{editing?"Modifier":"Ajouter"} : {formMode}</h2><button type="button" onClick={()=>setFormMode(null)} aria-label="Fermer">✕</button></div><form className="rh-form" onSubmit={save}>
        {(formMode==="candidate"||formMode==="interview"||formMode==="review"||formMode==="offer")&&<label>{formMode==="candidate"?"Poste":"Candidat"}<select required value={form[formMode==="candidate"?"jobId":"candidateId"]??""} onChange={(e)=>setForm((s)=>({...s,[formMode==="candidate"?"jobId":"candidateId"]:e.target.value}))}><option value="">Sélectionnez…</option>{getOptions(formMode==="candidate"?"job":"candidate").map((o)=><option key={o.value} value={o.value}>{o.label}</option>)}</select></label>}
        {formMode==="job"&&<label>Type de contrat<select value={form.type??"fulltime"} onChange={(e)=>setForm((s)=>({...s,type:e.target.value}))}><option value="fulltime">CDI</option><option value="contract">Contrat</option><option value="internship">Stage</option></select></label>}
        {formMode==="candidate"&&<label>Source<select value={form.source??"careers"} onChange={(e)=>setForm((s)=>({...s,source:e.target.value}))}>{[["careers","Site carrière"],["referral","Cooptation"],["sourced","Sourcing"],["linkedin","LinkedIn"],["event","Événement"]].map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>}
        {formMode==="interview"&&<label>Format<select value={form.kind??"video"} onChange={(e)=>setForm((s)=>({...s,kind:e.target.value}))}><option value="video">Visio</option><option value="onsite">Sur site</option><option value="phone">Téléphone</option></select></label>}
        {formMode==="review"&&<><label>Recommandation<select value={form.recommendation??"yes"} onChange={(e)=>setForm((s)=>({...s,recommendation:e.target.value}))}>{["strongYes","yes","neutral","no","strongNo"].map((v)=><option key={v} value={v}>{v}</option>)}</select></label>{["skills","communication","problemSolving","culture","motivation"].map((key)=><label key={key}>Note : {key} (1–5)<select value={form[key]??"3"} onChange={(e)=>setForm((s)=>({...s,[key]:e.target.value}))}>{[1,2,3,4,5].map((n)=><option key={n} value={n}>{n}</option>)}</select></label>)}</>}
        {formMode==="offer"&&<label>Devise<select value={form.currency??"EUR"} onChange={(e)=>setForm((s)=>({...s,currency:e.target.value}))}>{["EUR","USD","GBP","CAD","CHF"].map((v)=><option value={v} key={v}>{v}</option>)}</select></label>}
        {columns[formMode].map(({name,label,type,required})=><label key={name}>{label}{type==="textarea"?<textarea required={required} value={form[name]??""} onChange={(e)=>setForm((s)=>({...s,[name]:e.target.value}))}/>:<input type={type} required={required} min={type==="number"?"0":undefined} value={form[name]??""} onChange={(e)=>setForm((s)=>({...s,[name]:e.target.value}))}/>}</label>)}
        {error&&<p className="rh-error" role="alert">{error}</p>}
        <div className="rh-actions"><button type="button" onClick={()=>setFormMode(null)}>Annuler</button><button className="rh-primary" type="submit">Enregistrer</button></div>
      </form></section></div>}
    </main>
  );
}
