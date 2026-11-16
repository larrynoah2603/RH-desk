import {
  CRITERIA,
  INTERVIEW_KINDS,
  JOB_STATUSES,
  JOB_TYPES,
  OFFER_STATUSES,
  RECOMMENDATIONS,
  SOURCES,
  STAGES,
  type Candidate,
  type Criterion,
  type Interview,
  type Job,
  type Offer,
  type PeopleDeskData,
  type Review,
  type Stage,
  type WorkspaceSettings,
} from "./types";

/** Messages de validation résolus dans la langue active (clé i18n). */
export type ValidationErrors = Record<string, string>;

export type JobInput = {
  title: string;
  department: string;
  location: string;
  type: string;
  openings: string | number;
  salary: string;
  description: string;
  skills: string | string[];
  owner?: string;
};

export type CandidateInput = {
  name: string;
  email: string;
  phone?: string;
  jobId: string;
  source: string;
  location?: string;
  summary?: string;
  skills: string | string[];
  stage?: Stage;
  experiences?: Candidate["experiences"];
};

export type InterviewInput = {
  candidateId: string;
  start: string;
  duration: string | number;
  interviewer: string;
  kind: string;
  topic: string;
  notes?: string;
  status?: Interview["status"];
};

export type ReviewInput = {
  candidateId: string;
  interviewId?: string;
  scores: Partial<Record<Criterion, number>>;
  comments: string;
  strengths?: string;
  risks?: string;
  recommendation: string;
  author?: string;
};

export type OfferInput = {
  candidateId: string;
  salary: string | number;
  currency?: string;
  startDate: string;
  title?: string;
  notes?: string;
};

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const CURRENCIES = ["MGA", "EUR", "USD", "GBP", "CAD", "CHF"] as const;

