import type { VideoProvider } from "../types";

/**
 * Runs the full job lifecycle with no GPU, no keys and no spend, so the product
 * layer can be built and demoed before you commit to a compute vendor.
 * Output is an animated SVG served by /api/mock/[id].
 */
export const mockProvider: VideoProvider = {
  id: "mock",
  label: "Mock (offline)",
  isConfigured: () => true,
  supports: () => true,

  async run(job, ctx) {
    const steps = 12;
    for (let i = 1; i <= steps; i++) {
      await new Promise((r) => setTimeout(r, 220));
      ctx.onProgress(i / steps);
    }
    const q = new URLSearchParams({
      move: job.motion.cameraMove,
      name: job.presetName,
      subject: job.subject.slice(0, 60),
    });
    return {
      outputUrl: `/api/mock/${job.id}?${q.toString()}`,
      externalId: `mock_${job.id}`,
      actualCostUsd: 0,
    };
  },
};
