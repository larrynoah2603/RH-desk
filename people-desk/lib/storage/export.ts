import { CRITERION_LABELS, formatDate, OFFER_STATUS_LABELS, STAGE_LABELS } from "@/lib/domain/labels";
import { averageScore } from "@/lib/domain/validation";
import { CRITERIA, type Interview, type Locale, type PeopleDeskData } from "@/lib/domain/types";
import type { JobStatRow } from "@/lib/domain/metrics";

export function serializeData(data: PeopleDeskData): string {
  return JSON.stringify(data, null, 2);
}

export function downloadFile(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function todayStamp(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

function csvCell(value: string | number): string {
  const text = String(value);
  return /[",\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(rows: (string | number)[][]): string {
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}

export function jobStatsCsv(rows: JobStatRow[], data: PeopleDeskData, locale: Locale): string {
  const header = [
    locale === "fr" ? "Poste" : "Job",
    locale === "fr" ? "Département" : "Department",
    locale === "fr" ? "Statut" : "Status",
    locale === "fr" ? "Candidatures" : "Applications",
    locale === "fr" ? "Entretiens" : "Interviews",
    locale === "fr" ? "Offres" : "Offers",
    locale === "fr" ? "Embauches" : "Hires",
    locale === "fr" ? "Conversion (%)" : "Conversion (%)",
  ];
  const statusLabels: Record<string, string> = { open: locale === "fr" ? "Ouvert" : "Open", paused: locale === "fr" ? "En pause" : "Paused", archived: locale === "fr" ? "Archivé" : "Archived" };
  return toCsv([
    header,
    ...rows.map((row) => [row.title, row.department, statusLabels[row.status] ?? row.status, row.applications, row.interviews, row.offers, row.hires, row.conversion]),
  ]);
}

export function candidatesCsv(data: PeopleDeskData, locale: Locale): string {
  const header = [
    locale === "fr" ? "Nom" : "Name",
    "Email",
    locale === "fr" ? "Poste" : "Job",
    locale === "fr" ? "Étape" : "Stage",
    locale === "fr" ? "Source" : "Source",
    locale === "fr" ? "Candidature" : "Applied",
    locale === "fr" ? "Compétences" : "Skills",
  ];
  return toCsv([
    header,
    ...data.candidates.map((candidate) => [
      candidate.name,
      candidate.email,
      data.jobs.find((job) => job.id === candidate.jobId)?.title ?? "",
      STAGE_LABELS[candidate.stage][locale],
      candidate.source,
      candidate.createdAt.slice(0, 10),
      candidate.skills.join(" · "),
    ]),
  ]);
}

export function reviewsCsv(data: PeopleDeskData, locale: Locale): string {
  const header = [
    locale === "fr" ? "Candidat" : "Candidate",
    locale === "fr" ? "Date" : "Date",
    ...CRITERIA.map((criterion) => CRITERION_LABELS[criterion][locale]),
    locale === "fr" ? "Moyenne" : "Average",
    locale === "fr" ? "Recommandation" : "Recommendation",
    locale === "fr" ? "Auteur" : "Author",
  ];
  return toCsv([
    header,
    ...data.reviews.map((review) => [
      data.candidates.find((candidate) => candidate.id === review.candidateId)?.name ?? "",
      review.createdAt.slice(0, 10),
      ...CRITERIA.map((criterion) => review.scores[criterion]),
      averageScore(review.scores),
      review.recommendation,
      review.author,
    ]),
  ]);
}

export function offersCsv(data: PeopleDeskData, locale: Locale): string {
  const header = [
    locale === "fr" ? "Candidat" : "Candidate",
    locale === "fr" ? "Intitulé" : "Title",
    locale === "fr" ? "Salaire" : "Salary",
    "Devise",
    locale === "fr" ? "Date de début" : "Start date",
    "Statut",
  ];
  return toCsv([
    header,
    ...data.offers.map((offer) => [
      data.candidates.find((candidate) => candidate.id === offer.candidateId)?.name ?? "",
      offer.title,
      offer.salary,
      offer.currency,
      offer.startDate,
      OFFER_STATUS_LABELS[offer.status][locale],
    ]),
  ]);
}

// ---------------------------------------------------------------- ICS

function icsDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function escapeIcs(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

function icsEvent(interview: Interview, summary: string, description: string, location: string): string[] {
  const start = new Date(interview.start);
  const end = new Date(start.getTime() + interview.duration * 60_000);
  return [
    "BEGIN:VEVENT",
    `UID:${interview.id}@people-desk.local`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(start)}`,
    `DTEND:${icsDate(end)}`,
    `SUMMARY:${escapeIcs(summary)}`,
    `DESCRIPTION:${escapeIcs(description)}`,
    `LOCATION:${escapeIcs(location)}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
  ];
}

export function interviewIcs(data: PeopleDeskData, interview: Interview, locale: Locale): string {
  const candidate = data.candidates.find((item) => item.id === interview.candidateId);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//People Desk//EN",
    "CALSCALE:GREGORIAN",
    ...icsEvent(
      interview,
      `${interview.topic} — ${candidate?.name ?? ""}`,
      [interview.notes, candidate ? `${candidate.name} · ${candidate.email}` : ""].filter(Boolean).join("\n"),
      interview.kind === "onsite" ? (locale === "fr" ? "Sur site" : "On-site") : interview.kind === "phone" ? (locale === "fr" ? "Téléphone" : "Phone") : "Video",
    ),
    "END:VCALENDAR",
  ];
  return lines.join("\r\n");
}

export function calendarIcs(data: PeopleDeskData): string {
  const events = data.interviews
    .filter((interview) => interview.status !== "cancelled")
    .flatMap((interview) => {
      const candidate = data.candidates.find((item) => item.id === interview.candidateId);
      return icsEvent(interview, `${interview.topic} — ${candidate?.name ?? ""}`, candidate?.email ?? "", interview.interviewer);
    });
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//People Desk//EN", "CALSCALE:GREGORIAN", ...events, "END:VCALENDAR"].join("\r\n");
}

export function reportTitle(data: PeopleDeskData, locale: Locale): string {
  return `${data.settings.companyName} — ${locale === "fr" ? "rapport de recrutement" : "hiring report"} · ${formatDate(new Date().toISOString(), locale)}`;
}
