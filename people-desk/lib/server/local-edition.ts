import "server-only";

import { createHash, createHmac, randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { copyFile, mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { cookies } from "next/headers";
import type { PeopleDeskData } from "@/lib/domain/types";
import { validateWorkspaceSnapshot } from "@/lib/server/workspace-validation";

export const LOCAL_SESSION_COOKIE = "rhdesk_local_session";
const SESSION_HOURS = 8;
const MAX_BYTES = 1_048_576;
const COOKIE_SECURE = process.env.RH_LOCAL_COOKIE_SECURE === "1";
type Snapshot = { revision: number; data: PeopleDeskData };
type Sessions = Record<string, { expires: number; fingerprint: string }>;
type Attempts = { count: number; until: number };
const attempts: Attempts = { count: 0, until: 0 };
let queue: Promise<unknown> = Promise.resolve();

function serial<T>(operation: () => Promise<T>): Promise<T> {
  const task = queue.then(operation);
  queue = task.catch(() => undefined);
  return task;
}

export function isLocalEdition(): boolean {
  return process.env.RH_DESK_BACKEND === "local";
}

export function localConfigValid(): boolean {
  return isLocalEdition()
    && process.env.NEXT_PUBLIC_RH_DESK_REMOTE === "1"
    && Boolean(process.env.RH_LOCAL_DATA_DIR?.startsWith("/"))
    && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(process.env.RH_LOCAL_ADMIN_EMAIL ?? "")
    && /^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/.test(process.env.RH_LOCAL_ADMIN_PASSWORD_HASH ?? "")
    && (process.env.RH_LOCAL_SESSION_SECRET?.length ?? 0) >= 32
    && Boolean(process.env.RH_DESK_PUBLIC_ORIGIN);
}

function assertConfig() {
  if (!localConfigValid()) throw new Error("Local RH Desk server configuration is incomplete");
}

function storeDir(): string {
  assertConfig();
  return process.env.RH_LOCAL_DATA_DIR!;
}

async function ensureDir() {
  const dir = storeDir();
  await mkdir(dir, { recursive: true, mode: 0o700 });
  return dir;
}

function hashToken(token: string): string {
  return createHmac("sha256", process.env.RH_LOCAL_SESSION_SECRET!).update(token).digest("hex");
}
function passwordFingerprint(): string {
  return createHash("sha256").update(process.env.RH_LOCAL_ADMIN_PASSWORD_HASH!).digest("hex");
}

async function readJson<T>(name: string): Promise<T | null> {
  const file = join(await ensureDir(), name);
  try {
    const fileStat = await stat(file);
    if (fileStat.size > MAX_BYTES * 3) throw new Error("File exceeds safe size");
    return JSON.parse(await readFile(file, "utf8")) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

async function atomicJson(name: string, data: unknown, keepBackup = false) {
  const dir = await ensureDir();
  const destination = join(dir, name);
  const temp = join(dir, "." + name + "." + process.pid + "." + randomUUID() + ".tmp");
  const payload = JSON.stringify(data);
  if (Buffer.byteLength(payload, "utf8") > MAX_BYTES * 3) throw new Error("Document is too large");
  if (keepBackup) {
    try {
      await copyFile(destination, destination + ".backup");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
  await writeFile(temp, payload, { mode: 0o600, flag: "wx" });
  await rename(temp, destination);
}

function freshWorkspace(): Snapshot {
  const now = new Date().toISOString();
  return {
    revision: 0,
    data: {
      version: 1,
      settings: {
        companyName: "RH Desk",
        contactEmail: process.env.RH_LOCAL_ADMIN_EMAIL!,
        hiringLead: "Administrateur",
        locale: "fr",
        theme: "auto",
        density: "normal",
      },
      jobs: [],
      candidates: [],
      interviews: [],
      reviews: [],
      offers: [],
      activity: [],
      savedAt: now,
    },
  };
}

async function loadSnapshot(): Promise<Snapshot> {
  const saved = await readJson<Snapshot>("workspace.json");
  if (saved === null) {
    const empty = freshWorkspace();
    await atomicJson("workspace.json", empty);
    return empty;
  }
  if (!Number.isSafeInteger(saved.revision) || saved.revision < 0
      || !validateWorkspaceSnapshot(saved.data)) {
    throw new Error("Local database is corrupt. Restore workspace.json.backup.");
  }
  return saved;
}

function checkPassword(input: string): boolean {
  if (!localConfigValid() || !input || input.length > 512) return false;
  const parts = process.env.RH_LOCAL_ADMIN_PASSWORD_HASH!.split(":");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const candidate = scryptSync(input, Buffer.from(parts[1], "hex"), 64);
  return timingSafeEqual(candidate, Buffer.from(parts[2], "hex"));
}

async function readSessions(): Promise<Sessions> {
  const stored = await readJson<Sessions>("sessions.json");
  return stored && typeof stored === "object" && !Array.isArray(stored) ? stored : {};
}

export async function localSignIn(email: string, password: string): Promise<boolean> {
  if (!localConfigValid()) return false;
  const now = Date.now();
  if (attempts.until > now) return false;
  const matchesEmail = email.trim().toLowerCase() === process.env.RH_LOCAL_ADMIN_EMAIL!.toLowerCase();
  // Always perform an expensive hash check, even for unknown e-mail addresses.
  const correct = checkPassword(password);
  if (!matchesEmail || !correct) {
    attempts.count += 1;
    if (attempts.count >= 5) {
      attempts.until = now + 15 * 60_000;
      attempts.count = 0;
    }
    return false;
  }
  attempts.count = 0;
  attempts.until = 0;
  const token = randomBytes(32).toString("base64url");
  const expires = now + SESSION_HOURS * 3_600_000;
  await serial(async () => {
    const sessions = await readSessions();
    for (const key of Object.keys(sessions)) {
      if (!sessions[key] || sessions[key].expires < now) delete sessions[key];
    }
    sessions[hashToken(token)] = { expires, fingerprint: passwordFingerprint() };
    await atomicJson("sessions.json", sessions);
  });
  (await cookies()).set(LOCAL_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: COOKIE_SECURE,
    path: "/",
    maxAge: SESSION_HOURS * 3600,
  });
  return true;
}

export async function localSession(): Promise<{ email: string } | null> {
  if (!localConfigValid()) return null;
  const token = (await cookies()).get(LOCAL_SESSION_COOKIE)?.value;
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const sessions = await readSessions();
  const entry = sessions[hashToken(token)];
  if (!entry || entry.expires <= Date.now() || entry.fingerprint !== passwordFingerprint()) return null;
  return { email: process.env.RH_LOCAL_ADMIN_EMAIL! };
}

export async function localLogout(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(LOCAL_SESSION_COOKIE)?.value;
  if (localConfigValid() && token) {
    await serial(async () => {
      const sessions = await readSessions();
      delete sessions[hashToken(token)];
      await atomicJson("sessions.json", sessions);
    });
  }
  jar.delete(LOCAL_SESSION_COOKIE);
}

export async function localWorkspace(): Promise<Snapshot> {
  assertConfig();
  if (!await localSession()) throw new Error("not_authenticated");
  return serial(loadSnapshot);
}

export type LocalSaveResult =
  | { ok: true; revision: number }
  | { ok: false; code: "unauthorized" | "invalid" | "conflict" | "storage" };

export async function localSave(raw: unknown, revision: unknown): Promise<LocalSaveResult> {
  if (!localConfigValid() || !await localSession()) return { ok: false, code: "unauthorized" };
  if (!validateWorkspaceSnapshot(raw) || !Number.isSafeInteger(revision) ||
      (revision as number) < 0 || Buffer.byteLength(JSON.stringify(raw), "utf8") > MAX_BYTES) {
    return { ok: false, code: "invalid" };
  }
  return serial(async () => {
    try {
      const previous = await loadSnapshot();
      if (previous.revision !== revision) return { ok: false, code: "conflict" };
      const newRevision = previous.revision + 1;
      await atomicJson("workspace.json", { revision: newRevision, data: raw }, true);
      return { ok: true, revision: newRevision };
    } catch {
      return { ok: false, code: "storage" };
    }
  });
}
