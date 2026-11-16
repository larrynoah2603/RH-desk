"use client";

import { useState } from "react";
import {
  CalendarCheck2, CalendarDays, CheckCircle2, ChevronRight, ClipboardCheck,
  Clock3, FileText, Mail, MessageSquareText, Pencil, Send,
  ShieldCheck, SlidersHorizontal, Trash2, UserRoundCheck, UsersRound, Video
} from "lucide-react";
import {
  CRITERIA, OFFER_STATUSES, type Interview, type InterviewStatus, type Locale,
  type Offer, type OfferStatus, type PeopleDeskData, type Review
} from "@/lib/domain/types";
import {
  CRITERION_LABELS, INTERVIEW_KIND_LABELS, INTERVIEW_STATUS_LABELS,
  OFFER_STATUS_LABELS, RECOMMENDATION_LABELS, formatDate, formatDateTime,
  formatMoney, initials,
} from "@/lib/domain/labels";
import { averageScore } from "@/lib/domain/validation";
import "./decisions-workspace.css";

const label = (items: Record<string,{fr:string;en:string}>,key:string,locale:Locale) => items[key]?.[locale] ?? key;
const candidateName = (data:PeopleDeskData,id:string) => data.candidates.find(c=>c.id===id)?.name ?? "Candidat inconnu";
const roleName = (data:PeopleDeskData,id:string) => {
  const candidate = data.candidates.find(c=>c.id===id);
  return data.jobs.find(j=>j.id===candidate?.jobId)?.title ?? "Poste non défini";
};
const dateOrder = (date:string) => Number.isFinite(Date.parse(date)) ? Date.parse(date) : 0;

type InterviewProps = {
  data: PeopleDeskData;
  interviews: Interview[];
  locale: Locale;
  canWrite: boolean;
  onCreate: () => void;
  onEdit: (interview:Interview) => void;
  onStatus: (id:string,status:InterviewStatus) => void;
  onReview: (candidateId:string,interviewId:string) => void;
  onDelete: (id:string) => void;
};

export function InterviewsWorkspace({
  data, interviews, locale, canWrite, onCreate, onEdit, onStatus, onReview, onDelete
}:InterviewProps) {
  const [sort,setSort] = useState<"upcoming"|"newest">("upcoming");
  const entries = [...interviews].sort((a,b)=>sort==="upcoming"?dateOrder(a.start)-dateOrder(b.start):dateOrder(b.start)-dateOrder(a.start));
  const scheduled = data.interviews.filter(i=>i.status==="scheduled").length;
  const completed = data.interviews.filter(i=>i.status==="done").length;
  const cancelled = data.interviews.filter(i=>i.status==="cancelled").length;
  const confirmCancel = (id:string) => {
    if (window.confirm("Annuler cet entretien ? Il restera visible dans l’historique.")) onStatus(id,"cancelled");
  };
  return <section className="rh-decision-stack" aria-label="Gestion des entretiens">
    <div className="rh-decision-metrics">
      <div><CalendarDays size={19} aria-hidden="true"/><span>Planifiés</span><strong>{scheduled}</strong></div>
      <div><CalendarCheck2 size={19} aria-hidden="true"/><span>Terminés</span><strong>{completed}</strong></div>
      <div><Clock3 size={19} aria-hidden="true"/><span>Annulés</span><strong>{cancelled}</strong></div>
    </div>
    <div className="rh-decision-toolbar">
      <p>{entries.length} entretien{entries.length>1?"s":""} affiché{entries.length>1?"s":""}</p>
      <label><SlidersHorizontal size={15} aria-hidden="true"/><span className="sr-only">Trier les entretiens</span><select aria-label="Trier les entretiens" value={sort} onChange={e=>setSort(e.target.value as typeof sort)}><option value="upcoming">Date croissante</option><option value="newest">Date décroissante</option></select></label>
    </div>
    {entries.length===0 ? <EmptyState icon="interview" title="Aucun entretien à afficher" details="Ajustez vos filtres ou planifiez un échange avec un candidat." canWrite={canWrite} action="Planifier un entretien" onAction={onCreate}/> :
      <div className="rh-decision-grid">{entries.map(item=>{
        const name=candidateName(data,item.candidateId);
        const reviewed=data.reviews.some(review=>review.interviewId===item.id);
        return <article className="rh-decision-card rh-interview-card" key={item.id}>
          <div className="rh-decision-card-head"><span className="rh-decision-eyebrow">ENTRETIEN</span><span className={"rh-decision-status rh-decision-status-"+item.status}>{label(INTERVIEW_STATUS_LABELS,item.status,locale)}</span></div>
          <h2>{name}</h2>
          <p className="rh-decision-subtitle">{roleName(data,item.candidateId)}</p>
          <h3>{item.topic}</h3>
          <div className="rh-decision-details">
            <div><CalendarDays size={16} aria-hidden="true"/><span>{formatDateTime(item.start,locale)}</span></div>
            <div><Clock3 size={16} aria-hidden="true"/><span>{item.duration} minutes</span></div>
            <div><UsersRound size={16} aria-hidden="true"/><span>{item.interviewer}</span></div>
            <div><Video size={16} aria-hidden="true"/><span>{label(INTERVIEW_KIND_LABELS,item.kind,locale)}</span></div>
          </div>
          {item.notes&&<p className="rh-decision-annotation">{item.notes}</p>}
          {reviewed&&<p className="rh-decision-positive"><CheckCircle2 size={15} aria-hidden="true"/> Évaluation associée</p>}
          <div className="rh-decision-card-actions">
            {canWrite&&<>
              <button type="button" onClick={()=>onEdit(item)}><Pencil size={14} aria-hidden="true"/> Modifier</button>
              {item.status==="scheduled"&&<>
                <button type="button" className="rh-decision-main" onClick={()=>onStatus(item.id,"done")}><CheckCircle2 size={14} aria-hidden="true"/> Terminer</button>
                <button type="button" onClick={()=>confirmCancel(item.id)}>Annuler</button>
              </>}
              {item.status==="done"&&!reviewed&&<button type="button" className="rh-decision-main" onClick={()=>onReview(item.candidateId,item.id)}><ClipboardCheck size={14} aria-hidden="true"/> Évaluer</button>}
              <button type="button" className="rh-decision-destructive" aria-label={"Supprimer l'entretien de "+name} onClick={()=>onDelete(item.id)}><Trash2 size={15} aria-hidden="true"/></button>
            </>}
          </div>
        </article>;
      })}</div>}
  </section>;
}

