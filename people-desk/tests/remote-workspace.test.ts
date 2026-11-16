import { describe, expect, it } from "vitest";
import { createSeedData } from "@/lib/storage/seed";
import { validateWorkspaceSnapshot } from "@/lib/server/workspace-validation";

const seed = () => createSeedData(new Date("2026-11-09T09:00:00.000Z"));

describe("remote workspace snapshot boundary", () => {
  it("accepts the existing typed seed data", () => {
    expect(validateWorkspaceSnapshot(seed())).toBe(true);
  });

  it("rejects unknown candidates that point to a different job", () => {
    const data = seed();
    data.candidates[0].jobId = "job_other_tenant";
    expect(validateWorkspaceSnapshot(data)).toBe(false);
  });

  it("rejects dangling interviews", () => {
    const data = seed();
    data.interviews[0].candidateId = "missing_candidate";
    expect(validateWorkspaceSnapshot(data)).toBe(false);
  });

  it("rejects malformed applicant addresses and corrupt arrays", () => {
    const data = seed();
    data.candidates[0].email = "not-an-address";
    expect(validateWorkspaceSnapshot(data)).toBe(false);
    expect(validateWorkspaceSnapshot({ version: 1, jobs: "not-array" })).toBe(false);
  });

  it("rejects duplicate identifiers", () => {
    const data = seed();
    data.candidates.push({ ...data.candidates[0] });
    expect(validateWorkspaceSnapshot(data)).toBe(false);
  });

  it("rejects scores outside the allowed range", () => {
    const data = seed();
    const item = data.reviews[0];
    expect(item).toBeDefined();
    item.scores.skills = 99;
    expect(validateWorkspaceSnapshot(data)).toBe(false);
  });
});
