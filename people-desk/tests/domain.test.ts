import { describe, expect, it } from "vitest";
import { createSeedData } from "@/lib/storage/seed";
import {
  advanceOffer,
  createCandidate,
  createOffer,
  createReview,
  deleteCandidate,
  moveStage,
  scheduleInterview,
  setInterviewStatus,
} from "@/lib/domain/mutations";
import {
  checkCandidateEmail,
  findConflict,
  normalizeSkills,
  parsePeopleDeskData,
  validateCandidate,
  validateInterview,
  validateJob,
  validateOffer,
  validateReview,
} from "@/lib/domain/validation";
import { averageScore } from "@/lib/domain/validation";

const NOW = new Date("2026-11-09T09:00:00.000Z");

describe("validation", () => {
  it("rejects an invalid job form", () => {
    const errors = validateJob({
      title: "",
      department: "",
      location: "",
      type: "freelance",
      openings: 0,
      salary: "",
      description: "",
      skills: [],
    });
    expect(Object.keys(errors).sort()).toEqual(
      ["department", "description", "location", "openings", "salary", "title", "type"].sort(),
    );
  });

  it("accepts a valid job form", () => {
    const errors = validateJob({
      title: "Designer",
      department: "Design",
      location: "Paris",
      type: "fulltime",
      openings: "2",
      salary: "50 k€",
      description: "Un poste.",
      skills: "Figma, Research",
    });
    expect(errors).toEqual({});
  });

  it("validates candidate emails and duplicates per job", () => {
    const data = createSeedData(NOW);
    expect(validateCandidate({ name: "X", email: "nope", jobId: "", source: "careers", skills: [] }, data.candidates).email).toBe(
      "candidate.emailInvalid",
    );
    expect(checkCandidateEmail("ALICE.MOREAU@example.com", "job_product_designer", data.candidates)).toBe("candidate.emailDuplicate");
    expect(checkCandidateEmail("alice.moreau@example.com", "job_frontend", data.candidates)).toBeNull();
    expect(checkCandidateEmail("alice.moreau@example.com", "job_product_designer", data.candidates, "cand_alice")).toBeNull();
  });

  it("normalizes and de-duplicates skills", () => {
    expect(normalizeSkills(" Figma, research ,, FIGMA ")).toEqual(["Figma", "research"]);
  });

  it("enforces interview duration bounds and required fields", () => {
    const errors = validateInterview({ candidateId: "cand_alice", start: "", duration: 10, interviewer: "", kind: "video", topic: "" }, []);
    expect(Object.keys(errors).sort()).toEqual(["duration", "interviewer", "start", "topic"]);
  });

  it("detects interviewer and candidate conflicts, ignoring cancelled interviews", () => {
    const data = createSeedData(NOW);
    const start = data.interviews.find((interview) => interview.id === "int_alice_2")!.start;
    expect(
      validateInterview(
        { candidateId: "cand_sarah", start, duration: 30, interviewer: "Camille Roy", kind: "video", topic: "Sync" },
        data.interviews,
      ).start,
    ).toBe("interview.conflictInterviewer");
    expect(
      validateInterview(
        { candidateId: "cand_alice", start, duration: 30, interviewer: "Nora", kind: "video", topic: "Sync" },
        data.interviews,
      ).start,
    ).toBe("interview.conflictCandidate");
    const cancelled = data.interviews.map((interview) => (interview.id === "int_alice_2" ? { ...interview, status: "cancelled" as const } : interview));
    expect(findConflict({ candidateId: "cand_alice", start, duration: 30, interviewer: "Camille Roy" }, cancelled)).toBeNull();
  });

  it("requires every review criterion and an average", () => {
    const data = createSeedData(NOW);
    const errors = validateReview(
      { candidateId: "cand_alice", scores: { skills: 4 }, comments: "", recommendation: "maybe" },
      data.candidates,
    );
    expect(errors["scores.communication"]).toBe("review.scoresRequired");
    expect(errors.comments).toBe("review.commentsRequired");
    expect(errors.recommendation).toBe("review.recommendationRequired");
    expect(averageScore({ skills: 5, communication: 4, problemSolving: 4, culture: 5, motivation: 3 })).toBe(4.2);
  });

  it("refuses an offer for a candidate who already has one", () => {
    const data = createSeedData(NOW);
    expect(
      validateOffer({ candidateId: "cand_hugo", salary: 50000, startDate: "2026-12-01" }, data.candidates, data.offers).candidateId,
    ).toBe("offer.duplicate");
    expect(validateOffer({ candidateId: "cand_alice", salary: -1, startDate: "bad" }, data.candidates, data.offers).salary).toBe(
      "offer.salaryInvalid",
    );
  });

  it("rejects malformed imports", () => {
    expect(parsePeopleDeskData(null)).toBeNull();
    expect(parsePeopleDeskData({ version: 2 })).toBeNull();
    const data = createSeedData(NOW);
    expect(parsePeopleDeskData(JSON.parse(JSON.stringify(data)))).not.toBeNull();
  });
});

