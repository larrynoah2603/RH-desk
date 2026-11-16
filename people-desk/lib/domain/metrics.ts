import { averageScore } from "./validation";
import { OPEN_STAGES, STAGES, type Candidate, type Interview, type Offer, type PeopleDeskData, type Stage } from "./types";

export function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function startOfWeek(date: Date): Date {
  const copy = startOfDay(date);
  const day = (copy.getDay() + 6) % 7;
  return addDays(copy, -day);
}

export function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function isActive(candidate: Candidate): boolean {
  return OPEN_STAGES.includes(candidate.stage);
}

export type DashboardKpis = {
  openJobs: number;
  activeCandidates: number;
  upcomingInterviews: number;
  pendingOffers: number;
  screening: number;
  inOffer: number;
  interviewsThisWeek: number;
  hires: number;
};

export function dashboardKpis(data: PeopleDeskData, now = new Date()): DashboardKpis {
  const end = addDays(startOfDay(now), 7).getTime();
  const weekStart = startOfWeek(now).getTime();
  const weekEnd = addDays(startOfWeek(now), 7).getTime();
  const liveInterviews = data.interviews.filter((interview) => interview.status === "scheduled");
  return {
    openJobs: data.jobs.filter((job) => job.status === "open").length,
    activeCandidates: data.candidates.filter(isActive).length,
    upcomingInterviews: liveInterviews.filter((interview) => {
      const at = Date.parse(interview.start);
      return at >= startOfDay(now).getTime() && at < end;
    }).length,
    pendingOffers: data.offers.filter((offer) => ["draft", "review", "approved", "sent"].includes(offer.status)).length,
    screening: data.candidates.filter((candidate) => candidate.stage === "Screening").length,
    inOffer: data.candidates.filter((candidate) => candidate.stage === "Offer").length,
    interviewsThisWeek: liveInterviews.filter((interview) => {
      const at = Date.parse(interview.start);
      return at >= weekStart && at < weekEnd;
    }).length,
    hires: data.candidates.filter((candidate) => candidate.stage === "Hired").length,
  };
}

export function stageCounts(data: PeopleDeskData): Record<Stage, number> {
  const counts = Object.fromEntries(STAGES.map((stage) => [stage, 0])) as Record<Stage, number>;
  for (const candidate of data.candidates) counts[candidate.stage] += 1;
  return counts;
}

export type WeeklyPoint = { week: string; label: string; applications: number };

export function weeklyApplications(data: PeopleDeskData, weeks = 8, now = new Date()): WeeklyPoint[] {
  const currentWeek = startOfWeek(now);
  const points: WeeklyPoint[] = [];
  for (let index = weeks - 1; index >= 0; index -= 1) {
    const start = addDays(currentWeek, -7 * index);
    const end = addDays(start, 7);
    points.push({
      week: start.toISOString().slice(0, 10),
      label: `${String(start.getDate()).padStart(2, "0")}/${String(start.getMonth() + 1).padStart(2, "0")}`,
      applications: data.candidates.filter((candidate) => {
        const at = Date.parse(candidate.createdAt);
        return at >= start.getTime() && at < end.getTime();
      }).length,
    });
  }
  return points;
}

export function upcomingInterviews(data: PeopleDeskData, limit = 6, now = new Date()): Interview[] {
  const horizon = addDays(startOfDay(now), 7).getTime();
  return data.interviews
    .filter((interview) => interview.status === "scheduled")
    .filter((interview) => {
      const at = Date.parse(interview.start);
      return at >= startOfDay(now).getTime() && at < horizon;
    })
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start))
    .slice(0, limit);
}

export function recentCandidates(data: PeopleDeskData, limit = 6): Candidate[] {
  return [...data.candidates].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, limit);
}

export function reviewsFor(data: PeopleDeskData, candidateId: string) {
  return data.reviews.filter((review) => review.candidateId === candidateId);
}

export function candidateAverageScore(data: PeopleDeskData, candidateId: string): number | null {
  const reviews = reviewsFor(data, candidateId);
  if (!reviews.length) return null;
  const perReview = reviews.map((review) => averageScore(review.scores));
  return Math.round((perReview.reduce((sum, score) => sum + score, 0) / perReview.length) * 10) / 10;
}

export function interviewsFor(data: PeopleDeskData, candidateId: string): Interview[] {
  return data.interviews
    .filter((interview) => interview.candidateId === candidateId)
    .sort((a, b) => Date.parse(b.start) - Date.parse(a.start));
}

