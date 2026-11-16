"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, Building2, MapPin, PauseCircle, SlidersHorizontal, UsersRound } from "lucide-react";
import { JOB_STATUSES, STAGES, type Job, type JobStatus, type Locale, type PeopleDeskData, type Stage } from "@/lib/domain/types";
import { JOB_STATUS_LABELS, JOB_TYPE_LABELS, STAGE_LABELS, formatDate, initials } from "@/lib/domain/labels";
import "./hiring-operations.css";

type JobsProps = {
  data: PeopleDeskData;
  jobs: Job[];
  locale: Locale;
  canWrite: boolean;
  onEdit: (job: Job) => void;
  onStatus: (id: string, status: JobStatus) => void;
  onCreate: () => void;
};

export function HiringJobs({ data, jobs, locale, canWrite, onEdit, onStatus, onCreate }: JobsProps) {
  const [status, setStatus] = useState<JobStatus | "all">("all");
  const [sort, setSort] = useState<"recent" | "title" | "applications">("recent");
  const counts = Object.fromEntries(JOB_STATUSES.map(key => [key, data.jobs.filter(job => job.status === key).length])) as Record<JobStatus,number>;
  const candidatesPerJob = (id:string) => data.candidates.filter(candidate=>candidate.jobId===id).length;
  const filtered = jobs.filter(job=>status==="all" || job.status===status).sort((a,b)=>{
    if(sort==="title")return a.title.localeCompare(b.title,locale);
    if(sort==="applications")return candidatesPerJob(b.id)-candidatesPerJob(a.id);
    return Date.parse(b.createdAt)-Date.parse(a.createdAt);
  });

  return <div className="rh-jobs-pro">
    <div className="rh-jobs-summary" aria-label="Résumé des postes">
      <div><span>Postes au total</span><strong>{data.jobs.length}</strong></div>
      <div><span>Ouverts</span><strong>{counts.open}</strong></div>
      <div><span>En pause</span><strong>{counts.paused}</strong></div>
      <div><span>Archivés</span><strong>{counts.archived}</strong></div>
    </div>
    <div className="rh-jobs-controls">
      <div className="rh-jobs-tabs" role="group" aria-label="Filtrer les postes par statut">
        <button type="button" aria-pressed={status==="all"} onClick={()=>setStatus("all")}>Tous</button>
        {JOB_STATUSES.map(key=><button type="button" key={key} aria-pressed={status===key} onClick={()=>setStatus(key)}>{JOB_STATUS_LABELS[key]?.[locale] ?? key}</button>)}
      </div>
      <label className="rh-jobs-sort"><SlidersHorizontal size={15} aria-hidden="true"/><span className="sr-only">Trier les postes</span><select aria-label="Trier les postes" value={sort} onChange={event=>setSort(event.target.value as typeof sort)}>
        <option value="recent">Plus récents</option><option value="title">Intitulé A–Z</option><option value="applications">Plus de candidatures</option>
      </select></label>
    </div>
    {filtered.length===0 ? <div className="rh-hiring-empty">
      <BriefcaseBusiness size={28} aria-hidden="true"/><h2>Aucun poste à afficher</h2><p>Changez vos filtres ou créez un nouveau poste pour commencer.</p>
      <div><button type="button" onClick={()=>setStatus("all")}>Afficher tous les postes</button>{canWrite&&<button type="button" className="rh-primary" onClick={onCreate}>+ Créer un poste</button>}</div>
    </div> : <div className="rh-jobs-card-grid">{filtered.map(job=>{
      const count=candidatesPerJob(job.id);
      return <article className="rh-job-card" key={job.id}>
        <div className="rh-job-card-top">
          <div className="rh-job-card-mark" aria-hidden="true"><BriefcaseBusiness size={19}/></div>
          <span className={"rh-job-status rh-job-status-"+job.status}><span aria-hidden="true"/>{JOB_STATUS_LABELS[job.status]?.[locale]??job.status}</span>
        </div>
        <h2>{job.title}</h2>
        <div className="rh-job-meta"><span><Building2 size={14} aria-hidden="true"/>{job.department}</span><span><MapPin size={14} aria-hidden="true"/>{job.location}</span></div>
        <p className="rh-job-description">{job.description}</p>
        <div className="rh-job-tags"><span>{JOB_TYPE_LABELS[job.type]?.[locale]??job.type}</span><span>{job.openings} poste{job.openings>1?"s":""} à pourvoir</span></div>
        <div className="rh-job-card-footer">
          <div><UsersRound size={16} aria-hidden="true"/><strong>{count}</strong><span>candidature{count>1?"s":""}</span></div>
          <small>Créé le {formatDate(job.createdAt,locale)}</small>
        </div>
        <div className="rh-job-actions">
          {canWrite?<><button type="button" onClick={()=>onEdit(job)}>Modifier</button>
          <select aria-label={"Statut du poste "+job.title} value={job.status} onChange={event=>onStatus(job.id,event.target.value as JobStatus)}>
            {JOB_STATUSES.map(key=><option key={key} value={key}>{JOB_STATUS_LABELS[key]?.[locale]??key}</option>)}
          </select></>:
          <span className="rh-job-readonly">Consultation uniquement</span>}
          <Link href="/candidates">Candidatures <ArrowRight size={14} aria-hidden="true"/></Link>
        </div>
      </article>;
    })}</div>}
  </div>;
}

