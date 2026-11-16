import type { Activity, Locale } from "./types";

export type ActivityMessage = { key: string; params: Record<string, string | number> };

export type ActivityMessages = Record<string, { fr: string; en: string }>;

export const ACTIVITY_MESSAGES: ActivityMessages = {
  "activity.job.created": { fr: "Poste « {title} » créé", en: "Job \"{title}\" created" },
  "activity.job.updated": { fr: "Poste « {title} » mis à jour", en: "Job \"{title}\" updated" },
  "activity.job.opened": { fr: "Poste « {title} » rouvert", en: "Job \"{title}\" reopened" },
  "activity.job.paused": { fr: "Poste « {title} » mis en pause", en: "Job \"{title}\" paused" },
  "activity.job.archived": { fr: "Poste « {title} » archivé", en: "Job \"{title}\" archived" },
  "activity.job.restored": { fr: "Poste « {title} » restauré", en: "Job \"{title}\" restored" },
  "activity.candidate.created": { fr: "{name} a candidaté au poste {title}", en: "{name} applied to {title}" },
  "activity.candidate.updated": { fr: "Profil de {name} mis à jour", en: "{name}'s profile updated" },
  "activity.candidate.deleted": { fr: "Candidature de {name} supprimée", en: "{name}'s application deleted" },
  "activity.candidate.stage": { fr: "{name} passe de {fromFr} à {toFr}", en: "{name} moved from {fromEn} to {toEn}" },
  "activity.interview.scheduled": { fr: "Entretien planifié avec {name}", en: "Interview scheduled with {name}" },
  "activity.interview.updated": { fr: "Entretien de {name} modifié", en: "Interview with {name} updated" },
  "activity.interview.cancelled": { fr: "Entretien de {name} annulé", en: "Interview with {name} cancelled" },
  "activity.interview.done": { fr: "Entretien de {name} marqué comme terminé", en: "Interview with {name} marked as done" },
  "activity.interview.deleted": { fr: "Entretien de {name} supprimé", en: "Interview with {name} deleted" },
  "activity.review.created": { fr: "Revue de {name} ajoutée", en: "Review for {name} added" },
  "activity.review.deleted": { fr: "Revue de {name} supprimée", en: "Review for {name} deleted" },
  "activity.offer.created": { fr: "Offre rédigée pour {name}", en: "Offer drafted for {name}" },
  "activity.offer.updated": { fr: "Offre de {name} mise à jour", en: "Offer for {name} updated" },
  "activity.offer.status": { fr: "Offre de {name} : {status}", en: "Offer for {name}: {status}" },
  "activity.offer.deleted": { fr: "Offre de {name} supprimée", en: "Offer for {name} deleted" },
  "activity.data.imported": { fr: "Données importées depuis un fichier JSON", en: "Data imported from a JSON file" },
  "activity.data.restored": { fr: "Données d'exemple restaurées", en: "Sample data restored" },
  "activity.data.cleared": { fr: "Espace de travail réinitialisé", en: "Workspace cleared" },
  "activity.settings.updated": { fr: "Préférences du workspace mises à jour", en: "Workspace settings updated" },
  "activity.note.added": { fr: "Note ajoutée sur {name}", en: "Note added on {name}" },
};

export function resolveActivityMessage(message: Activity["message"], locale: Locale): string {
  return message[locale];
}

export function formatTemplate(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in params ? String(params[key]) : match));
}
