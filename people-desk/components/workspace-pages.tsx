"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useStore, useWorkspaceData, useRemoteStatus } from "@/lib/storage/store";
import { dashboardKpis, jobStats, reportKpis } from "@/lib/domain/metrics";
import { RecruitmentOverview } from "@/components/recruitment-overview";
import { CandidateDirectory } from "@/components/candidate-directory";
import { HiringJobs, HiringPipeline } from "@/components/hiring-operations";
import { InterviewsWorkspace, ReviewsWorkspace, OffersWorkspace } from "@/components/decisions-workspace";
import { STAGES, type Stage } from "@/lib/domain/types";
import { STAGE_LABELS, RECOMMENDATION_LABELS, CRITERION_LABELS, formatDate } from "@/lib/domain/labels";
import { validateCandidate, validateInterview, validateJob, validateOffer, validateReview } from "@/lib/domain/validation";
import { downloadFile, serializeData, candidatesCsv, jobStatsCsv, calendarIcs } from "@/lib/storage/export";
import { parsePeopleDeskData } from "@/lib/domain/validation";
import { useToast } from "@/components/toast-provider";
import { usePrefs } from "@/lib/i18n";
import "./workspace-pages.css";

export type WorkspacePage = "dashboard" | "jobs" | "candidates" | "pipeline" | "interviews" | "reviews" | "offers" | "reports" | "settings";
type FormMode = "job" | "candidate" | "interview" | "review" | "offer" | null;
type FormData = Record<string, string>;
const descriptions: Record<WorkspacePage, string> = {
  dashboard: "Vos indicateurs et prochaines actions, en un regard.",
  jobs: "Publiez, mettez en pause et suivez vos besoins de recrutement.",
  candidates: "Retrouvez vos talents et faites progresser chaque candidature.",
  pipeline: "Une vue par étape pour suivre chaque parcours candidat.",
  interviews: "Préparez les échanges et suivez leurs résultats.",
  reviews: "Centralisez les retours pour une décision éclairée.",
  offers: "Préparez et suivez vos propositions d’embauche.",
  reports: "Analysez les recrutements et exportez vos données.",
  settings: "Configurez l’organisation et gérez les sauvegardes.",
};
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
  const [interviewFilter, setInterviewFilter] = useState("all");
  useEffect(() => {
    if (!formMode) return;
    const onEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setFormMode(null); };
    window.addEventListener("keydown", onEscape);
    const focusId = window.requestAnimationFrame(() => {
      const control = document.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(".rh-modal select, .rh-modal input, .rh-modal textarea");
      control?.focus();
    });
    return () => { window.removeEventListener("keydown", onEscape); window.cancelAnimationFrame(focusId); };
  }, [formMode]);
  const kpis = dashboardKpis(data);
  const jobName = (id: string) => data.jobs.find((job) => job.id === id)?.title ?? "Poste inconnu";
  const candidateName = (id: string) => data.candidates.find((candidate) => candidate.id === id)?.name ?? "Candidat inconnu";
  const matches = (value: string) => value.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase());
  const candidates = data.candidates.filter((c) => matches(c.name + " " + c.email + " " + jobName(c.jobId)) && (stageFilter === "all" || c.stage === stageFilter));
  const filteredJobs = data.jobs.filter((j) => matches(j.title + " " + j.department + " " + j.location));
  const filteredInterviews = data.interviews.filter((i) => matches(candidateName(i.candidateId) + " " + i.topic) && (interviewFilter === "all" || i.status === interviewFilter)).sort((a,b) => a.start.localeCompare(b.start));
  const filteredReviews = data.reviews.filter((r) => matches(candidateName(r.candidateId)));
  const filteredOffers = data.offers.filter((o) => matches(candidateName(o.candidateId) + " " + o.title));
  const isSeed = data.settings.companyName === "Northline Studio" && data.jobs.some((j) => j.id === "job_product_designer");
  const prerequisitesMissing = page === "candidates" && data.jobs.length === 0 || ["interviews","reviews","offers"].includes(page) && data.candidates.length === 0;
  const emptyMessage = search.trim() ? "Aucun résultat pour cette recherche." : "Aucun enregistrement pour le moment.";
  const localized = (group: Record<string,{fr:string;en:string}>, key: string) => group[key]?.[locale] ?? key;
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
    if (mode === "interview" && values.start) { const date = new Date(values.start); values.start = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0,16); }
    if (mode === "interview" && !values.duration) values.duration = "45";
    if (mode === "job" && !values.openings) values.openings = "1";
    if (mode === "review") {
      const scores = item?.scores && typeof item.scores === "object" && !Array.isArray(item.scores) ? item.scores as Record<string,unknown> : {};
      for (const k of ["skills", "communication", "problemSolving", "culture", "motivation"]) values[k] = typeof scores[k] === "number" ? String(scores[k]) : "3";
    }
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
      if (Object.keys(validateReview(input, data.candidates)).length || (input.interviewId && !data.interviews.some((interview)=>interview.id===input.interviewId && interview.candidateId===input.candidateId))) return setError("Vérifiez le candidat, l’entretien associé, les critères et les commentaires.");
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
    <div className="rh-page">
      <div className="rh-heading"><div><p className="rh-eyebrow">PEOPLE DESK / ESPACE RH</p><h1>{titles[page]}</h1><p className="rh-muted">{descriptions[page]}</p></div>
        {canWrite && actions[page] && !prerequisitesMissing && <button className="rh-primary" type="button" onClick={() => open(actions[page]!)}>+ Ajouter</button>}
      </div>
      {isSeed && <div className="rh-notice" role="status"><span aria-hidden="true">✦</span><div><strong>Espace de démonstration</strong><p>Ces données fictives « Northline Studio » servent uniquement aux essais. Ne les confondez pas avec des dossiers réels.</p></div><Link href="/settings">Gérer les données →</Link></div>}
      {!canWrite && <p role="status" className="rh-panel rh-muted">Accès en lecture seule : les modifications sont réservées aux administrateurs et recruteurs.</p>}
      {page === "dashboard" && <RecruitmentOverview data={data} locale={locale} canWrite={canWrite} onCreateJob={() => open("job")} />}
      {["jobs","candidates","interviews","reviews","offers"].includes(page) && <div className="rh-toolbar"><label className="rh-search-field"><span className="sr-only">Rechercher des enregistrements</span><input aria-label="Rechercher" placeholder="Rechercher un nom, un poste..." value={search} onChange={(e)=>setSearch(e.target.value)}/></label>{search && <button type="button" onClick={()=>setSearch("")} aria-label="Effacer la recherche">Effacer ×</button>}{page==="interviews"&&<select aria-label="Filtrer les entretiens par statut" value={interviewFilter} onChange={(e)=>setInterviewFilter(e.target.value)}><option value="all">Tous les entretiens</option><option value="scheduled">Planifiés</option><option value="done">Terminés</option><option value="cancelled">Annulés</option></select>}{page==="candidates"&&<select aria-label="Filtrer par étape" value={stageFilter} onChange={(e)=>setStageFilter(e.target.value)}><option value="all">Toutes les étapes</option>{STAGES.map((stage)=><option key={stage} value={stage}>{stageLabel(stage)}</option>)}</select>}</div>}
      {page === "jobs" && <HiringJobs data={data} jobs={filteredJobs} locale={locale} canWrite={canWrite}
        onCreate={()=>open("job")}
        onEdit={(job)=>open("job",job)}
        onStatus={(id,status)=>notify(store.setJobStatus(id,status),"Statut modifié")}
      />}
      {page === "candidates" && <CandidateDirectory
        data={data} candidates={candidates} locale={locale} canWrite={canWrite}
        onEdit={(candidate) => open("candidate",candidate)}
        onRemove={(id) => remove("candidate",id)}
        onStageChange={(id,stage) => notify(store.moveStage(id,stage),"Étape modifiée")}
        onAddNote={(id,note) => notify(store.addNote(id,note),"Note ajoutée")}
      />}
      {page === "pipeline" && <HiringPipeline data={data} locale={locale} canWrite={canWrite}
        onMove={(id,stage)=>notify(store.moveStage(id,stage),"Candidat déplacé")}
      />}
      {page === "interviews" && <InterviewsWorkspace
        data={data} interviews={filteredInterviews} locale={locale} canWrite={canWrite && data.candidates.length>0}
        onCreate={()=>open("interview")}
        onEdit={(item)=>open("interview",item)}
        onStatus={(id,status)=>notify(store.setInterviewStatus(id,status),status==="done"?"Entretien terminé":"Entretien annulé")}
        onReview={(candidateId,interviewId)=>open("review",{candidateId,interviewId})}
        onDelete={(id)=>remove("interview",id)}
      />}
      {page === "reviews" && <ReviewsWorkspace
        data={data} reviews={filteredReviews} locale={locale} canWrite={canWrite && data.candidates.length>0}
        onCreate={()=>open("review")}
        onEdit={(item)=>open("review",item)}
        onDelete={(id)=>remove("review",id)}
      />}
      {page === "offers" && <OffersWorkspace
        data={data} offers={filteredOffers} locale={locale} canWrite={canWrite && data.candidates.length>0}
        onCreate={()=>open("offer")}
        onEdit={(item)=>open("offer",item)}
        onAdvance={(id,status)=>notify(store.advanceOffer(id,status),"Statut de l’offre actualisé")}
        onDecline={(id)=>notify(store.declineOffer(id),"Offre marquée comme déclinée")}
        onDelete={(id)=>remove("offer",id)}
      />}
      {page === "reports" && <><div className="rh-stats">{[["Candidatures",data.candidates.length],["Embauches",kpis.hires],["Offres acceptées",data.offers.filter((o)=>o.status==="accepted").length],["Taux de conversion",`${reportKpis(data,new Date(0)).conversionRate}%`]].map(([name,val])=><div className="rh-stat" key={name}><span>{name}</span><strong>{val}</strong></div>)}</div><section className="rh-panel"><h2>Exportation des rapports</h2><div className="rh-actions"><button onClick={()=>downloadFile("candidats.csv",candidatesCsv(data,locale),"text/csv")}>Exporter les candidats (CSV)</button><button onClick={()=>downloadFile("postes.csv",jobStatsCsv(jobStats(data),data,locale),"text/csv")}>Exporter les postes (CSV)</button><button onClick={()=>downloadFile("entretiens.ics",calendarIcs(data),"text/calendar")}>Exporter le calendrier (ICS)</button></div></section></>}
      {page === "settings" && <div className="rh-grid"><section className="rh-panel"><h2>Organisation</h2><form className="rh-form" onSubmit={(e)=>{e.preventDefault();notify(store.updateSettings({companyName:settings.companyName??data.settings.companyName,contactEmail:settings.contactEmail??data.settings.contactEmail,hiringLead:settings.hiringLead??data.settings.hiringLead},false),"Paramètres enregistrés");}}>{[["Nom de l’organisation","companyName"],["Adresse de contact","contactEmail"],["Responsable du recrutement","hiringLead"]].map(([label,key])=><label key={key}>{label}<input value={settings[key]??String(data.settings[key as keyof typeof data.settings])} onChange={(e)=>setSettings((s)=>({...s,[key]:e.target.value}))}/></label>)}<button disabled={!canAdmin} className="rh-primary" type="submit">Enregistrer</button></form></section><section className="rh-panel"><h2>Gestion des données</h2><p className="rh-muted">Mode démonstration local : données non partagées entre appareils, sans authentification. N’importez pas de données personnelles sensibles.</p><div className="rh-settings-actions"><button onClick={()=>downloadFile("people-desk-sauvegarde.json",serializeData(data),"application/json")}>Télécharger la sauvegarde JSON</button><label className="rh-file-label">Importer une sauvegarde JSON<input disabled={!canAdmin} type="file" accept=".json,application/json" onChange={async (e)=>{const file=e.target.files?.[0];if(!file)return;try{const incoming=parsePeopleDeskData(JSON.parse(await file.text()));if(!incoming)throw new Error("Structure incorrecte");if(window.confirm("Remplacer les données actuelles ?"))notify(store.importData(incoming),"Sauvegarde importée");}catch{toast({kind:"error",title:"Sauvegarde JSON invalide"});}e.target.value="";}}/></label><button disabled={!canAdmin} className="rh-danger" onClick={()=>{if(window.confirm("Effacer les données locales ? Exportez une sauvegarde avant de continuer."))notify(store.clearAll(),"Données effacées");}}>Effacer les données</button><button disabled={!canAdmin} onClick={()=>{if(window.confirm("Restaurer les exemples et remplacer vos données ?"))notify(store.restoreSeed(),"Démonstration restaurée");}}>Restaurer les exemples</button></div></section></div>}
      {formMode && <div className="rh-modal-backdrop" onMouseDown={(e)=>{if(e.target===e.currentTarget)setFormMode(null)}}><section className="rh-modal" role="dialog" aria-modal="true" aria-labelledby="rh-modal-title" aria-describedby="rh-modal-help"><div className="rh-cardhead"><h2 id="rh-modal-title">{editing?"Modifier":"Ajouter"} : {formMode}</h2><button type="button" onClick={()=>setFormMode(null)} aria-label="Fermer">✕</button></div><p className="rh-muted" id="rh-modal-help">Renseignez les champs obligatoires (*) puis enregistrez.</p><form className="rh-form" onSubmit={save}>
        {(formMode==="candidate"||formMode==="interview"||formMode==="review"||formMode==="offer")&&<label>{formMode==="candidate"?"Poste":"Candidat"}<select required value={form[formMode==="candidate"?"jobId":"candidateId"]??""} onChange={(e)=>setForm((s)=>({...s,[formMode==="candidate"?"jobId":"candidateId"]:e.target.value,...(formMode==="review"?{interviewId:""}:{})}))} disabled={formMode==="offer"&&Boolean(editing)}><option value="">Sélectionnez…</option>{getOptions(formMode==="candidate"?"job":"candidate").map((o)=><option key={o.value} value={o.value}>{o.label}</option>)}</select></label>}
        {formMode==="job"&&<label>Type de contrat<select value={form.type??"fulltime"} onChange={(e)=>setForm((s)=>({...s,type:e.target.value}))}><option value="fulltime">CDI</option><option value="contract">Contrat</option><option value="internship">Stage</option></select></label>}
        {formMode==="candidate"&&<label>Source<select value={form.source??"careers"} onChange={(e)=>setForm((s)=>({...s,source:e.target.value}))}>{[["careers","Site carrière"],["referral","Cooptation"],["sourced","Sourcing"],["linkedin","LinkedIn"],["event","Événement"]].map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>}
        {formMode==="interview"&&<label>Format<select value={form.kind??"video"} onChange={(e)=>setForm((s)=>({...s,kind:e.target.value}))}><option value="video">Visio</option><option value="onsite">Sur site</option><option value="phone">Téléphone</option></select></label>}
        {formMode==="review"&&<><label>Entretien associé (facultatif)<select aria-label="Entretien associé" value={form.interviewId??""} onChange={(e)=>setForm((prev)=>({...prev,interviewId:e.target.value}))}><option value="">Aucun entretien associé</option>{data.interviews.filter((item)=>item.candidateId===form.candidateId).map((item)=><option key={item.id} value={item.id}>{formatDate(item.start,locale)} · {item.topic}</option>)}</select></label><label>Recommandation<select value={form.recommendation??"yes"} onChange={(e)=>setForm((prev)=>({...prev,recommendation:e.target.value}))}>{["strongYes","yes","neutral","no","strongNo"].map((key)=><option key={key} value={key}>{RECOMMENDATION_LABELS[key]?.[locale]??key}</option>)}</select></label>{["skills","communication","problemSolving","culture","motivation"].map((key)=><label key={key}>Note : {CRITERION_LABELS[key]?.[locale]??key} (1–5)<select value={form[key]??"3"} onChange={(e)=>setForm((prev)=>({...prev,[key]:e.target.value}))}>{[1,2,3,4,5].map((number)=><option key={number} value={number}>{number}</option>)}</select></label>)}</>}
        {formMode==="offer"&&<label>Devise<select value={form.currency??"EUR"} onChange={(e)=>setForm((s)=>({...s,currency:e.target.value}))}>{["MGA","EUR","USD","GBP","CAD","CHF"].map((v)=><option value={v} key={v}>{v}</option>)}</select></label>}
        {columns[formMode].map(({name,label,type,required})=><label key={name}>{label}{required ? " *" : ""}{type==="textarea"?<textarea required={required} value={form[name]??""} onChange={(e)=>setForm((s)=>({...s,[name]:e.target.value}))}/>:<input type={type} required={required} min={type==="number"?"0":undefined} value={form[name]??""} onChange={(e)=>setForm((s)=>({...s,[name]:e.target.value}))}/>}</label>)}
        {error&&<p className="rh-error" role="alert" id="rh-form-error">{error}</p>}
        <div className="rh-actions"><button type="button" onClick={()=>setFormMode(null)}>Annuler</button><button className="rh-primary" type="submit">Enregistrer</button></div>
      </form></section></div>}
    </div>
  );
}
