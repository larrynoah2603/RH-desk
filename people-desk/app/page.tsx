"use client";

import Link from "next/link";
import { useNow, useWorkspaceData } from "@/lib/storage/store";
import { usePrefs } from "@/lib/i18n";
import { formatTime } from "@/lib/domain/labels";
import { dashboardKpis } from "@/lib/domain/metrics";

export default function LandingPage() {
  const { locale, setLocale, t } = usePrefs();
  const data = useWorkspaceData();
  const now = useNow();
  const kpis = dashboardKpis(data, now);
  const jobs = new Map(data.jobs.map((job) => [job.id, job.title]));
  const todayAgenda = data.interviews
    .filter((interview) => interview.status !== "cancelled" && new Date(interview.start).toDateString() === now.toDateString())
    .sort((a, b) => a.start.localeCompare(b.start))
    .slice(0, 3);

  return (
    <main className="cover-shell">
      <div className="cover-shade" aria-hidden="true" />
      <div className="cover-inner">
        <header className="cover-topline">
          <span>{t.landing.topLeft}</span>
          <button
            type="button"
            className="cover-locale"
            onClick={() => setLocale(locale === "fr" ? "en" : "fr")}
            aria-label={t.landing.language}
          >
            {locale === "fr" ? "FR / en" : "fr / EN"}
          </button>
        </header>

        <section className="cover-title-block" aria-label={t.landing.title}>
          <h1 className="cover-kicker">{t.landing.kicker.toUpperCase()}</h1>
          <div className="cover-stack" aria-hidden="true">
            <article className="cover-screen cover-screen-back">
              <div className="screen-topline"><span className="screen-brand"><i />PEOPLE DESK</span><span>{t.landing.overview}</span></div>
              <div className="screen-heading"><b>{t.landing.overview}</b><small>{data.settings.companyName.toUpperCase()}</small></div>
              <div className="screen-kpis">
                <span><small>{t.landing.openJobs}</small><b>{kpis.openJobs}</b></span>
                <span><small>{t.landing.activeCandidates}</small><b>{kpis.activeCandidates}</b></span>
                <span><small>{t.landing.interviewsToday}</small><b>{todayAgenda.length}</b></span>
                <span><small>{t.landing.reviewsTosync}</small><b>{data.reviews.length}</b></span>
              </div>
              <div className="screen-lines"><i /><i /><i /><i /></div>
            </article>
            <article className="cover-screen cover-screen-middle">
              <div className="screen-topline"><span className="screen-brand"><i />PIPELINE</span><span>7 STAGES</span></div>
              <div className="screen-heading"><b>{t.landing.pipeline}</b><small>{t.landing.pill1.toUpperCase()}</small></div>
              <div className="screen-columns">
                {(["Applied", "Screening", "Interview"] as const).map((stage) => (
                  <span key={stage}>
                    <b>{stage}</b><em>{data.candidates.filter((candidate) => candidate.stage === stage).length}</em>
                    <i /><i />
                  </span>
                ))}
              </div>
            </article>
            <article className="cover-screen cover-screen-front">
              <div className="screen-topline"><span className="screen-brand"><i />AGENDA</span><span>{t.landing.agenda.toUpperCase()}</span></div>
              <div className="screen-heading"><b>{t.landing.agenda}</b><small>{now.toLocaleDateString(locale === "fr" ? "fr-FR" : "en-GB", { weekday: "long", day: "numeric", month: "long" }).toUpperCase()}</small></div>
              <div className="screen-agenda">
                {(todayAgenda.length ? todayAgenda : data.interviews.slice(0, 3)).map((interview) => {
                  const candidate = data.candidates.find((item) => item.id === interview.candidateId);
                  return (
                    <span key={interview.id}>
                      <b>{formatTime(interview.start, "en")}</b>
                      <i />
                      <strong>{candidate?.name ?? "—"}</strong>
                      <small>{jobs.get(candidate?.jobId ?? "") ?? ""}</small>
                    </span>
                  );
                })}
              </div>
            </article>
          </div>
          <p className="cover-subtitle">{t.landing.subtitle}</p>
          <div className="cover-mark" aria-hidden="true"><i /><i /></div>
        </section>

        <footer className="cover-footer">
          <div className="cover-columns">
            <p>{t.landing.colReadTitle}<br />{t.landing.colReadSub}</p>
            <p>{t.landing.colAskTitle}<br />{t.landing.colAskSub}</p>
            <p>{t.landing.colOneTitle}<br />{t.landing.colOneSub}</p>
          </div>
          <div className="cover-rule" aria-hidden="true" />
          <div className="cover-bottomline">
            <span>
              <a href={`mailto:${t.landing.contact}`}>{t.landing.contact.toUpperCase()}</a>
              <br />
              <small>{t.landing.footerNote}</small>
            </span>
            <Link href="/dashboard" className="cover-enter">{t.landing.enter.toUpperCase()}<i>→</i></Link>
          </div>
        </footer>
      </div>
    </main>
  );
}
