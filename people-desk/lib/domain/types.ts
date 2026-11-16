export const STAGES = ["Applied", "Screening", "Shortlisted", "Interview", "Offer", "Hired", "Rejected"] as const;
export type Stage = (typeof STAGES)[number];

export const JOB_STATUSES = ["open", "paused", "archived"] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const JOB_TYPES = ["fulltime", "contract", "internship"] as const;
export type JobType = (typeof JOB_TYPES)[number];

export const SOURCES = ["careers", "referral", "sourced", "linkedin", "event"] as const;
export type Source = (typeof SOURCES)[number];

export const INTERVIEW_KINDS = ["video", "onsite", "phone"] as const;
export type InterviewKind = (typeof INTERVIEW_KINDS)[number];

export const INTERVIEW_STATUSES = ["scheduled", "done", "cancelled"] as const;
export type InterviewStatus = (typeof INTERVIEW_STATUSES)[number];

export const CRITERIA = ["skills", "communication", "problemSolving", "culture", "motivation"] as const;
export type Criterion = (typeof CRITERIA)[number];

export const RECOMMENDATIONS = ["strongYes", "yes", "neutral", "no", "strongNo"] as const;
export type Recommendation = (typeof RECOMMENDATIONS)[number];

export const OFFER_STATUSES = ["draft", "review", "approved", "sent", "accepted", "declined"] as const;
export type OfferStatus = (typeof OFFER_STATUSES)[number];

export const ACTIVITY_TYPES = [
  "job.created",
  "job.updated",
  "job.status",
  "candidate.created",
  "candidate.updated",
  "candidate.deleted",
  "candidate.stage",
  "interview.scheduled",
  "interview.updated",
  "interview.cancelled",
  "interview.done",
  "interview.deleted",
  "review.created",
  "review.deleted",
  "offer.created",
  "offer.updated",
  "offer.status",
  "offer.deleted",
  "data.imported",
  "data.restored",
  "data.cleared",
  "settings.updated",
] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export type Experience = {
  id: string;
  company: string;
  role: string;
  from: string;
  to?: string;
  summary?: string;
};

export type StageChange = {
  stage: Stage;
  at: string;
  note?: string;
};

export type Note = {
  id: string;
  text: string;
  at: string;
};

export type Job = {
  id: string;
  title: string;
  department: string;
  location: string;
  type: JobType;
  status: JobStatus;
  openings: number;
  salary: string;
  description: string;
  skills: string[];
  owner: string;
  createdAt: string;
  archivedAt?: string;
};

export type Candidate = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  jobId: string;
  stage: Stage;
  source: Source;
  location?: string;
  summary?: string;
  skills: string[];
  experiences: Experience[];
  notes: Note[];
  stageHistory: StageChange[];
  createdAt: string;
  updatedAt: string;
};

export type Interview = {
  id: string;
  candidateId: string;
  start: string;
  duration: number;
  interviewer: string;
  kind: InterviewKind;
  topic: string;
  notes?: string;
  status: InterviewStatus;
  createdAt: string;
};

export type Review = {
  id: string;
  candidateId: string;
  interviewId?: string;
  scores: Record<Criterion, number>;
  comments: string;
  strengths?: string;
  risks?: string;
  recommendation: Recommendation;
  author: string;
  createdAt: string;
};

export type Offer = {
  id: string;
  candidateId: string;
  salary: number;
  currency: string;
  startDate: string;
  title: string;
  notes?: string;
  status: OfferStatus;
  createdAt: string;
  updatedAt: string;
};

export type Activity = {
  id: string;
  at: string;
  type: ActivityType;
  message: { fr: string; en: string };
};

export type Locale = "fr" | "en";
export type ThemePreference = "auto" | "light" | "dark";
export type Density = "normal" | "compact";

export type WorkspaceSettings = {
  companyName: string;
  contactEmail: string;
  hiringLead: string;
  locale: Locale;
  theme: ThemePreference;
  density: Density;
};

export type PeopleDeskData = {
  version: 1;
  settings: WorkspaceSettings;
  jobs: Job[];
  candidates: Candidate[];
  interviews: Interview[];
  reviews: Review[];
  offers: Offer[];
  activity: Activity[];
  savedAt: string;
};

export type Result<T = void> = { ok: true; data: T } | { ok: false; error: string };

export function ok<T = void>(data?: T): Result<T> {
  return { ok: true, data: data as T };
}

export function fail<T = void>(error: string): Result<T> {
  return { ok: false, error };
}

/** Étapes qui permettent encore de programmer un entretien. */
export const SCHEDULABLE_STAGES: Stage[] = ["Shortlisted", "Interview", "Offer"];
/** Étapes éligibles à une offre. */
export const OFFER_STAGES: Stage[] = ["Interview", "Offer"];
export const OPEN_STAGES: Stage[] = ["Applied", "Screening", "Shortlisted", "Interview", "Offer"];
