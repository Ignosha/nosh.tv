import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import type { Job } from "./types";

/**
 * File-backed job store. Dependency-free on purpose so `npm install` can't fail
 * on native build tools. Swap for Postgres the day you have two users at once —
 * the exported functions are all the rest of the app knows about.
 *
 * State lives on `globalThis`, which is not a shortcut: Next.js bundles each
 * route handler separately, so a module-level `let` gives /api/generate and
 * /api/jobs/[id] *different* copies of the cache. The writer's updates then
 * never reach the reader and every job appears frozen mid-progress. A
 * globalThis singleton is the standard fix, and it survives dev hot-reloads too.
 */

const DATA_DIR = path.join(process.cwd(), ".data");
const JOBS_FILE = path.join(DATA_DIR, "jobs.json");
const MAX_JOBS = 200;

interface StoreState {
  jobs: Map<string, Job>;
  writeChain: Promise<void>;
}

const globalRef = globalThis as unknown as { __noshJobStore?: StoreState };

function state(): StoreState {
  if (!globalRef.__noshJobStore) {
    let jobs: Map<string, Job>;
    try {
      const arr = JSON.parse(readFileSync(JOBS_FILE, "utf8")) as Job[];
      jobs = new Map(arr.map((j) => [j.id, j]));
    } catch {
      jobs = new Map();
    }
    globalRef.__noshJobStore = { jobs, writeChain: Promise.resolve() };
  }
  return globalRef.__noshJobStore;
}

/**
 * Serialised, debounced write-behind. The map is the source of truth; the file
 * is only there so restarts don't lose history, so callers never wait on it.
 */
function persist(): void {
  const s = state();
  s.writeChain = s.writeChain.then(async () => {
    const jobs = [...s.jobs.values()].sort((a, b) => b.createdAt - a.createdAt).slice(0, MAX_JOBS);
    try {
      mkdirSync(DATA_DIR, { recursive: true });
      writeFileSync(JOBS_FILE, JSON.stringify(jobs, null, 2), "utf8");
    } catch {
      // Durability is a nice-to-have here; never fail a request over it.
    }
  });
}

/**
 * Mutations are synchronous against the in-memory map. This matters: an
 * `await` between reading a job and writing it back opens a window where a
 * concurrent progress update clobbers a terminal status.
 */
export function putJob(job: Job): Job {
  state().jobs.set(job.id, job);
  persist();
  return job;
}

export function patchJob(id: string, patch: Partial<Job>): Job | undefined {
  const s = state();
  const existing = s.jobs.get(id);
  if (!existing) return undefined;

  // Never let a late progress tick resurrect a job that already finished.
  if ((existing.status === "succeeded" || existing.status === "failed") && !patch.status) {
    return existing;
  }

  const next: Job = { ...existing, ...patch, updatedAt: Date.now() };
  s.jobs.set(id, next);
  persist();
  return next;
}

export function getJob(id: string): Job | undefined {
  return state().jobs.get(id);
}

export function listJobs(limit = 30): Job[] {
  return [...state().jobs.values()].sort((a, b) => b.createdAt - a.createdAt).slice(0, limit);
}

export function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
