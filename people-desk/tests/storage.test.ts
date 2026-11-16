import { describe, expect, it } from "vitest";
import { createMemoryAdapter } from "@/lib/storage/adapter";
import { createSeedData } from "@/lib/storage/seed";
import { WorkspaceStore } from "@/lib/storage/store";
import { candidatesCsv, interviewIcs, parseCsvRoundTrip, serializeData } from "./helpers";
import { parsePeopleDeskData } from "@/lib/domain/validation";
import { candidateAverageScore, dashboardKpis, funnel, jobStats, reportKpis, stageCounts, weeklyApplications } from "@/lib/domain/metrics";

const NOW = new Date("2026-11-09T09:00:00.000Z");

describe("store persistence", () => {
  it("seeds on first read and persists mutations", () => {
    const adapter = createMemoryAdapter();
    const store = new WorkspaceStore(adapter);
    expect(store.getData().jobs.length).toBeGreaterThan(0);
    store.ensurePersisted();
    const result = store.createCandidate({
      name: "Test User",
      email: "test.user@example.com",
      jobId: "job_frontend",
      source: "careers",
      skills: ["React"],
    });
    expect(result.ok).toBe(true);
    const reloaded = new WorkspaceStore(adapter);
    expect(reloaded.getData().candidates.some((candidate) => candidate.email === "test.user@example.com")).toBe(true);
  });

  it("notifies subscribers on commit and stops after unsubscribe", () => {
    const store = new WorkspaceStore(createMemoryAdapter());
    let calls = 0;
    const off = store.subscribe(() => {
      calls += 1;
    });
    store.moveStage("cand_malik", "Rejected");
    expect(calls).toBe(1);
    store.moveStage("cand_malik", "Rejected");
    expect(calls).toBe(1);
    off();
    store.moveStage("cand_malik", "Interview");
    expect(calls).toBe(1);
  });

  it("round-trips export → import", () => {
    const data = createSeedData(NOW);
    const json = serializeData(data);
    const parsed = parsePeopleDeskData(JSON.parse(json));
    expect(parsed?.candidates.length).toBe(data.candidates.length);
    expect(parsed?.settings.companyName).toBe(data.settings.companyName);
    expect(parseCsvRoundTrip(candidatesCsv(data, "fr")).length).toBe(data.candidates.length + 1);
  });

  it("builds a valid ICS calendar", () => {
    const data = createSeedData(NOW);
    const ics = interviewIcs(data, data.interviews[0], "fr");
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("UID:int_alice_2@people-desk.local");
    expect(ics.split("\r\n").length).toBeGreaterThan(8);
  });

  it("restores seed and clears data", () => {
    const store = new WorkspaceStore(createMemoryAdapter());
    store.clearAll();
    expect(store.getData().candidates).toHaveLength(0);
    store.restoreSeed();
    expect(store.getData().candidates.length).toBeGreaterThan(0);
  });
});

describe("metrics", () => {
  it("computes dashboard KPIs", () => {
    const kpis = dashboardKpis(createSeedData(NOW), NOW);
    expect(kpis.openJobs).toBe(4);
    expect(kpis.activeCandidates).toBe(11);
    expect(kpis.pendingOffers).toBe(1);
    expect(kpis.hires).toBe(1);
  });

  it("builds weekly application series", () => {
    const series = weeklyApplications(createSeedData(NOW), 8, NOW);
    expect(series).toHaveLength(8);
    expect(series.reduce((sum, point) => sum + point.applications, 0)).toBe(12);
  });

  it("counts stages, jobs and funnel", () => {
    const data = createSeedData(NOW);
    const counts = stageCounts(data);
    expect(counts.Interview).toBe(3);
    const rows = jobStats(data);
    const designer = rows.find((row) => row.jobId === "job_product_designer")!;
    expect(designer.applications).toBe(4);
    expect(designer.hires).toBe(1);
    expect(funnel(data)[0]).toEqual({ stage: "Applied", count: 13 });
    expect(candidateAverageScore(data, "cand_hugo")).toBe(4.5);
  });

  it("computes report conversion", () => {
    const report = reportKpis(createSeedData(NOW), new Date("2026-08-01T00:00:00.000Z"));
    expect(report.totalApplications).toBe(13);
    expect(report.hires).toBe(1);
    expect(report.conversionRate).toBeCloseTo(7.7, 1);
  });
});