type ReviewProps={
  data:PeopleDeskData;
  reviews:Review[];
  locale:Locale;
  canWrite:boolean;
  onCreate:()=>void;
  onEdit:(review:Review)=>void;
  onDelete:(id:string)=>void;
};

export function ReviewsWorkspace({data,reviews,locale,canWrite,onCreate,onEdit,onDelete}:ReviewProps){
  const [recommendation,setRecommendation]=useState("all");
  const entries=[...reviews].filter(r=>recommendation==="all"||r.recommendation===recommendation).sort((a,b)=>dateOrder(b.createdAt)-dateOrder(a.createdAt));
  const average=reviews.length?reviews.reduce((total,review)=>total+averageScore(review.scores),0)/reviews.length:0;
  return <section className="rh-decision-stack" aria-label="Évaluations des candidats">
    <div className="rh-decision-banner">
      <div><span className="rh-decision-eyebrow">SCORECARDS</span><h2>Des décisions étayées, des évaluations structurées.</h2><p>Comparez les compétences avec les mêmes critères pour chaque candidature.</p></div>
      <div className="rh-decision-banner-metric"><strong>{average.toFixed(1)}<small>/5</small></strong><span>Moyenne des évaluations affichées</span></div>
    </div>
    <div className="rh-decision-toolbar"><p>{entries.length} évaluation{entries.length>1?"s":""} · {data.reviews.length} au total</p>
      <label><SlidersHorizontal size={15} aria-hidden="true"/><span className="sr-only">Filtrer les recommandations</span><select aria-label="Filtrer les recommandations" value={recommendation} onChange={e=>setRecommendation(e.target.value)}><option value="all">Toutes les recommandations</option>{["strongYes","yes","neutral","no","strongNo"].map(key=><option key={key} value={key}>{label(RECOMMENDATION_LABELS,key,locale)}</option>)}</select></label>
    </div>
    {entries.length===0?<EmptyState icon="review" title="Aucune évaluation à afficher" details="Rédigez une première évaluation pour conserver les décisions de l’équipe." canWrite={canWrite} action="Créer une évaluation" onAction={onCreate}/>:
      <div className="rh-decision-grid">{entries.map(item=>{
        const score=averageScore(item.scores);
        return <article key={item.id} className="rh-decision-card rh-review-card">
          <div className="rh-decision-card-head"><span className="rh-decision-eyebrow">FICHE D’ÉVALUATION</span><span className="rh-decision-score">{score.toFixed(1)} <small>/5</small></span></div>
          <h2>{candidateName(data,item.candidateId)}</h2><p className="rh-decision-subtitle">{roleName(data,item.candidateId)}</p>
          <p className="rh-decision-recommendation"><ShieldCheck size={15} aria-hidden="true"/>{label(RECOMMENDATION_LABELS,item.recommendation,locale)}</p>
          <div className="rh-review-score-list">{CRITERIA.map(key=><div key={key}>
            <div><span>{label(CRITERION_LABELS,key,locale)}</span><strong>{item.scores[key]}/5</strong></div>
            <div className="rh-review-score-track" role="img" aria-label={label(CRITERION_LABELS,key,locale)+": "+item.scores[key]+" sur 5"}><span style={{width:(item.scores[key]/5)*100+"%"}}/></div>
          </div>)}</div>
          <blockquote className="rh-decision-feedback">{item.comments}</blockquote>
          {(item.strengths||item.risks)&&<div className="rh-review-notes">{item.strengths&&<p><strong>Points forts :</strong> {item.strengths}</p>}{item.risks&&<p><strong>Points de vigilance :</strong> {item.risks}</p>}</div>}
          <p className="rh-decision-card-meta">{item.author} · {formatDate(item.createdAt,locale)}</p>
          {canWrite&&<div className="rh-decision-card-actions"><button type="button" onClick={()=>onEdit(item)}><Pencil size={14} aria-hidden="true"/> Modifier</button><button type="button" className="rh-decision-destructive" aria-label={"Supprimer l'évaluation de "+candidateName(data,item.candidateId)} onClick={()=>onDelete(item.id)}><Trash2 size={15} aria-hidden="true"/></button></div>}
        </article>;
      })}</div>}
  </section>;
}

