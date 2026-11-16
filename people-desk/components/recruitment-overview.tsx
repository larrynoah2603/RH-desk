"use client";

import Link from "next/link";
import {
  ArrowRight, ArrowUpRight, BriefcaseBusiness, CalendarClock,
  CheckCircle2, Clock3, FileCheck2, UserRoundPlus, UsersRound
} from "lucide-react";
import { dashboardKpis, recentCandidates, stageCounts, upcomingInterviews } from "@/lib/domain/metrics";
import { STAGES, type Locale, type PeopleDeskData } from "@/lib/domain/types";
import { STAGE_LABELS, formatDateTime, formatRelative, initials } from "@/lib/domain/labels";
import "./recruitment-overview.css";

type Props = {
  data: PeopleDeskData;
  locale: Locale;
  canWrite: boolean;
  onCreateJob: () => void;
};

const stageTones: Record<string, string> = {
  Applied: "neutral", Screening: "copper", Shortlisted: "blue",
  Interview: "violet", Offer: "gold", Hired: "green", Rejected: "red"
};

export function RecruitmentOverview({ data, locale, canWrite, onCreateJob }: Props) {
  const kpis = dashboardKpis(data);
  const counts = stageCounts(data);
  const interviews = upcomingInterviews(data, 4);
  const newest = recentCandidates(data, 5);
  const activity = [...data.activity].sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, 4);
  const maxStage = Math.max(1, ...STAGES.map((stage) => counts[stage]));
  const candidateById = new Map(data.candidates.map((candidate) => [candidate.id, candidate]));
  const metrics = [
    { label: "Postes ouverts", value: kpis.openJobs, icon: BriefcaseBusiness, helper: "Besoins actifs", href: "/jobs" },
    { label: "Candidats actifs", value: kpis.activeCandidates, icon: UsersRound, helper: "Dans le processus", href: "/candidates" },
    { label: "Entretiens à venir", value: kpis.upcomingInterviews, icon: CalendarClock, helper: "Sur les 7 prochains jours", href: "/interviews" },
    { label: "Offres en cours", value: kpis.pendingOffers, icon: FileCheck2, helper: "À finaliser", href: "/offers" },
  ];
  return (
    <div className="rh-overview">
      <section className="rh-overview-hero" aria-label="Résumé du recrutement">
        <div>
          <span className="rh-overview-kicker">TABLEAU DE PILOTAGE</span>
          <h2>Le recrutement en un regard.</h2>
          <p>Suivez les candidatures, priorisez les échanges et gardez votre équipe alignée.</p>
          <div className="rh-overview-hero-actions">
            <Link href="/candidates">Voir les candidatures <ArrowRight aria-hidden="true" size={16}/></Link>
            {canWrite && <button type="button" onClick={onCreateJob}><UserRoundPlus aria-hidden="true" size={16}/> Créer un poste</button>}
          </div>
        </div>
        <div className="rh-overview-summary" aria-label="Progression des embauches">
          <span>Embauches réalisées</span>
          <strong>{kpis.hires}</strong>
          <small>Depuis le début de l’espace</small>
          <CheckCircle2 aria-hidden="true" size={30}/>
        </div>
      </section>

      <section className="rh-overview-metrics" aria-label="Indicateurs de recrutement">
        {metrics.map(({label, value, icon: Icon, helper, href}) => (
          <Link key={label} className="rh-overview-metric" href={href}>
            <div className="rh-overview-metric-top"><span>{label}</span><Icon aria-hidden="true" size={19}/></div>
            <strong>{value}</strong>
            <div className="rh-overview-metric-foot"><small>{helper}</small><ArrowUpRight size={15} aria-hidden="true"/></div>
          </Link>
        ))}
      </section>

      <div className="rh-overview-layout">
        <section className="rh-overview-panel rh-overview-funnel">
          <div className="rh-overview-panel-heading">
            <div><span className="rh-overview-section-kicker">PROCESSUS</span><h2>Répartition des candidats</h2><p>Étape actuelle de chaque candidature</p></div>
            <Link href="/pipeline" aria-label="Consulter le pipeline">Pipeline <ArrowUpRight size={15} aria-hidden="true"/></Link>
          </div>
          {data.candidates.length === 0 ? (
            <div className="rh-overview-empty"><UsersRound size={24} aria-hidden="true"/><p>Aucune candidature à afficher.</p><Link href="/candidates">Commencer avec un candidat</Link></div>
          ) : (
            <div className="rh-overview-bars" role="list">
              {STAGES.map((stage) => (
                <div className="rh-overview-bar-row" key={stage} role="listitem">
                  <span className="rh-overview-bar-label">{STAGE_LABELS[stage]?.[locale] ?? stage}</span>
                  <div className="rh-overview-bar-track" role="img" aria-label={`${counts[stage]} candidat(s) — ${STAGE_LABELS[stage]?.[locale] ?? stage}`}>
                    <span className={`rh-overview-bar rh-overview-bar-${stageTones[stage]}`} style={{width:`${counts[stage] === 0 ? 0 : Math.max(5,(counts[stage] / maxStage) * 100)}%`}}/>
                  </div>
                  <strong>{counts[stage]}</strong>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rh-overview-panel">
          <div className="rh-overview-panel-heading">
            <div><span className="rh-overview-section-kicker">AGENDA</span><h2>Prochains entretiens</h2><p>Les 7 prochains jours</p></div>
            <Link href="/interviews">Tous <ArrowUpRight size={15} aria-hidden="true"/></Link>
          </div>
          {interviews.length === 0 ? (
            <div className="rh-overview-empty"><CalendarClock size={24} aria-hidden="true"/><p>Aucun entretien à venir cette semaine.</p><Link href="/interviews">Voir les entretiens</Link></div>
          ) : (
            <div className="rh-overview-appointments">
              {interviews.map((interview) => (
                <div className="rh-overview-appointment" key={interview.id}>
                  <div className="rh-overview-appointment-date"><Clock3 size={16} aria-hidden="true"/></div>
                  <div><strong>{candidateById.get(interview.candidateId)?.name ?? "Candidat"}</strong><p>{interview.topic}</p><small>{formatDateTime(interview.start,locale)} · {interview.duration} min</small></div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rh-overview-panel">
          <div className="rh-overview-panel-heading">
            <div><span className="rh-overview-section-kicker">TALENTS</span><h2>Dernières candidatures</h2><p>Les dossiers ajoutés récemment</p></div>
            <Link href="/candidates">Voir tout <ArrowUpRight size={15} aria-hidden="true"/></Link>
          </div>
          {newest.length === 0 ? <div className="rh-overview-empty"><UsersRound size={24} aria-hidden="true"/><p>Les nouveaux candidats apparaîtront ici.</p></div> : (
            <div className="rh-overview-people">
              {newest.map(candidate => (
                <div className="rh-overview-person" key={candidate.id}>
                  <div className="rh-overview-avatar" aria-hidden="true">{initials(candidate.name)}</div>
                  <div><strong>{candidate.name}</strong><small>{data.jobs.find(job=>job.id===candidate.jobId)?.title ?? "Poste non défini"}</small></div>
                  <span className="rh-overview-mini-stage">{STAGE_LABELS[candidate.stage]?.[locale] ?? candidate.stage}</span>
                </div>
              ))}
            </div>
          )}
        </section>
        <section className="rh-overview-panel">
          <div className="rh-overview-panel-heading">
            <div><span className="rh-overview-section-kicker">ACTIVITÉ</span><h2>Activité récente</h2><p>Les dernières actions de recrutement</p></div>
            <span className="rh-overview-live-label"><span/> Journal</span>
          </div>
          {activity.length === 0 ? <div className="rh-overview-empty"><Clock3 size={24} aria-hidden="true"/><p>L’activité récente apparaîtra ici.</p></div> : (
            <ol className="rh-overview-timeline">{activity.map(event => (
              <li key={event.id}><span className="rh-overview-timeline-dot"/><div><p>{event.message[locale]}</p><small>{formatRelative(event.at,locale)}</small></div></li>
            ))}</ol>
          )}
        </section>
      </div>
    </div>
  );
}
