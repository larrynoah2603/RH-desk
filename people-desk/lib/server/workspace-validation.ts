import {
  CRITERIA, INTERVIEW_KINDS, INTERVIEW_STATUSES, JOB_STATUSES, JOB_TYPES,
  OFFER_STATUSES, RECOMMENDATIONS, SOURCES, STAGES,
  type PeopleDeskData,
} from "@/lib/domain/types";
import { EMAIL_RE, parsePeopleDeskData } from "@/lib/domain/validation";

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function text(value: unknown, limit = 2000): value is string {
  return typeof value === "string" && value.length <= limit;
}
function optionalText(value: unknown, limit = 2000): boolean {
  return value === undefined || text(value, limit);
}
function timestamp(value: unknown): boolean {
  return typeof value === "string" && value.length <= 48 && Number.isFinite(Date.parse(value));
}
function date(value: unknown): boolean {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value));
}
function oneOf(value: unknown, allowed: readonly string[]): boolean {
  return typeof value === "string" && allowed.includes(value);
}
function uniqueIds(entries: unknown[]): boolean {
  const ids = entries.map((item) => record(item) ? item.id : undefined);
  return ids.every((id) => text(id, 120) && id.length > 0) && new Set(ids).size === ids.length;
}
function skills(value: unknown): boolean {
  return Array.isArray(value) && value.length <= 12 && value.every((v) => text(v, 100));
}
function isValidActivity(value: unknown): boolean {
  if (!record(value)) return false;
  return text(value.id, 120) && timestamp(value.at) && text(value.type, 80) &&
    record(value.message) && text(value.message.fr, 500) && text(value.message.en, 500);
}

export function validateWorkspaceSnapshot(raw: unknown): raw is PeopleDeskData {
  const data = parsePeopleDeskData(raw);
  if (!data) return false;
  const { settings, jobs, candidates, interviews, reviews, offers, activity } = data;
  if (jobs.length > 1000 || candidates.length > 20000 || interviews.length > 40000 ||
      reviews.length > 40000 || offers.length > 20000 || activity.length > 1000) return false;
  if (!record(settings) || !text(settings.companyName, 120) || !text(settings.hiringLead, 120) ||
      !text(settings.contactEmail, 254) || !oneOf(settings.locale, ["fr","en"]) ||
      !oneOf(settings.theme, ["auto","light","dark"]) ||
      !oneOf(settings.density, ["normal","compact"])) return false;
  if (!timestamp(data.savedAt)) return false;
  if (![jobs, candidates, interviews, reviews, offers, activity].every(uniqueIds)) return false;

  for (const job of jobs) {
    if (!text(job.title, 100) || !text(job.department, 100) || !text(job.location, 200) ||
        !oneOf(job.type, JOB_TYPES) || !oneOf(job.status, JOB_STATUSES) ||
        !Number.isInteger(job.openings) || job.openings < 0 || job.openings > 1000 ||
        !text(job.salary, 200) || !text(job.description, 10000) ||
        !text(job.owner, 120) || !skills(job.skills) || !timestamp(job.createdAt) ||
        !optionalText(job.archivedAt, 48)) return false;
  }
  const jobIds = new Set(jobs.map((j) => j.id));
  for (const candidate of candidates) {
    if (!text(candidate.name, 120) || !text(candidate.email, 254) ||
        !EMAIL_RE.test(candidate.email) || !jobIds.has(candidate.jobId) ||
        !oneOf(candidate.stage, STAGES) || !oneOf(candidate.source, SOURCES) ||
        !optionalText(candidate.phone, 80) || !optionalText(candidate.location, 200) ||
        !optionalText(candidate.summary, 5000) || !skills(candidate.skills) ||
        !timestamp(candidate.createdAt) || !timestamp(candidate.updatedAt) ||
        !Array.isArray(candidate.stageHistory) || !candidate.stageHistory.length || candidate.stageHistory.length > 500 ||
        !candidate.stageHistory.every((entry) => record(entry) &&
          oneOf(entry.stage, STAGES) && timestamp(entry.at) && optionalText(entry.note, 1000)) ||
        !Array.isArray(candidate.notes) || candidate.notes.length > 1000 ||
        !candidate.notes.every((n) => record(n) && text(n.id, 120) && text(n.text, 2000) && timestamp(n.at)) ||
        !Array.isArray(candidate.experiences) || candidate.experiences.length > 100 ||
        !candidate.experiences.every((exp) => record(exp) &&
          text(exp.id, 120) && text(exp.company, 200) && text(exp.role, 200) &&
          text(exp.from, 80) && optionalText(exp.to, 80) && optionalText(exp.summary, 3000))) return false;
  }
  const candidateIds = new Set(candidates.map((c) => c.id));
  for (const interview of interviews) {
    if (!candidateIds.has(interview.candidateId) || !timestamp(interview.start) ||
        !Number.isInteger(interview.duration) || interview.duration < 1 || interview.duration > 1440 ||
        !text(interview.interviewer, 120) || !text(interview.topic, 300) ||
        !optionalText(interview.notes, 5000) || !oneOf(interview.kind, INTERVIEW_KINDS) ||
        !oneOf(interview.status, INTERVIEW_STATUSES) || !timestamp(interview.createdAt)) return false;
  }
  const interviewIds = new Set(interviews.map((i) => i.id));
  for (const review of reviews) {
    if (!candidateIds.has(review.candidateId) ||
        (review.interviewId !== undefined && !interviewIds.has(review.interviewId)) ||
        !oneOf(review.recommendation, RECOMMENDATIONS) || !record(review.scores) ||
        !CRITERIA.every((k) => Number.isInteger(review.scores[k]) && (review.scores[k] as number) >= 1 && (review.scores[k] as number) <= 5) ||
        !text(review.comments, 5000) || !optionalText(review.strengths, 4000) ||
        !optionalText(review.risks, 4000) || !text(review.author, 120) ||
        !timestamp(review.createdAt)) return false;
  }
  for (const offer of offers) {
    if (!candidateIds.has(offer.candidateId) || !Number.isFinite(offer.salary) ||
        offer.salary < 0 || offer.salary > 100000000000 ||
        !text(offer.currency, 3) || !date(offer.startDate) || !text(offer.title, 200) ||
        !optionalText(offer.notes, 5000) || !oneOf(offer.status, OFFER_STATUSES) ||
        !timestamp(offer.createdAt) || !timestamp(offer.updatedAt)) return false;
  }
  return activity.every(isValidActivity);
}
