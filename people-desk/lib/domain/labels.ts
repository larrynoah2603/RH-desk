import type { Locale } from "./types";

type LabelPair = { fr: string; en: string };
export type LabelMap<K extends string = string> = Record<K, LabelPair>;

export const STAGE_LABELS: LabelMap = {
  Applied: { fr: "Candidature", en: "Applied" },
  Screening: { fr: "Pré-qualification", en: "Screening" },
  Shortlisted: { fr: "Présélection", en: "Shortlisted" },
  Interview: { fr: "Entretien", en: "Interview" },
  Offer: { fr: "Offre", en: "Offer" },
  Hired: { fr: "Embauché", en: "Hired" },
  Rejected: { fr: "Refusé", en: "Rejected" },
};

export const JOB_STATUS_LABELS: LabelMap = {
  open: { fr: "Ouvert", en: "Open" },
  paused: { fr: "En pause", en: "Paused" },
  archived: { fr: "Archivé", en: "Archived" },
};

export const JOB_TYPE_LABELS: LabelMap = {
  fulltime: { fr: "CDI", en: "Full-time" },
  contract: { fr: "Contrat", en: "Contract" },
  internship: { fr: "Stage", en: "Internship" },
};

export const DEPARTMENT_LABELS: LabelMap = {
  Design: { fr: "Design", en: "Design" },
  Engineering: { fr: "Ingénierie", en: "Engineering" },
  Product: { fr: "Produit", en: "Product" },
  People: { fr: "RH", en: "People" },
  Data: { fr: "Data", en: "Data" },
  Marketing: { fr: "Marketing", en: "Marketing" },
};

export const SOURCE_LABELS: LabelMap = {
  careers: { fr: "Site carrière", en: "Careers site" },
  referral: { fr: "Cooptation", en: "Referral" },
  sourced: { fr: "Sourcing", en: "Sourced" },
  linkedin: { fr: "LinkedIn", en: "LinkedIn" },
  event: { fr: "Événement", en: "Event" },
};

export const INTERVIEW_KIND_LABELS: LabelMap = {
  video: { fr: "Visio", en: "Video" },
  onsite: { fr: "Sur site", en: "On-site" },
  phone: { fr: "Téléphone", en: "Phone" },
};

export const INTERVIEW_STATUS_LABELS: LabelMap = {
  scheduled: { fr: "Planifié", en: "Scheduled" },
  done: { fr: "Terminé", en: "Done" },
  cancelled: { fr: "Annulé", en: "Cancelled" },
};

export const CRITERION_LABELS: LabelMap = {
  skills: { fr: "Compétences techniques", en: "Technical skills" },
  communication: { fr: "Communication", en: "Communication" },
  problemSolving: { fr: "Résolution de problèmes", en: "Problem solving" },
  culture: { fr: "Adéquation culturelle", en: "Culture fit" },
  motivation: { fr: "Motivation", en: "Motivation" },
};

export const RECOMMENDATION_LABELS: LabelMap = {
  strongYes: { fr: "Oui, fortement", en: "Strong yes" },
  yes: { fr: "Oui", en: "Yes" },
  neutral: { fr: "Neutre", en: "Neutral" },
  no: { fr: "Non", en: "No" },
  strongNo: { fr: "Non, fermement", en: "Strong no" },
};

export const OFFER_STATUS_LABELS: LabelMap = {
  draft: { fr: "Brouillon", en: "Draft" },
  review: { fr: "En révision", en: "In review" },
  approved: { fr: "Approuvée", en: "Approved" },
  sent: { fr: "Envoyée", en: "Sent" },
  accepted: { fr: "Acceptée", en: "Accepted" },
  declined: { fr: "Déclinée", en: "Declined" },
};

export function label(map: LabelMap, key: string, locale: Locale): string {
  return map[key]?.[locale] ?? key;
}

const CURRENCY_LOCALES: Record<string, string> = { EUR: "fr-FR", USD: "en-US", GBP: "en-GB", CAD: "fr-CA", CHF: "de-CH" };

export function formatMoney(amount: number, currency: string, locale: Locale): string {
  try {
    return new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-GB", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString(CURRENCY_LOCALES[currency] ?? "fr-FR")} ${currency}`;
  }
}

export function formatDate(iso: string, locale: Locale, options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", options).format(date);
}

export function formatDateTime(iso: string, locale: Locale): string {
  return formatDate(iso, locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function formatTime(iso: string, locale: Locale): string {
  return formatDate(iso, locale, { hour: "2-digit", minute: "2-digit" });
}

export function formatMonth(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", { month: "long", year: "numeric" }).format(date);
}

export function weekday(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", { weekday: "short" }).format(date);
}

export function formatRelative(iso: string, locale: Locale, now = new Date()): string {
  const date = new Date(iso);
  const diffMs = date.getTime() - now.getTime();
  const minutes = Math.round(diffMs / 60_000);
  const formatter = new Intl.RelativeTimeFormat(locale === "fr" ? "fr" : "en", { numeric: "auto" });
  const abs = Math.abs(minutes);
  if (abs < 60) return formatter.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return formatter.format(hours, "hour");
  const days = Math.round(hours / 24);
  if (Math.abs(days) < 30) return formatter.format(days, "day");
  return formatDate(iso, locale);
}

export function daysSince(iso: string, now = new Date()): number {
  const date = new Date(iso);
  return Math.max(0, Math.floor((now.getTime() - date.getTime()) / 86_400_000));
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function toLocalInput(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function fromLocalInput(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}