export function normalizeSkills(value: string | string[]): string[] {
  const list = Array.isArray(value) ? value : value.split(",");
  const seen = new Set<string>();
  return list
    .map((item) => item.trim())
    .filter((item) => {
      if (!item) return false;
      const key = item.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 12);
}

function parseInteger(value: string | number): number {
  const parsed = typeof value === "number" ? value : Number.parseInt(value.replace(/\s/g, ""), 10);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

export function parseSalary(value: string | number): number {
  if (typeof value === "number") return value;
  return Number(value.replace(/[^\d.]/g, ""));
}

export function validateJob(input: JobInput): ValidationErrors {
  const errors: ValidationErrors = {};
  if (!input.title.trim()) errors.title = "job.titleRequired";
  else if (input.title.trim().length > 80) errors.title = "job.titleTooLong";
  if (!input.department.trim()) errors.department = "job.departmentRequired";
  if (!input.location.trim()) errors.location = "job.locationRequired";
  if (!JOB_TYPES.includes(input.type as Job["type"])) errors.type = "job.typeRequired";
  const openings = parseInteger(input.openings);
  if (!Number.isInteger(openings) || openings < 1 || openings > 100) errors.openings = "job.openingsInvalid";
  if (!input.salary.trim()) errors.salary = "job.salaryRequired";
  if (!input.description.trim()) errors.description = "job.descriptionRequired";
  else if (input.description.trim().length > 2000) errors.description = "job.descriptionTooLong";
  return errors;
}

export function checkCandidateEmail(
  email: string,
  jobId: string,
  candidates: Candidate[],
  ignoreId?: string,
): string | null {
  const normalized = email.trim().toLowerCase();
  const duplicate = candidates.find(
    (candidate) => candidate.id !== ignoreId && candidate.jobId === jobId && candidate.email.toLowerCase() === normalized,
  );
  return duplicate ? "candidate.emailDuplicate" : null;
}

export function validateCandidate(input: CandidateInput, candidates: Candidate[], ignoreId?: string): ValidationErrors {
  const errors: ValidationErrors = {};
  const name = input.name.trim();
  if (!name) errors.name = "candidate.nameRequired";
  else if (name.length > 80) errors.name = "candidate.nameTooLong";
  const email = input.email.trim();
  if (!email) errors.email = "candidate.emailRequired";
  else if (!EMAIL_RE.test(email) || email.length > 254) errors.email = "candidate.emailInvalid";
  else {
    const duplicate = checkCandidateEmail(email, input.jobId, candidates, ignoreId);
    if (duplicate) errors.email = duplicate;
  }
  if (input.phone && input.phone.trim().length > 40) errors.phone = "candidate.phoneInvalid";
  if (!input.jobId) errors.jobId = "candidate.jobRequired";
  if (!SOURCES.includes(input.source as Candidate["source"])) errors.source = "candidate.sourceRequired";
  if (!normalizeSkills(input.skills).length) errors.skills = "candidate.skillsRequired";
  return errors;
}

export function validateInterview(input: InterviewInput, interviews: Interview[], ignoreId?: string): ValidationErrors {
  const errors: ValidationErrors = {};
  if (!input.candidateId) errors.candidateId = "interview.candidateRequired";
  const start = Date.parse(input.start);
  if (!input.start || Number.isNaN(start)) errors.start = "interview.startRequired";
  const duration = parseInteger(input.duration);
  if (!Number.isInteger(duration) || duration < 15 || duration > 180) errors.duration = "interview.durationInvalid";
  if (!input.interviewer.trim()) errors.interviewer = "interview.interviewerRequired";
  if (!INTERVIEW_KINDS.includes(input.kind as Interview["kind"])) errors.kind = "interview.kindRequired";
  if (!input.topic.trim()) errors.topic = "interview.topicRequired";
  else if (input.topic.trim().length > 120) errors.topic = "interview.topicTooLong";
  if (!Object.keys(errors).length) {
    const conflict = findConflict(
      { candidateId: input.candidateId, start: input.start, duration, interviewer: input.interviewer.trim(), id: ignoreId },
      interviews,
    );
    if (conflict) errors.start = conflict === "candidate" ? "interview.conflictCandidate" : "interview.conflictInterviewer";
  }
  return errors;
}

export type ConflictInput = { id?: string; candidateId: string; start: string; duration: number; interviewer: string; status?: Interview["status"] };

/** Renvoie "candidate" | "interviewer" | null. Les entretiens annulés n'entrent pas en conflit. */
export function findConflict(input: ConflictInput, interviews: Interview[]): "candidate" | "interviewer" | null {
  const start = Date.parse(input.start);
  if (Number.isNaN(start)) return null;
  const end = start + input.duration * 60_000;
  const interviewer = input.interviewer.trim().toLowerCase();
  let candidateHit: "candidate" | "interviewer" | null = null;
  for (const interview of interviews) {
    if (interview.id === input.id) continue;
    if (interview.status === "cancelled") continue;
    if (input.status === "cancelled") continue;
    const otherStart = Date.parse(interview.start);
    const otherEnd = otherStart + interview.duration * 60_000;
    const overlaps = otherStart < end && otherEnd > start;
    if (!overlaps) continue;
    if (interview.interviewer.trim().toLowerCase() === interviewer) return "interviewer";
    if (interview.candidateId === input.candidateId) candidateHit = "candidate";
  }
  return candidateHit;
}

export function validateReview(input: ReviewInput, candidates: Candidate[]): ValidationErrors {
  const errors: ValidationErrors = {};
  if (!input.candidateId || !candidates.some((candidate) => candidate.id === input.candidateId)) {
    errors.candidateId = "review.candidateRequired";
  }
  for (const criterion of CRITERIA) {
    const score = input.scores[criterion];
    if (typeof score !== "number" || !Number.isInteger(score) || score < 1 || score > 5) {
      errors[`scores.${criterion}`] = "review.scoresRequired";
    }
  }
  if (!input.comments.trim()) errors.comments = "review.commentsRequired";
  else if (input.comments.trim().length > 2000) errors.comments = "review.commentsTooLong";
  if (!RECOMMENDATIONS.includes(input.recommendation as Review["recommendation"])) {
    errors.recommendation = "review.recommendationRequired";
  }
  return errors;
}

export function validateOffer(input: OfferInput, candidates: Candidate[], offers: Offer[]): ValidationErrors {
  const errors: ValidationErrors = {};
  const candidate = candidates.find((item) => item.id === input.candidateId);
  if (!candidate) errors.candidateId = "offer.candidateRequired";
  else if (offers.some((offer) => offer.candidateId === candidate.id)) errors.candidateId = "offer.duplicate";
  const salary = parseSalary(input.salary);
  if (!Number.isFinite(salary) || salary <= 0 || salary > 10_000_000) errors.salary = "offer.salaryInvalid";
  if (!ISO_DATE_RE.test(input.startDate) || Number.isNaN(Date.parse(input.startDate))) {
    errors.startDate = "offer.startInvalid";
  }
  if (input.currency && !CURRENCIES.includes(input.currency as (typeof CURRENCIES)[number])) {
    errors.currency = "offer.currencyInvalid";
  }
  return errors;
}

export function validateSettings(settings: Partial<WorkspaceSettings>): ValidationErrors {
  const errors: ValidationErrors = {};
  if (!settings.companyName?.trim()) errors.companyName = "settings.nameRequired";
  else if (settings.companyName.trim().length > 60) errors.companyName = "settings.nameTooLong";
  if (settings.contactEmail && !EMAIL_RE.test(settings.contactEmail.trim())) errors.contactEmail = "settings.emailInvalid";
  return errors;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isStage(value: unknown): value is Stage {
  return typeof value === "string" && (STAGES as readonly string[]).includes(value);
}

/** Valide une sauvegarde importée (JSON) avant de remplacer les données locales. */
export function parsePeopleDeskData(raw: unknown): PeopleDeskData | null {
  if (!isRecord(raw) || raw.version !== 1) return null;
  const { settings, jobs, candidates, interviews, reviews, offers, activity } = raw;
  if (!isRecord(settings) || typeof settings.companyName !== "string") return null;
  if (!Array.isArray(jobs) || !Array.isArray(candidates) || !Array.isArray(interviews)) return null;
  if (!Array.isArray(reviews) || !Array.isArray(offers) || !Array.isArray(activity)) return null;

  const validJobs = jobs.every(
    (job): job is Job =>
      isRecord(job) &&
      typeof job.id === "string" &&
      typeof job.title === "string" &&
      typeof job.department === "string" &&
      (JOB_STATUSES as readonly string[]).includes(job.status as string) &&
      (JOB_TYPES as readonly string[]).includes(job.type as string) &&
      isStringArray(job.skills),
  );
  const validCandidates = candidates.every(
    (candidate): candidate is Candidate =>
      isRecord(candidate) &&
      typeof candidate.id === "string" &&
      typeof candidate.name === "string" &&
      typeof candidate.email === "string" &&
      typeof candidate.jobId === "string" &&
      isStage(candidate.stage) &&
      isStringArray(candidate.skills) &&
      Array.isArray(candidate.stageHistory),
  );
  const validInterviews = interviews.every(
    (interview): interview is Interview =>
      isRecord(interview) && typeof interview.id === "string" && typeof interview.candidateId === "string" && typeof interview.start === "string" && typeof interview.duration === "number",
  );
  const validReviews = reviews.every(
    (review): review is Review =>
      isRecord(review) && typeof review.id === "string" && typeof review.candidateId === "string" && isRecord(review.scores) && (RECOMMENDATIONS as readonly string[]).includes(review.recommendation as string),
  );
  const validOffers = offers.every(
    (offer): offer is Offer =>
      isRecord(offer) && typeof offer.id === "string" && typeof offer.candidateId === "string" && typeof offer.salary === "number" && (OFFER_STATUSES as readonly string[]).includes(offer.status as string),
  );
  if (!validJobs || !validCandidates || !validInterviews || !validReviews || !validOffers) return null;

  return raw as unknown as PeopleDeskData;
}

export function averageScore(scores: Partial<Record<Criterion, number>>): number {
  const values = CRITERIA.map((criterion) => scores[criterion]).filter((value): value is number => typeof value === "number");
  if (!values.length) return 0;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}
