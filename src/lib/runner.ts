import { getProvider } from "./providers";
import { patchJob } from "./store";
import type { Job } from "./types";

/**
 * In-process job runner. Fine for a single dev server; the moment you deploy to
 * anything serverless this must become a real worker (queue + long-lived
 * process), because a video render outlives an HTTP request everywhere.
 *
 * Kept behind one function so that migration is a single-file change.
 */

// On globalThis for the same reason the store is — see store.ts.
const globalRef = globalThis as unknown as { __noshRunning?: Set<string> };

function running(): Set<string> {
  if (!globalRef.__noshRunning) globalRef.__noshRunning = new Set();
  return globalRef.__noshRunning;
}

/** Don't write on every tick; the UI polls once a second anyway. */
const PROGRESS_WRITE_MS = 700;

export function startJob(job: Job): void {
  const active = running();
  if (active.has(job.id)) return;
  active.add(job.id);

  void (async () => {
    const provider = getProvider(job.provider);
    try {
      patchJob(job.id, { status: "running", progress: 0.01 });

      let lastWrite = 0;
      const result = await provider.run(job, {
        onProgress: (p) => {
          const now = Date.now();
          if (now - lastWrite < PROGRESS_WRITE_MS) return;
          lastWrite = now;
          patchJob(job.id, { progress: Math.max(0, Math.min(1, p)) });
        },
      });

      patchJob(job.id, {
        status: "succeeded",
        progress: 1,
        outputUrl: result.outputUrl,
        externalId: result.externalId,
        actualCostUsd: result.actualCostUsd,
      });
    } catch (err) {
      patchJob(job.id, {
        status: "failed",
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      active.delete(job.id);
    }
  })();
}
