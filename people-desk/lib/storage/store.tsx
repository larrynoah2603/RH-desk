"use client";

import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useSyncExternalStore, type ReactNode } from "react";
import type { MutationResult } from "@/lib/domain/mutations";
import {
  addCandidateNote,
  advanceOffer as advanceOfferMutation,
  clearData,
  createCandidate as createCandidateMutation,
  createJob as createJobMutation,
  createOffer as createOfferMutation,
  createReview as createReviewMutation,
  deleteCandidate as deleteCandidateMutation,
  deleteInterview as deleteInterviewMutation,
  deleteOffer as deleteOfferMutation,
  deleteReview as deleteReviewMutation,
  moveStage as moveStageMutation,
  replaceData,
  scheduleInterview as scheduleInterviewMutation,
  setInterviewStatus as setInterviewStatusMutation,
  setJobStatus as setJobStatusMutation,
  updateCandidate as updateCandidateMutation,
  updateInterview as updateInterviewMutation,
  updateJob as updateJobMutation,
  updateOffer as updateOfferMutation,
  updateReview as updateReviewMutation,
  updateSettings as updateSettingsMutation,
  type CandidatePatch,
  type CreateCandidateInput,
  type ScheduleInterviewInput,
} from "@/lib/domain/mutations";
import type { JobInput, OfferInput, ReviewInput } from "@/lib/domain/validation";
import type { InterviewStatus, JobStatus, Offer, OfferStatus, PeopleDeskData, Stage, WorkspaceSettings } from "@/lib/domain/types";
import { createLocalStorageAdapter, type StoreAdapter } from "./adapter";
import { createSeedData } from "./seed";

type Listener = () => void;

export class WorkspaceStore {
  private data: PeopleDeskData;
  private adapter: StoreAdapter;
  private listeners = new Set<Listener>();

  constructor(adapter: StoreAdapter) {
    this.adapter = adapter;
    this.data = adapter.read() ?? createSeedData();
  }

  getData = (): PeopleDeskData => this.data;
  isAvailable = () => this.adapter.isAvailable();

  subscribe = (listener: Listener) => {
    this.listeners.add(listener);
    let offAdapter: (() => void) | undefined;
    if (this.listeners.size === 1) offAdapter = this.adapter.subscribe(this.onExternalChange);
    return () => {
      this.listeners.delete(listener);
      offAdapter?.();
    };
  };

  private emit() {
    for (const listener of this.listeners) listener();
  }

  private onExternalChange = () => {
    const stored = this.adapter.read();
    if (stored) {
      this.data = stored;
      this.emit();
    }
  };

  /** Écrit la donnée initiale au premier montage pour qu'elle survive au rechargement. */
  ensurePersisted() {
    if (!this.adapter.read()) this.adapter.silentWrite(this.data);
  }

  private commit(result: MutationResult): MutationResult {
    if (!result.ok) return result;
    if (result.data === this.data) return result;
    const previous = this.data;
    this.data = result.data;
    this.emit();
    if (!this.adapter.write(this.data)) {
      this.data = previous;
      this.emit();
      return { ok: false, error: "validation.storageWrite" };
    }
    return result;
  }

  createJob = (input: JobInput) => this.commit(createJobMutation(this.data, input, this.data.settings.hiringLead));
  updateJob = (id: string, input: JobInput) => this.commit(updateJobMutation(this.data, id, input));
  setJobStatus = (id: string, status: JobStatus) => this.commit(setJobStatusMutation(this.data, id, status));
  createCandidate = (input: CreateCandidateInput) => this.commit(createCandidateMutation(this.data, input));
  updateCandidate = (id: string, patch: CandidatePatch) => this.commit(updateCandidateMutation(this.data, id, patch));
  deleteCandidate = (id: string) => this.commit(deleteCandidateMutation(this.data, id));
  moveStage = (id: string, stage: Stage, note?: string) => this.commit(moveStageMutation(this.data, id, stage, note));
  addNote = (id: string, text: string) => this.commit(addCandidateNote(this.data, id, text));
  scheduleInterview = (input: ScheduleInterviewInput) => this.commit(scheduleInterviewMutation(this.data, input));
  updateInterview = (id: string, input: ScheduleInterviewInput) => this.commit(updateInterviewMutation(this.data, id, input));
  setInterviewStatus = (id: string, status: InterviewStatus) => this.commit(setInterviewStatusMutation(this.data, id, status));
  deleteInterview = (id: string) => this.commit(deleteInterviewMutation(this.data, id));
  createReview = (input: ReviewInput) => this.commit(createReviewMutation(this.data, input, this.data.settings.hiringLead));
  updateReview = (id: string, input: ReviewInput) => this.commit(updateReviewMutation(this.data, id, input));
  deleteReview = (id: string) => this.commit(deleteReviewMutation(this.data, id));
  createOffer = (input: OfferInput) => this.commit(createOfferMutation(this.data, input));
  updateOffer = (id: string, patch: Partial<Pick<Offer, "salary" | "currency" | "startDate" | "title" | "notes">>) =>
    this.commit(updateOfferMutation(this.data, id, patch));
  advanceOffer = (id: string, status: OfferStatus) => this.commit(advanceOfferMutation(this.data, id, status));
  deleteOffer = (id: string) => this.commit(deleteOfferMutation(this.data, id));
  updateSettings = (patch: Partial<WorkspaceSettings>, silent = true) => this.commit(updateSettingsMutation(this.data, patch, silent));
  importData = (incoming: PeopleDeskData) => {
    const settings = this.data.settings;
    const result = replaceData(this.data, incoming, "data.imported");
    if (!result.ok) return result;
    return this.commit({ ...result, data: { ...result.data, settings } });
  };
  restoreSeed = () => this.commit(replaceData(this.data, createSeedData(), "data.restored"));
  clearAll = () => this.commit(clearData(this.data));
}

const StoreContext = createContext<WorkspaceStore | null>(null);

/** Snapshot serveur : jeu d'exemple stable pour une hydratation sans mismatch. */
export const SERVER_SNAPSHOT: PeopleDeskData = createSeedData(new Date());

export function StoreProvider({ children }: { children: ReactNode }) {
  const store = useMemo(() => new WorkspaceStore(createLocalStorageAdapter()), []);
  useLayoutEffect(() => {
    store.ensurePersisted();
  }, [store]);
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStore(): WorkspaceStore {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useStore must be used within StoreProvider");
  return store;
}

export function useWorkspaceData(): PeopleDeskData {
  const store = useStore();
  return useSyncExternalStore(store.subscribe, store.getData, () => SERVER_SNAPSHOT);
}

const subscribeHydration = () => () => undefined;

/** false au rendu serveur et au premier rendu client, true ensuite. */
export function useHydrated(): boolean {
  return useSyncExternalStore(subscribeHydration, () => true, () => false);
}

const noopSubscribe = () => () => undefined;

/** Valeur « heure courante » recalculée après hydratation (évite les décalages SSR). */
export function useNow(): Date {
  const hydrated = useHydrated();
  return useMemo(() => {
    void hydrated;
    return new Date();
  }, [hydrated]);
}

export { noopSubscribe };
export { useEffect };
