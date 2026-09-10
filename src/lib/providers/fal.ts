import type { ModelId, VideoProvider } from "../types";

/**
 * fal.ai queue API adapter.
 *
 * Endpoint ids move around as fal ships new versions — check
 * https://fal.ai/models before you trust this map in production. The shape of
 * the queue protocol (submit -> poll status_url -> GET response_url) is stable.
 */
const ENDPOINTS: Partial<Record<ModelId, string>> = {
  "wan2.2-i2v-a14b": "fal-ai/wan/v2.2-a14b/image-to-video",
  "wan2.2-t2v-a14b": "fal-ai/wan/v2.2-a14b/text-to-video",
  "wan2.1-i2v-14b": "fal-ai/wan-i2v",
  "ltx-video-13b": "fal-ai/ltx-video-13b-distilled",
  "hunyuan-video": "fal-ai/hunyuan-video",
};

const QUEUE = "https://queue.fal.run";

function key(): string {
  return process.env.FAL_KEY ?? "";
}

async function falFetch(url: string, init?: RequestInit): Promise<Response> {
  return fetch(url, {
    ...init,
    headers: {
      Authorization: `Key ${key()}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
}

export const falProvider: VideoProvider = {
  id: "fal",
  label: "fal.ai",
  isConfigured: () => Boolean(process.env.FAL_KEY),
  supports: (model) => model in ENDPOINTS,

  async run(job, ctx) {
    const endpoint = ENDPOINTS[job.model];
    if (!endpoint) throw new Error(`fal has no endpoint mapped for ${job.model}`);

    const input: Record<string, unknown> = {
      prompt: job.resolvedPrompt,
      negative_prompt: job.negative,
      num_frames: Math.round(job.motion.durationSec * job.motion.fps),
      frames_per_second: job.motion.fps,
      aspect_ratio: job.motion.aspect,
      num_inference_steps: job.motion.steps,
      guidance_scale: job.motion.guidance,
      enable_safety_checker: true,
    };
    if (job.motion.seed !== undefined) input.seed = job.motion.seed;
    if (job.modality === "i2v") {
      if (!job.imageUrl) throw new Error("This preset needs a source image");
      input.image_url = job.imageUrl;
    }
    // fal takes LoRAs on the endpoints that support them; harmless elsewhere.
    if (job.loras.length) {
      input.loras = job.loras.map((l) => ({ path: l.repo, scale: l.weight }));
    }

    const submit = await falFetch(`${QUEUE}/${endpoint}`, {
      method: "POST",
      body: JSON.stringify(input),
    });
    if (!submit.ok) throw new Error(`fal submit failed (${submit.status}): ${await submit.text()}`);

    const { request_id, status_url, response_url } = (await submit.json()) as {
      request_id: string;
      status_url: string;
      response_url: string;
    };

    // Poll. fal reports IN_QUEUE / IN_PROGRESS / COMPLETED.
    const deadline = Date.now() + 15 * 60_000;
    let ticks = 0;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 2500));
      ticks++;
      const st = await falFetch(status_url);
      if (!st.ok) throw new Error(`fal status failed (${st.status})`);
      const body = (await st.json()) as { status: string; queue_position?: number };

      if (body.status === "COMPLETED") break;
      if (body.status === "FAILED" || body.status === "ERROR") {
        throw new Error(`fal job failed: ${JSON.stringify(body)}`);
      }
      // No real progress signal from the queue — approach 0.9 asymptotically.
      ctx.onProgress(Math.min(0.9, 1 - Math.exp(-ticks / 12)));
    }

    const res = await falFetch(response_url);
    if (!res.ok) throw new Error(`fal result failed (${res.status}): ${await res.text()}`);
    const out = (await res.json()) as { video?: { url?: string } };
    const url = out.video?.url;
    if (!url) throw new Error(`fal returned no video url: ${JSON.stringify(out).slice(0, 400)}`);

    ctx.onProgress(1);
    return { outputUrl: url, externalId: request_id };
  },
};
