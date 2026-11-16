import { ACTIVITY_MESSAGES, formatTemplate } from "./activity";
import { OFFER_STATUS_LABELS, STAGE_LABELS } from "./labels";
import type { JobInput, OfferInput, ReviewInput } from "./validation";
import { normalizeSkills, parseSalary, validateCandidate, validateInterview, validateJob, validateOffer, validateReview } from "./validation";
import {
  SCHEDULABLE_STAGES,
  STAGES,
  type Activity,
  type ActivityType,
  type Candidate,
  type Criterion,
  type Interview,
  type Job,
  type JobStatus,
  type Note,
  type Offer,
  type OfferStatus,
  type PeopleDeskData,
  type Review,
  type Stage,
  type WorkspaceSettings,
} from "./types";

export type MutationResult = { ok: true; data: PeopleDeskData; entityId?: string } | { ok: false; error: string };

const MAX_ACTIVITY = 60;

export function createId(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now().toString(36)}${random}`;
}

export function entry(type: ActivityType, params: Record<string, string | number>, at = new Date().toISOString()): Activity {
  const template = ACTIVITY_MESSAGES[`activity.${type}`] ?? { fr: type, en: type };
  return Object.freeze({
    id: createId("act"),
    at,
    type,
    message: Object.freeze({ fr: formatTemplate(template.fr, params), en: formatTemplate(template.en, params) }),
  });
}

function withActivity(data: PeopleDeskData, activity: Activity, at = activity.at): PeopleDeskData {
  return {
    ...data,
    activity: [activity, ...data.activity].slice(0, MAX_ACTIVITY),
    savedAt: at,
  };
}

function stageLabel(stage: Stage, locale: "fr" | "en"): string {
  return STAGE_LABELS[stage][locale];
}

export function jobById(data: PeopleDeskData, id: string): Job | undefined {
  return data.jobs.find((job) => job.id === id);
}

export function candidateById(data: PeopleDeskData, id: string): Candidate | undefined {
  return data.candidates.find((candidate) => candidate.id === id);
}

export function interviewById(data: PeopleDeskData, id: string): Interview | undefined {
  return data.interviews.find((interview) => interview.id === id);
}

export function offerById(data: PeopleDeskData, id: string): Offer | undefined {
  return data.offers.find((offer) => offer.id === id);
}

export function jobTitle(data: PeopleDeskData, jobId: string): string {
  return jobById(data, jobId)?.title ?? "—";
}

export function candidateName(data: PeopleDeskData, candidateId: string): string {
  return candidateById(data, candidateId)?.name ?? "—";
}

// ---------------------------------------------------------------- Jobs

export function createJob(data: PeopleDeskData, input: JobInput, owner: string, now = new Date().toISOString()): MutationResult {
  const errors = validateJob(input);
  if (Object.keys(errors).length) return { ok: false, error: "validation" };
  const job: Job = {
    id: createId("job"),
    title: input.title.trim(),
    department: input.department.trim(),
    location: input.location.trim(),
    type: input.type as Job["type"],
    status: "open",
    openings: Number(input.openings),
    salary: input.salary.trim(),
    description: input.description.trim(),
    skills: normalizeSkills(input.skills),
    owner: input.owner?.trim() || owner,
    createdAt: now,
  };
  return {
    ok: true,
    entityId: job.id,
    data: withActivity({ ...data, jobs: [job, ...data.jobs] }, entry("job.created", { title: job.title }, now)),
  };
}

export function updateJob(data: PeopleDeskData, id: string, input: JobInput): MutationResult {
  const current = jobById(data, id);
  if (!current) return { ok: false, error: "job.notFound" };
  const errors = validateJob(input);
  if (Object.keys(errors).length) return { ok: false, error: "validation" };
  const updated: Job = {
    ...current,
    title: input.title.trim(),
    department: input.department.trim(),
    location: input.location.trim(),
    type: input.type as Job["type"],
    openings: Number(input.openings),
    salary: input.salary.trim(),
    description: input.description.trim(),
    skills: normalizeSkills(input.skills),
    owner: input.owner?.trim() || current.owner,
  };
  return {
    ok: true,
    entityId: id,
    data: withActivity(
      { ...data, jobs: data.jobs.map((job) => (job.id === id ? updated : job)) },
      entry("job.updated", { title: updated.title }),
    ),
  };
}

const STATUS_ACTIVITY: Record<JobStatus, { type: ActivityType; key: string }> = {
  open: { type: "job.status", key: "activity.job.opened" },
  paused: { type: "job.status", key: "activity.job.paused" },
  archived: { type: "job.status", key: "activity.job.archived" },
};

export function setJobStatus(data: PeopleDeskData, id: string, status: JobStatus): MutationResult {
  const current = jobById(data, id);
  if (!current) return { ok: false, error: "job.notFound" };
  if (current.status === status) return { ok: true, entityId: id, data };
  const updated: Job = {
    ...current,
    status,
    archivedAt: status === "archived" ? new Date().toISOString() : undefined,
  };
  return {
    ok: true,
    entityId: id,
    data: withActivity(
      { ...data, jobs: data.jobs.map((job) => (job.id === id ? updated : job)) },
      entry(STATUS_ACTIVITY[status].type, { title: updated.title }),
    ),
  };
}

// ---------------------------------------------------------------- Candidates

export type CreateCandidateInput = {
  name: string;
  email: string;
  phone?: string;
  jobId: string;
  source: Candidate["source"];
  location?: string;
  summary?: string;
  skills: string[];
  stage?: Stage;
  experiences?: Candidate["experiences"];
};

export function createCandidate(data: PeopleDeskData, input: CreateCandidateInput, now = new Date().toISOString()): MutationResult {
  if (!jobById(data, input.jobId)) return { ok: false, error: "candidate.jobRequired" };
  if (Object.keys(validateCandidate(input, data.candidates)).length) return { ok: false, error: "validation" };
  const stage = input.stage ?? "Applied";
  const candidate: Candidate = {
    id: createId("cand"),
    name: input.name.trim(),
    email: input.email.trim(),
    phone: input.phone?.trim() || undefined,
    jobId: input.jobId,
    stage,
    source: input.source,
    location: input.location?.trim() || undefined,
    summary: input.summary?.trim() || undefined,
    skills: normalizeSkills(input.skills),
    experiences: input.experiences ?? [],
    notes: [],
    stageHistory: [{ stage, at: now }],
    createdAt: now,
    updatedAt: now,
  };
  return {
    ok: true,
    entityId: candidate.id,
    data: withActivity(
      { ...data, candidates: [candidate, ...data.candidates] },
      entry("candidate.created", { name: candidate.name, title: jobTitle(data, candidate.jobId) }, now),
    ),
  };
}

export type CandidatePatch = Partial<
  Pick<Candidate, "name" | "email" | "phone" | "jobId" | "source" | "location" | "summary" | "skills" | "experiences">
>;

export function updateCandidate(data: PeopleDeskData, id: string, patch: CandidatePatch): MutationResult {
  const current = candidateById(data, id);
  if (!current) return { ok: false, error: "candidate.notFound" };
  const merged = { ...current, ...patch };
  if (!jobById(data, merged.jobId) || Object.keys(validateCandidate(merged, data.candidates, id)).length) {
    return { ok: false, error: "validation" };
  }
  const updated: Candidate = {
    ...current,
    ...patch,
    name: patch.name?.trim() ?? current.name,
    email: patch.email?.trim() ?? current.email,
    skills: patch.skills ? normalizeSkills(patch.skills) : current.skills,
    updatedAt: new Date().toISOString(),
  };
  return {
    ok: true,
    entityId: id,
    data: withActivity(
      { ...data, candidates: data.candidates.map((candidate) => (candidate.id === id ? updated : candidate)) },
      entry("candidate.updated", { name: updated.name }),
    ),
  };
}

/** Suppression complète : candidat + entretiens, revues et offres liés. */
export function deleteCandidate(data: PeopleDeskData, id: string): MutationResult {
  const current = candidateById(data, id);
  if (!current) return { ok: false, error: "candidate.notFound" };
  const next: PeopleDeskData = {
    ...data,
    candidates: data.candidates.filter((candidate) => candidate.id !== id),
    interviews: data.interviews.filter((interview) => interview.candidateId !== id),
    reviews: data.reviews.filter((review) => review.candidateId !== id),
    offers: data.offers.filter((offer) => offer.candidateId !== id),
  };
  return {
    ok: true,
    entityId: id,
    data: withActivity(next, entry("candidate.deleted", { name: current.name })),
  };
}

export function moveStage(data: PeopleDeskData, id: string, stage: Stage, note?: string, now = new Date().toISOString()): MutationResult {
  const current = candidateById(data, id);
  if (!current) return { ok: false, error: "candidate.notFound" };
  if (!STAGES.includes(stage)) return { ok: false, error: "candidate.invalidStage" };
  if (current.stage === stage) return { ok: true, entityId: id, data };
  const updated: Candidate = {
    ...current,
    stage,
    stageHistory: [...current.stageHistory, { stage, at: now, note: note?.trim() || undefined }],
    updatedAt: now,
  };
  return {
    ok: true,
    entityId: id,
    data: withActivity(
      { ...data, candidates: data.candidates.map((candidate) => (candidate.id === id ? updated : candidate)) },
      entry(
        "candidate.stage",
        {
          name: updated.name,
          from: stageLabel(current.stage, "fr"),
          to: stageLabel(stage, "fr"),
          fromEn: stageLabel(current.stage, "en"),
          toEn: stageLabel(stage, "en"),
        },
        now,
      ),
    ),
  };
}

export function addCandidateNote(data: PeopleDeskData, id: string, text: string): MutationResult {
  const current = candidateById(data, id);
  if (!current) return { ok: false, error: "candidate.notFound" };
  const trimmed = text.trim();
  if (!trimmed) return { ok: false, error: "note.empty" };
  const note: Note = { id: createId("note"), text: trimmed.slice(0, 1000), at: new Date().toISOString() };
  return {
    ok: true,
    entityId: id,
    data: withActivity(
      {
        ...data,
        candidates: data.candidates.map((candidate) =>
          candidate.id === id ? { ...candidate, notes: [note, ...candidate.notes], updatedAt: note.at } : candidate,
        ),
      },
      entry("note.added" as "candidate.updated", { name: current.name }),
    ),
  };
}

export function canSchedule(candidate: Candidate): boolean {
  return SCHEDULABLE_STAGES.includes(candidate.stage);
}

// ---------------------------------------------------------------- Interviews

export type ScheduleInterviewInput = {
  candidateId: string;
  start: string;
  duration: number;
  interviewer: string;
  kind: Interview["kind"];
  topic: string;
  notes?: string;
};

export function scheduleInterview(data: PeopleDeskData, input: ScheduleInterviewInput, now = new Date().toISOString()): MutationResult {
  const candidate = candidateById(data, input.candidateId);
  if (!candidate) return { ok: false, error: "interview.candidateRequired" };
  if (Object.keys(validateInterview(input, data.interviews)).length) return { ok: false, error: "validation" };
  const interview: Interview = {
    id: createId("int"),
    candidateId: input.candidateId,
    start: input.start,
    duration: input.duration,
    interviewer: input.interviewer.trim(),
    kind: input.kind,
    topic: input.topic.trim(),
    notes: input.notes?.trim() || undefined,
    status: "scheduled",
    createdAt: now,
  };
  let next: PeopleDeskData = { ...data, interviews: [...data.interviews, interview] };
  if (candidate.stage === "Shortlisted") {
    const moved = moveStage(next, candidate.id, "Interview", undefined, now);
    if (moved.ok) next = moved.data;
  }
  return {
    ok: true,
    entityId: interview.id,
    data: withActivity(next, entry("interview.scheduled", { name: candidate.name }, now)),
  };
}

export function updateInterview(data: PeopleDeskData, id: string, input: ScheduleInterviewInput): MutationResult {
  const current = interviewById(data, id);
  if (!current) return { ok: false, error: "interview.notFound" };
  if (!candidateById(data, input.candidateId) || Object.keys(validateInterview(input, data.interviews, id)).length) return { ok: false, error: "validation" };
  if (input.candidateId !== current.candidateId && data.reviews.some((r) => r.interviewId === id)) return { ok: false, error: "interview.reviewConflict" };
  const updated: Interview = {
    ...current,
    candidateId: input.candidateId,
    start: input.start,
    duration: input.duration,
    interviewer: input.interviewer.trim(),
    kind: input.kind,
    topic: input.topic.trim(),
    notes: input.notes?.trim() || undefined,
  };
  return {
    ok: true,
    entityId: id,
    data: withActivity(
      { ...data, interviews: data.interviews.map((interview) => (interview.id === id ? updated : interview)) },
      entry("interview.updated", { name: candidateName(data, updated.candidateId) }),
    ),
  };
}

export function deleteInterview(data: PeopleDeskData, id: string): MutationResult {
  const current = interviewById(data, id);
  if (!current) return { ok: false, error: "interview.notFound" };
  return {
    ok: true,
    entityId: id,
    data: withActivity(
      { ...data, interviews: data.interviews.filter((interview) => interview.id !== id),
        reviews: data.reviews.map((review) => review.interviewId === id ? { ...review, interviewId: undefined } : review) },
      entry("interview.deleted", { name: candidateName(data, current.candidateId) }),
    ),
  };
}

export function setInterviewStatus(data: PeopleDeskData, id: string, status: Interview["status"]): MutationResult {
  const current = interviewById(data, id);
  if (!current) return { ok: false, error: "interview.notFound" };
  const updated: Interview = { ...current, status };
  const type = status === "cancelled" ? "interview.cancelled" : "interview.done";
  return {
    ok: true,
    entityId: id,
    data: withActivity(
      { ...data, interviews: data.interviews.map((interview) => (interview.id === id ? updated : interview)) },
      entry(type, { name: candidateName(data, current.candidateId) }),
    ),
  };
}

// ---------------------------------------------------------------- Reviews

export function createReview(data: PeopleDeskData, input: ReviewInput, author: string): MutationResult {
  const errors = validateReview(input, data.candidates);
  if (Object.keys(errors).length || (input.interviewId && !data.interviews.some((i) => i.id === input.interviewId && i.candidateId === input.candidateId))) return { ok: false, error: "validation" };
  const review: Review = {
    id: createId("rev"),
    candidateId: input.candidateId,
    interviewId: input.interviewId || undefined,
    scores: Object.fromEntries(Object.entries(input.scores)) as Record<Criterion, number>,
    comments: input.comments.trim(),
    strengths: input.strengths?.trim() || undefined,
    risks: input.risks?.trim() || undefined,
    recommendation: input.recommendation as Review["recommendation"],
    author: input.author?.trim() || author,
    createdAt: new Date().toISOString(),
  };
  return {
    ok: true,
    entityId: review.id,
    data: withActivity(
      { ...data, reviews: [review, ...data.reviews] },
      entry("review.created", { name: candidateName(data, review.candidateId) }),
    ),
  };
}

export function updateReview(data: PeopleDeskData, id: string, input: ReviewInput): MutationResult {
  const current = data.reviews.find((review) => review.id === id);
  if (!current) return { ok: false, error: "review.notFound" };
  const errors = validateReview(input, data.candidates);
  if (Object.keys(errors).length || (input.interviewId && !data.interviews.some((i) => i.id === input.interviewId && i.candidateId === input.candidateId))) return { ok: false, error: "validation" };
  const updated: Review = {
    ...current,
    interviewId: input.interviewId || undefined,
    scores: Object.fromEntries(Object.entries(input.scores)) as Record<Criterion, number>,
    comments: input.comments.trim(),
    strengths: input.strengths?.trim() || undefined,
    risks: input.risks?.trim() || undefined,
    recommendation: input.recommendation as Review["recommendation"],
  };
  return {
    ok: true,
    entityId: id,
    data: { ...data, reviews: data.reviews.map((review) => (review.id === id ? updated : review)), savedAt: new Date().toISOString() },
  };
}

export function deleteReview(data: PeopleDeskData, id: string): MutationResult {
  const current = data.reviews.find((review) => review.id === id);
  if (!current) return { ok: false, error: "review.notFound" };
  return {
    ok: true,
    entityId: id,
    data: withActivity(
      { ...data, reviews: data.reviews.filter((review) => review.id !== id) },
      entry("review.deleted", { name: candidateName(data, current.candidateId) }),
    ),
  };
}

// ---------------------------------------------------------------- Offers

export function createOffer(data: PeopleDeskData, input: OfferInput, now = new Date().toISOString()): MutationResult {
  const errors = validateOffer(input, data.candidates, data.offers);
  if (Object.keys(errors).length) return { ok: false, error: Object.values(errors)[0] };
  const candidate = candidateById(data, input.candidateId)!;
  const offer: Offer = {
    id: createId("off"),
    candidateId: input.candidateId,
    salary: parseSalary(input.salary),
    currency: input.currency || "EUR",
    startDate: input.startDate,
    title: input.title?.trim() || jobTitle(data, candidate.jobId),
    notes: input.notes?.trim() || undefined,
    status: "draft",
    createdAt: now,
    updatedAt: now,
  };
  return {
    ok: true,
    entityId: offer.id,
    data: withActivity({ ...data, offers: [offer, ...data.offers] }, entry("offer.created", { name: candidate.name }, now)),
  };
}

export function updateOffer(data: PeopleDeskData, id: string, patch: Partial<Pick<Offer, "salary" | "currency" | "startDate" | "title" | "notes" | "status">>): MutationResult {
  const current = offerById(data, id);
  if (!current) return { ok: false, error: "offer.notFound" };
  const updated: Offer = {
    ...current,
    ...patch,
    salary: patch.salary !== undefined ? parseSalary(patch.salary) : current.salary,
    title: patch.title?.trim() || current.title,
    notes: patch.notes !== undefined ? patch.notes.trim() || undefined : current.notes,
    updatedAt: new Date().toISOString(),
  };
  const type: ActivityType = patch.status && patch.status !== current.status ? "offer.status" : "offer.updated";
  return {
    ok: true,
    entityId: id,
    data: withActivity(
      { ...data, offers: data.offers.map((offer) => (offer.id === id ? updated : offer)) },
      entry(type, { name: candidateName(data, updated.candidateId), status: OFFER_STATUS_LABELS[updated.status].fr }),
    ),
  };
}

export const OFFER_FLOW: OfferStatus[] = ["draft", "review", "approved", "sent", "accepted"];

export function nextOfferStatus(status: OfferStatus): OfferStatus | null {
  const index = OFFER_FLOW.indexOf(status);
  if (index === -1 || index === OFFER_FLOW.length - 1) return null;
  return OFFER_FLOW[index + 1];
}

/** Changer le statut d'une offre ; accepter sélectionne l'offre et renvoie l'id du candidat à embaucher. */
export function advanceOffer(data: PeopleDeskData, id: string, status: OfferStatus): MutationResult {
  const current = offerById(data, id);
  if (!current) return { ok: false, error: "offer.notFound" };
  if (!OFFER_FLOW.includes(status)) return { ok: false, error: "offer.invalidStatus" };
  const offer: Offer = { ...current, status, updatedAt: new Date().toISOString() };
  const others =
    status === "accepted"
      ? data.offers.map((item) =>
          item.id !== id && item.candidateId === offer.candidateId && item.status !== "declined"
            ? { ...item, status: "declined" as OfferStatus }
            : item,
        )
      : data.offers;
  return {
    ok: true,
    entityId: id,
    data: withActivity(
      { ...data, offers: others.map((item) => (item.id === id ? offer : item)),
        candidates: status === "accepted" ? data.candidates.map((c) =>
          c.id !== offer.candidateId || c.stage === "Hired" ? c :
          { ...c, stage: "Hired", stageHistory: [...c.stageHistory, { stage: "Hired" as Stage, at: offer.updatedAt }], updatedAt: offer.updatedAt },
        ) : data.candidates },
      entry("offer.status", { name: candidateName(data, offer.candidateId), status: OFFER_STATUS_LABELS[status].fr }),
    ),
  };
}

export function deleteOffer(data: PeopleDeskData, id: string): MutationResult {
  const current = offerById(data, id);
  if (!current) return { ok: false, error: "offer.notFound" };
  return {
    ok: true,
    entityId: id,
    data: withActivity(
      { ...data, offers: data.offers.filter((offer) => offer.id !== id) },
      entry("offer.deleted", { name: candidateName(data, current.candidateId) }),
    ),
  };
}

// ---------------------------------------------------------------- Settings & data

export function updateSettings(data: PeopleDeskData, patch: Partial<WorkspaceSettings>, silent = false): MutationResult {
  const settings: WorkspaceSettings = { ...data.settings, ...patch };
  const next: PeopleDeskData = { ...data, settings, savedAt: new Date().toISOString() };
  return { ok: true, data: silent ? next : withActivity(next, entry("settings.updated", {})) };
}

export function replaceData(data: PeopleDeskData, incoming: PeopleDeskData, type: "data.imported" | "data.restored" = "data.imported"): MutationResult {
  return {
    ok: true,
    data: withActivity({ ...incoming, savedAt: new Date().toISOString() }, entry(type, {})),
  };
}

export function clearData(data: PeopleDeskData): MutationResult {
  const now = new Date().toISOString();
  return {
    ok: true,
    data: {
      version: 1,
      settings: data.settings,
      jobs: [],
      candidates: [],
      interviews: [],
      reviews: [],
      offers: [],
      activity: [entry("data.cleared", {}, now)],
      savedAt: now,
    },
  };
}
