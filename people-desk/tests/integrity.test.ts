import { describe, expect, it } from "vitest";
import { createSeedData } from "@/lib/storage/seed";
import { createCandidate, deleteInterview, advanceOffer } from "@/lib/domain/mutations";
import { toCsv } from "@/lib/storage/export";

const initial = () => createSeedData(new Date("2026-11-09T09:00:00.000Z"));

describe("recruitment integrity", () => {
  it("rejects an invalid candidate instead of persisting corrupt data", () => {
    const original = initial();
    const result = createCandidate(original, {
      name: "Essai", email: "bad-email", jobId: original.jobs[0].id,
      source: "careers", skills: ["React"],
    });
    expect(result.ok).toBe(false);
    expect(original.candidates.some((candidate) => candidate.name === "Essai")).toBe(false);
  });

  it("removes dangling review references when deleting an interview", () => {
    const data = initial();
    const linked = data.reviews.find((review) => review.interviewId);
    expect(linked).toBeDefined();
    const id = linked!.interviewId!;
    const result = deleteInterview(data, id);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.interviews.some((interview) => interview.id === id)).toBe(false);
      expect(result.data.reviews.some((review) => review.interviewId === id)).toBe(false);
    }
  });

  it("moves the candidate to Hired when an offer is accepted", () => {
    const data = initial();
    const offer = data.offers[0];
    const result = advanceOffer(data, offer.id, "accepted");
    expect(result.ok).toBe(true);
    if (result.ok) {
      const candidate = result.data.candidates.find((c) => c.id === offer.candidateId);
      expect(candidate?.stage).toBe("Hired");
      expect(candidate?.stageHistory.at(-1)?.stage).toBe("Hired");
    }
  });

  it("prevents spreadsheet-formula execution in CSV exports", () => {
    expect(toCsv([["=1+1", "+cmd", "@evil", "-42"]])).toBe("'=1+1,'+cmd,'@evil,'-42");
    expect(toCsv([["Safe", "normal"]])).toBe("Safe,normal");
  });
});
