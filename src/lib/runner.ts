import { getProvider } from "./providers";
import { patchJob } from "./store";
import type { Job } from "./types";

/**
 * In-process job runner. Fine for a single dev server; the moment you deploy
 * to anything serverless this must become a real worker (a queue + a long-lived
 * process), because a video render outlives an HTTP request everywhere.
 *
 * Kept behind this one function so that migration is a single-file change.
 */

const running = new Set<string>();

export function startJob(job: Job): void {
  if (running.has(job.id)) return;
  running.add(job.id);

  void (async () => {
    const provider = getProvider(job.provider);
    try {
      await patchJob(job.id, { status: "running", progress: 0.01 });

      let lastWrite = 0;
      const result = await provider.run(job, {
        onProgress: (p) => {
          // Throttle disk writes; the UI polls every second anyway.
          const now = Date.now();
          if (now - lastWrite < 700) return;
          lastWrite = now;
          void patchJob(job.id, { progress: Math.max(0, Math.min(1, p)) });
        },
      });

      await patchJob(job.id, {
        status: "succeeded",
        progress: 1,
        outputUrl: result.outputUrl,
        externalId: result.externalId,
        actualCostUsd: result.actualCostUsd,
      });
    } catch (err) {
      await patchJob(job.id, {
        status: "failed",
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      running.delete(job.id);
    }
  })();
}