describe("mutations", () => {
  it("moves a candidate and records history plus activity", () => {
    const data = createSeedData(NOW);
    const result = moveStage(data, "cand_malik", "Shortlisted");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const candidate = result.data.candidates.find((item) => item.id === "cand_malik")!;
    expect(candidate.stage).toBe("Shortlisted");
    expect(candidate.stageHistory.at(-1)?.stage).toBe("Shortlisted");
    expect(result.data.activity[0].type).toBe("candidate.stage");
    expect(result.data.candidates).toHaveLength(data.candidates.length);
  });

  it("creates a candidate with an initial history entry", () => {
    const data = createSeedData(NOW);
    const result = createCandidate(data, {
      name: "Zoé Lambert",
      email: "zoe@example.com",
      jobId: "job_frontend",
      source: "careers",
      skills: ["React"],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const created = result.data.candidates[0];
    expect(created.stage).toBe("Applied");
    expect(created.stageHistory).toHaveLength(1);
  });

  it("cascades deletions to interviews, reviews and offers", () => {
    const data = createSeedData(NOW);
    const result = deleteCandidate(data, "cand_hugo");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.candidates.some((candidate) => candidate.id === "cand_hugo")).toBe(false);
    expect(result.data.interviews.some((interview) => interview.candidateId === "cand_hugo")).toBe(false);
    expect(result.data.offers.some((offer) => offer.candidateId === "cand_hugo")).toBe(false);
  });

  it("promotes Shortlisted candidates when scheduling and blocks without candidate", () => {
    const data = createSeedData(NOW);
    const result = scheduleInterview(data, {
      candidateId: "cand_chloe",
      start: "2026-11-12T10:00:00.000Z",
      duration: 45,
      interviewer: "Camille Roy",
      kind: "video",
      topic: "Portfolio",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.candidates.find((candidate) => candidate.id === "cand_chloe")?.stage).toBe("Interview");
    expect(result.data.interviews.at(-1)?.status).toBe("scheduled");
    expect(scheduleInterview(data, { candidateId: "nope", start: "x", duration: 30, interviewer: "a", kind: "video", topic: "t" }).ok).toBe(
      false,
    );
  });

  it("tracks interview status changes", () => {
    const data = createSeedData(NOW);
    const result = setInterviewStatus(data, "int_alice_2", "cancelled");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.interviews.find((interview) => interview.id === "int_alice_2")?.status).toBe("cancelled");
    expect(result.data.activity[0].type).toBe("interview.cancelled");
  });

  it("creates a review and then an offer that replaces duplicates", () => {
    const data = createSeedData(NOW);
    const review = createReview(
      data,
      {
        candidateId: "cand_alice",
        scores: { skills: 5, communication: 4, problemSolving: 4, culture: 4, motivation: 5 },
        comments: "Très bien.",
        recommendation: "yes",
      },
      "Camille",
    );
    expect(review.ok).toBe(true);
    if (!review.ok) return;
    expect(review.data.reviews).toHaveLength(data.reviews.length + 1);

    const moved = moveStage(review.data, "cand_alice", "Offer");
    expect(moved.ok).toBe(true);
    if (!moved.ok) return;
    const offer = createOffer(moved.data, { candidateId: "cand_alice", salary: 60000, startDate: "2026-12-15" });
    expect(offer.ok).toBe(true);
    if (!offer.ok) return;
    expect(offer.data.offers[0].status).toBe("draft");

    const accepted = advanceOffer(offer.data, offer.data.offers[0].id, "accepted");
    expect(accepted.ok).toBe(true);
    if (!accepted.ok) return;
    expect(accepted.data.offers[0].status).toBe("accepted");
  });

  it("declines other active offers when one is accepted", () => {
    const data = createSeedData(NOW);
    const withSecond: typeof data = {
      ...data,
      offers: [...data.offers, { ...data.offers[0], id: "off_hugo_2", status: "sent" }],
    };
    const result = advanceOffer(withSecond, "off_hugo", "accepted");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.offers.find((offer) => offer.id === "off_hugo_2")?.status).toBe("declined");
  });
});
