import { describe, expect, it } from "vitest";
import { createSeedData } from "@/lib/storage/seed";
import { declineOffer, advanceOffer, updateReview, createReview } from "@/lib/domain/mutations";

const seed = () => createSeedData(new Date("2026-11-09T09:00:00.000Z"));

describe("sprint 3 hiring decisions", () => {
  it("only records a decline for a sent offer and leaves the candidate untouched", () => {
    const initial = seed();
    const id = "off_hugo";
    expect(declineOffer(initial, id).ok).toBe(false);
    const sent = advanceOffer(initial, id, "sent");
    expect(sent.ok).toBe(true);
    if (!sent.ok) return;
    const prior = sent.data.candidates.find(c => c.id === "cand_hugo")!;
    const declined = declineOffer(sent.data, id);
    expect(declined.ok).toBe(true);
    if (!declined.ok) return;
    expect(declined.data.offers.find(o => o.id === id)?.status).toBe("declined");
    expect(declined.data.candidates.find(c => c.id === "cand_hugo")?.stage).toBe(prior.stage);
    expect(declined.data.activity[0]?.type).toBe("offer.status");
    expect(declineOffer(declined.data, id).ok).toBe(false);
  });

  it("keeps evaluation scores, linked interview and candidate consistent when updating", () => {
    const initial = seed();
    const review = initial.reviews.find(r => r.id === "rev_alice_1")!;
    const result = updateReview(initial, review.id, {
      candidateId: review.candidateId,
      interviewId: review.interviewId,
      recommendation: review.recommendation,
      scores: { ...review.scores },
      comments: review.comments + " Mise à jour.",
      strengths: review.strengths,
      risks: review.risks,
      author: review.author,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const updated = result.data.reviews.find(r => r.id === review.id)!;
    expect(updated.scores).toEqual(review.scores);
    expect(updated.interviewId).toBe(review.interviewId);
    expect(updated.comments).toContain("Mise à jour");
    expect(initial.reviews.find(r => r.id === review.id)?.comments).not.toContain("Mise à jour");
  });

  it("rejects linking an evaluation to someone else's interview", () => {
    const initial = seed();
    const review = initial.reviews[0];
    const otherInterview = initial.interviews.find(i => i.candidateId !== review.candidateId)!;
    const result = createReview(initial, {
      candidateId: review.candidateId,
      interviewId: otherInterview.id,
      recommendation: "yes",
      scores: { skills: 4, communication: 4, problemSolving: 4, culture: 4, motivation: 4 },
      comments: "Entretien attribué au mauvais candidat.",
    }, "Test");
    expect(result.ok).toBe(false);
  });
});