type PipelineProps={
  data:PeopleDeskData;
  locale:Locale;
  canWrite:boolean;
  onMove:(id:string,stage:Stage)=>void;
};

export function HiringPipeline({data,locale,canWrite,onMove}:PipelineProps){
  const [jobId,setJobId]=useState("all");
  const [term,setTerm]=useState("");
  const scoped=data.candidates.filter(candidate=>(jobId==="all"||candidate.jobId===jobId) &&
    (candidate.name+" "+candidate.email+" "+(data.jobs.find(job=>job.id===candidate.jobId)?.title??"")).toLocaleLowerCase().includes(term.trim().toLocaleLowerCase()));
  const jobName=(id:string)=>data.jobs.find(job=>job.id===id)?.title??"Poste non défini";
  const active=scoped.filter(candidate=>candidate.stage!=="Hired"&&candidate.stage!=="Rejected").length;
  return <div className="rh-pipeline-pro">
    <div className="rh-pipeline-intro">
      <div><span className="rh-pipeline-kicker">VUE OPÉRATIONNELLE</span><h2>Suivez chaque candidature, étape par étape.</h2><p>Déplacez les talents dans le processus de recrutement sans perdre leur historique.</p></div>
      <div className="rh-pipeline-total"><strong>{active}</strong><span>en cours</span></div>
    </div>
    <div className="rh-pipeline-controls">
      <label><span className="sr-only">Choisir un poste dans le pipeline</span><BriefcaseBusiness size={17} aria-hidden="true"/><select value={jobId} aria-label="Filtrer le pipeline par poste" onChange={e=>setJobId(e.target.value)}>
        <option value="all">Tous les postes</option>
        {data.jobs.map(job=><option value={job.id} key={job.id}>{job.title}</option>)}
      </select></label>
      <label><span className="sr-only">Rechercher dans le pipeline</span><input type="search" placeholder="Rechercher un candidat…" aria-label="Rechercher dans le pipeline" value={term} onChange={e=>setTerm(e.target.value)}/></label>
      <span>{scoped.length} candidature{scoped.length>1?"s":""}</span>
    </div>
    <div className="rh-pipeline-scroll" role="region" tabIndex={0} aria-label="Colonnes du pipeline de recrutement">
      <div className="rh-pipeline-columns">{STAGES.map(stage=>{
        const members=scoped.filter(candidate=>candidate.stage===stage);
        return <section key={stage} className="rh-pipeline-column" aria-label={(STAGE_LABELS[stage]?.[locale]??stage)+", "+members.length+" candidats"}>
          <header><span className={"rh-pipeline-stage-dot rh-pipeline-dot-"+stage}/><h3>{STAGE_LABELS[stage]?.[locale]??stage}</h3><span className="rh-pipeline-count">{members.length}</span></header>
          <div className="rh-pipeline-lane">{members.map(candidate=><article key={candidate.id} className="rh-pipeline-card">
            <div className="rh-pipeline-person"><span className="rh-pipeline-avatar" aria-hidden="true">{initials(candidate.name)}</span><div><strong>{candidate.name}</strong><small>{jobName(candidate.jobId)}</small></div></div>
            <small className="rh-pipeline-date">Ajouté le {formatDate(candidate.createdAt,locale)}</small>
            {canWrite?<label className="rh-pipeline-move"><span className="sr-only">Déplacer {candidate.name}</span>
              <select aria-label={"Déplacer "+candidate.name} value={candidate.stage} onChange={e=>onMove(candidate.id,e.target.value as Stage)}>{STAGES.map(next=><option key={next} value={next}>{STAGE_LABELS[next]?.[locale]??next}</option>)}</select>
            </label>:<span className="rh-pipeline-readonly">Lecture seule</span>}
          </article>)}
            {members.length===0&&<p className="rh-pipeline-empty">Aucun candidat</p>}
          </div>
        </section>;
      })}</div>
    </div>
    <div className="rh-pipeline-footnote"><PauseCircle size={15} aria-hidden="true"/><span>Les modifications d’étape sont enregistrées dans l’historique de chaque candidat.</span><Link href="/candidates">Voir les fiches <ArrowRight size={14} aria-hidden="true"/></Link></div>
  </div>;
}