export function offerFor(data: PeopleDeskData, candidateId: string): Offer | undefined {
  return data.offers.find((offer) => offer.candidateId === candidateId);
}

export type ReportKpis = {
  totalApplications: number;
  conversionRate: number;
  averageDaysToHire: number | null;
  acceptedOffers: number;
  hires: number;
};

export function reportKpis(data: PeopleDeskData, since: Date): ReportKpis {
  const inWindow = (iso: string) => Date.parse(iso) >= since.getTime();
  const applications = data.candidates.filter((candidate) => inWindow(candidate.createdAt));
  const hired = data.candidates.filter((candidate) => candidate.stage === "Hired");
  const hireDurations = hired
    .map((candidate) => {
      const hireEntry = [...candidate.stageHistory].reverse().find((entry) => entry.stage === "Hired");
      if (!hireEntry) return null;
      const created = Date.parse(candidate.stageHistory[0]?.at ?? candidate.createdAt);
      return (Date.parse(hireEntry.at) - created) / 86_400_000;
    })
    .filter((value): value is number => value !== null && Number.isFinite(value) && value >= 0);
  return {
    totalApplications: applications.length,
    conversionRate: applications.length ? Math.round((hired.length / applications.length) * 1000) / 10 : 0,
    averageDaysToHire: hireDurations.length
      ? Math.round(hireDurations.reduce((sum, value) => sum + value, 0) / hireDurations.length)
      : null,
    acceptedOffers: data.offers.filter((offer) => offer.status === "accepted").length,
    hires: hired.length,
  };
}

export type JobStatRow = { jobId: string; title: string; department: string; status: string; applications: number; interviews: number; offers: number; hires: number; conversion: number };

export function jobStats(data: PeopleDeskData): JobStatRow[] {
  return data.jobs.map((job) => {
    const candidates = data.candidates.filter((candidate) => candidate.jobId === job.id);
    const ids = new Set(candidates.map((candidate) => candidate.id));
    const interviews = data.interviews.filter((interview) => ids.has(interview.candidateId) && interview.status !== "cancelled").length;
    const offers = data.offers.filter((offer) => ids.has(offer.candidateId)).length;
    const hires = candidates.filter((candidate) => candidate.stage === "Hired").length;
    return {
      jobId: job.id,
      title: job.title,
      department: job.department,
      status: job.status,
      applications: candidates.length,
      interviews,
      offers,
      hires,
      conversion: candidates.length ? Math.round((hires / candidates.length) * 1000) / 10 : 0,
    };
  });
}

export function sourceBreakdown(data: PeopleDeskData): { source: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const candidate of data.candidates) counts.set(candidate.source, (counts.get(candidate.source) ?? 0) + 1);
  return [...counts.entries()].map(([source, count]) => ({ source, count })).sort((a, b) => b.count - a.count);
}

export function funnel(data: PeopleDeskData): { stage: Stage; count: number }[] {
  const reached = (candidate: Candidate, stage: Stage) => {
    const order = STAGES.indexOf(stage);
    return candidate.stageHistory.some((entry) => STAGES.indexOf(entry.stage) >= order && entry.stage !== "Rejected");
  };
  const applied = data.candidates.length;
  return STAGES.filter((stage) => stage !== "Rejected").map((stage) => ({
    stage,
    count: stage === "Applied" ? applied : data.candidates.filter((candidate) => reached(candidate, stage)).length,
  }));
}

export function stageAge(candidate: Candidate, now = new Date()): number {
  const last = candidate.stageHistory[candidate.stageHistory.length - 1];
  return Math.floor((now.getTime() - Date.parse(last?.at ?? candidate.createdAt)) / 86_400_000);
}

export function recommendationBreakdown(data: PeopleDeskData): Record<string, number> {
  const result: Record<string, number> = {};
  for (const review of data.reviews) result[review.recommendation] = (result[review.recommendation] ?? 0) + 1;
  return result;
}

export function weeklyInterviewLoad(data: PeopleDeskData, now = new Date()): { day: string; interviews: number }[] {
  const start = startOfWeek(now);
  const labels = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
  return labels.map((label, index) => {
    const day = addDays(start, index);
    return {
      day: label,
      interviews: data.interviews.filter(
        (interview) => interview.status !== "cancelled" && sameDay(new Date(interview.start), day),
      ).length,
    };
  });
}