type OfferProps={
  data:PeopleDeskData;
  offers:Offer[];
  locale:Locale;
  canWrite:boolean;
  onCreate:()=>void;
  onEdit:(offer:Offer)=>void;
  onAdvance:(id:string,status:OfferStatus)=>void;
  onDecline:(id:string)=>void;
  onDelete:(id:string)=>void;
};

const nextStep:Partial<Record<OfferStatus,{to:OfferStatus;label:string}>>={
  draft:{to:"review",label:"Soumettre à révision"},
  review:{to:"approved",label:"Approuver l’offre"},
  approved:{to:"sent",label:"Marquer comme envoyée"},
};
const OFFER_PROGRESS:OfferStatus[]=["draft","review","approved","sent","accepted"];

export function OffersWorkspace({data,offers,locale,canWrite,onCreate,onEdit,onAdvance,onDecline,onDelete}:OfferProps) {
  const [filter,setFilter]=useState<"all"|OfferStatus>("all");
  const entries=[...offers].filter(o=>filter==="all"||o.status===filter).sort((a,b)=>dateOrder(b.updatedAt)-dateOrder(a.updatedAt));
  const pending=data.offers.filter(offer=>!["accepted","declined"].includes(offer.status)).length;
  const accepted=data.offers.filter(offer=>offer.status==="accepted").length;
  const confirmStep=(offer:Offer,target:OfferStatus)=>{
    if(target==="sent"&&!window.confirm("Confirmez-vous avoir envoyé cette offre au candidat ? RH Desk ne transmet aucun e-mail automatiquement."))return;
    if(target==="accepted"&&!window.confirm("Avez-vous reçu la confirmation d’acceptation du candidat ? Cette action marquera aussi le candidat comme embauché."))return;
    onAdvance(offer.id,target);
  };
  const confirmDecline=(offer:Offer)=>{
    if(window.confirm("Avez-vous reçu le refus du candidat ? Cette action marque seulement l’offre comme déclinée."))onDecline(offer.id);
  };
  return <section className="rh-decision-stack" aria-label="Suivi des offres d'embauche">
    <div className="rh-offer-metrics"><div><FileText size={20} aria-hidden="true"/><span>Offres au total</span><strong>{data.offers.length}</strong></div>
      <div><Clock3 size={20} aria-hidden="true"/><span>En cours</span><strong>{pending}</strong></div>
      <div><UserRoundCheck size={20} aria-hidden="true"/><span>Acceptées</span><strong>{accepted}</strong></div></div>
    <p className="rh-decision-disclaimer"><Mail size={16} aria-hidden="true"/> Les statuts « Envoyée » et « Acceptée » sont saisis manuellement. Aucun e-mail n’est envoyé par RH Desk.</p>
    <div className="rh-decision-toolbar"><p>{entries.length} offre{entries.length>1?"s":""} affichée{entries.length>1?"s":""}</p>
      <label><SlidersHorizontal size={15} aria-hidden="true"/><span className="sr-only">Filtrer les offres par statut</span><select aria-label="Filtrer les offres par statut" value={filter} onChange={e=>setFilter(e.target.value as typeof filter)}>
        <option value="all">Tous les statuts</option>{OFFER_STATUSES.map(key=><option value={key} key={key}>{label(OFFER_STATUS_LABELS,key,locale)}</option>)}</select></label></div>
    {entries.length===0?<EmptyState icon="offer" title="Aucune offre à afficher" details="Préparez votre première proposition d’embauche ou changez le filtre de statut." canWrite={canWrite} action="Préparer une offre" onAction={onCreate}/>:
      <div className="rh-decision-grid">{entries.map(offer=>{
        const next=nextStep[offer.status];
        const progressIndex=OFFER_PROGRESS.indexOf(offer.status);
        return <article className="rh-decision-card rh-offer-card" key={offer.id}>
          <div className="rh-decision-card-head"><span className="rh-decision-eyebrow">PROPOSITION D’EMBAUCHE</span><span className={"rh-decision-status rh-decision-status-"+offer.status}>{label(OFFER_STATUS_LABELS,offer.status,locale)}</span></div>
          <h2>{candidateName(data,offer.candidateId)}</h2><p className="rh-decision-subtitle">{roleName(data,offer.candidateId)}</p>
          <div className="rh-offer-salary"><span>Rémunération proposée</span><strong>{formatMoney(offer.salary,offer.currency,locale)}</strong></div>
          <div className="rh-offer-start"><CalendarDays size={16} aria-hidden="true"/><span>Prise de poste : {formatDate(offer.startDate,locale)}</span></div>
          <ol className="rh-offer-progress" aria-label={"Progression de l’offre pour "+candidateName(data,offer.candidateId)}>
            {OFFER_PROGRESS.map((step,index)=><li key={step} className={offer.status==="declined"?"":index<=progressIndex?"is-complete":""} aria-current={step===offer.status?"step":undefined}><span aria-hidden="true">{index<progressIndex?<CheckCircle2 size={16}/>:index+1}</span><small>{label(OFFER_STATUS_LABELS,step,locale)}</small></li>)}
          </ol>
          {offer.status==="declined"&&<p className="rh-decision-warning">Cette proposition a été déclinée.</p>}
          {offer.notes&&<p className="rh-decision-annotation">{offer.notes}</p>}
          {canWrite&&<div className="rh-decision-card-actions">
            {["draft","review","approved"].includes(offer.status)&&<button type="button" onClick={()=>onEdit(offer)}><Pencil size={14} aria-hidden="true"/> Modifier</button>}
            {next&&<button type="button" className="rh-decision-main" onClick={()=>confirmStep(offer,next.to)}>{next.to==="sent"?<Send size={14} aria-hidden="true"/>:<ChevronRight size={14} aria-hidden="true"/>}{next.label}</button>}
            {offer.status==="sent"&&<>
              <button type="button" className="rh-decision-main" onClick={()=>confirmStep(offer,"accepted")}><CheckCircle2 size={14} aria-hidden="true"/> Marquer acceptée</button>
              <button type="button" onClick={()=>confirmDecline(offer)}>Marquer déclinée</button>
            </>}
            {["draft","review"].includes(offer.status)&&<button type="button" className="rh-decision-destructive" aria-label={"Supprimer l'offre de "+candidateName(data,offer.candidateId)} onClick={()=>onDelete(offer.id)}><Trash2 size={15} aria-hidden="true"/></button>}
          </div>}
        </article>;
      })}</div>}
  </section>;
}

function EmptyState({icon,title,details,canWrite,action,onAction}:{
  icon:"interview"|"review"|"offer";title:string;details:string;canWrite:boolean;action:string;onAction:()=>void;
}){
  const Icon=icon==="interview"?CalendarDays:icon==="review"?MessageSquareText:FileText;
  return <div className="rh-decision-empty" role="status"><Icon size={29} aria-hidden="true"/><h2>{title}</h2><p>{details}</p>{canWrite&&<button type="button" onClick={onAction}>{action}<ChevronRight size={15} aria-hidden="true"/></button>}</div>;
}
