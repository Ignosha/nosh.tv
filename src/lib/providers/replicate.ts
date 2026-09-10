import type { ModelId, VideoProvider } from "../types";

/**
 * Replicate adapter. Useful as a second source so one vendor's outage or price
 * change doesn't take your product down — route by health and cost at runtime.
 * Verify slugs at https://replicate.com/explore before shipping.
 */
const MODELS: Partial<Record<ModelId, string>> = {
  "wan2.2-i2v-a14b": "wan-video/wan-2.2-i2v-a14b",
  "wan2.2-t2v-a14b": "wan-video/wan-2.2-t2v-a14b",
  "wan2.1-i2v-14b": "wan-video/wan-2.1-i2v-14b",
  "ltx-video-13b": "lightricks/ltx-video",
  "hunyuan-video": "tencent/hunyuan-video",
};

const API = "https://api.replicate.com/v1";

function headers(): Record<string, string> {
  return {
    Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN ?? ""}`,
    "Content-Type": "application/json",
  };
}

export const replicateProvider: VideoProvider = {
  id: "replicate",
  label: "Replicate",
  isConfigured: () => Boolean(process.env.REPLICATE_API_TOKEN),
  supports: (model) => model in MODELS,

  async run(job, ctx) {
    const slug = MODELS[job.model];
    if (!slug) throw new Error(`Replicate has no model mapped for ${job.model}`);

    const input: Record<string, unknown> = {
      prompt: job.resolvedPrompt,
      negative_prompt: job.negative,
      num_frames: Math.round(job.motion.durationSec * job.motion.fps),
      fps: job.motion.fps,
      aspect_ratio: job.motion.aspect,
      num_inference_steps: job.motion.steps,
      guidance_scale: job.motion.guidance,
    };
    if (job.motion.seed !== undefined) input.seed = job.motion.seed;
    if (job.modality === "i2v") {
      if (!job.imageUrl) throw new Error("This preset needs a source image");
      input.image = job.imageUrl;
    }

    const created = await fetch(`${API}/models/${slug}/predictions`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ input }),
    });
    if (!created.ok) throw new Error(`replicate submit failed (${created.status}): ${await created.text()}`);

    let pred = (await created.json()) as {
      id: string;
      status: string;
      output?: string | string[];
      error?: string;
      urls: { get: string };
    };

    const deadline = Date.now() + 15 * 60_000;
    let ticks = 0;
    while (["starting", "processing"].includes(pred.status) && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 2500));
      ticks++;
      ctx.onProgress(Math.min(0.9, 1 - Math.exp(-ticks / 12)));
      const poll = await fetch(pred.urls.get, { headers: headers() });
      if (!poll.ok) throw new Error(`replicate poll failed (${poll.status})`);
      pred = (await poll.json()) as typeof pred;
    }

    if (pred.status !== "succeeded") {
      throw new Error(`replicate job ${pred.status}: ${pred.error ?? "unknown error"}`);
    }

    const url = Array.isArray(pred.output) ? pred.output[0] : pred.output;
    if (!url) throw new Error("replicate returned no output url");

    ctx.onProgress(1);
    return { outputUrl: url, externalId: pred.id };
  },
};
