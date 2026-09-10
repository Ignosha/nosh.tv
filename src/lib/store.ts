import { promises as fs } from "node:fs";
import path from "node:path";
import type { Job } from "./types";

/**
 * File-backed job store. Deliberately dependency-free so `npm install` can't
 * fail on native build tools. Swap for Postgres the day you have two users at
 * once — the interface below is all the rest of the app knows about.
 */

const DATA_DIR = path.join(process.cwd(), ".data");
const JOBS_FILE = path.join(DATA_DIR, "jobs.json");

// In-process cache so the polling UI doesn't hammer the disk.
let cache: Map<string, Job> | null = null;
let writeChain: Promise<void> = Promise.resolve();

async function load(): Promise<Map<string, Job>> {
  if (cache) return cache;
  try {
    const raw = await fs.readFile(JOBS_FILE, "utf8");
    const arr = JSON.parse(raw) as Job[];
    cache = new Map(arr.map((j) => [j.id, j]));
  } catch {
    cache = new Map();
  }
  return cache;
}

/** Serialised writes — concurrent route handlers would otherwise clobber. */
function persist(): Promise<void> {
  writeChain = writeChain.then(async () => {
    const jobs = [...(cache?.values() ?? [])]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 200);
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(JOBS_FILE, JSON.stringify(jobs, null, 2), "utf8");
  });
  return writeChain;
}

export async function putJob(job: Job): Promise<Job> {
  const map = await load();
  map.set(job.id, job);
  await persist();
  return job;
}

export async function patchJob(id: string, patch: Partial<Job>): Promise<Job | undefined> {
  const map = await load();
  const existing = map.get(id);
  if (!existing) return undefined;
  const next: Job = { ...existing, ...patch, updatedAt: Date.now() };
  map.set(id, next);
  await persist();
  return next;
}

export async function getJob(id: string): Promise<Job | undefined> {
  return (await load()).get(id);
}

export async function listJobs(limit = 30): Promise<Job[]> {
  const map = await load();
  return [...map.values()].sort((a, b) => b.createdAt - a.createdAt).slice(0, limit);
}

export function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
