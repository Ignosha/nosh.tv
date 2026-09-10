import type { Job, ModelId, VideoProvider } from "../types";

/**
 * fal.ai queue API adapter.
 *
 * Endpoint ids and input schemas verified against fal's API docs (2026-09).
 * The queue protocol is: POST the endpoint -> poll status_url -> GET response_url.
 *
 * Two things worth knowing before editing this file:
 *
 * 1. Wan and LTX take *different* field names for the same concept
 *    (`frames_per_second` vs `frame_rate`, one step count vs a two-pass pair),
 *    so payloads are built per family, not shared.
 * 2. LoRAs only work on the `/lora` endpoint variants. The base endpoints
 *    silently ignore a `loras` array, which looks like "my LoRA did nothing"
 *    rather than an error.
 */

type Family = "wan" | "ltx";

interface Endpoint {
  family: Family;
  /** Endpoint without LoRA support. */
  base: string;
  /** Variant accepting a `loras` array, when one exists. */
  lora?: string;
}

const ENDPOINTS: Partial<Record<ModelId, Endpoint>> = {
  "wan2.2-i2v-a14b": {
    family: "wan",
    base: "fal-ai/wan/v2.2-a14b/image-to-video",
    lora: "fal-ai/wan/v2.2-a14b/image-to-video/lora",
  },
  "wan2.2-t2v-a14b": {
    family: "wan",
    base: "fal-ai/wan/v2.2-a14b/text-to-video",
    lora: "fal-ai/wan/v2.2-a14b/text-to-video/lora",
  },
  "wan2.1-i2v-14b": {
    family: "wan",
    base: "fal-ai/wan-i2v",
    lora: "fal-ai/wan-i2v-lora",
  },
  "ltx-video-13b": {
    family: "ltx",
    base: "fal-ai/ltx-video-13b-distilled/image-to-video",
  },
};

const QUEUE = "https://queue.fal.run";

/** fal's documented bounds. Sending outside these is a 422, not a clamp. */
const WAN_FRAMES = { min: 17, max: 161 };
const WAN_FPS = { min: 4, max: 60 };

function clamp(n: number, { min, max }: { min: number; max: number }): number {
  return Math.max(min, Math.min(max, Math.round(n)));
}

async function falFetch(url: string, init?: RequestInit): Promise<Response> {
  return fetch(url, {
    ...init,
    headers: {
      Authorization: `Key ${process.env.FAL_KEY ?? ""}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
}

function buildWanInput(job: Job): Record<string, unknown> {
  const fps = clamp(job.motion.fps, WAN_FPS);
  const input: Record<string, unknown> = {
    prompt: job.resolvedPrompt,
    negative_prompt: job.negative,
    num_frames: clamp(job.motion.durationSec * fps, WAN_FRAMES),
    frames_per_second: fps,
    resolution: job.motion.resolution ?? "720p",
    aspect_ratio: job.modality === "i2v" ? "auto" : job.motion.aspect,
    num_inference_steps: job.motion.steps ?? 27,
    guidance_scale: job.motion.guidance ?? 3.5,
    acceleration: "regular",
    // Off by default on fal. Turning both on is the minimum bar for anything
    // user-facing; it is not a substitute for your own moderation layer.
    enable_safety_checker: true,
    enable_output_safety_checker: true,
    // Generate at 16fps, interpolate up. Cheaper than generating more frames.
    interpolator_model: "film",
    num_interpolated_frames: 1,
  };

  if (job.motion.seed !== undefined) input.seed = job.motion.seed;
  if (job.modality === "i2v") input.image_url = job.imageUrl;

  if (job.loras.length) {
    input.loras = job.loras.map((l) => ({
      path: l.repo,
      scale: l.weight,
      transformer: l.transformer ?? "high",
    }));
  }
  return input;
}

function buildLtxInput(job: Job): Record<string, unknown> {
  // LTX is distilled and two-pass: `steps` maps onto both passes.
  const steps = job.motion.steps ?? 8;
  const input: Record<string, unknown> = {
    prompt: job.resolvedPrompt,
    negative_prompt: job.negative,
    num_frames: Math.round(job.motion.durationSec * job.motion.fps),
    frame_rate: job.motion.fps,
    resolution: job.motion.resolution === "580p" ? "720p" : (job.motion.resolution ?? "720p"),
    aspect_ratio: job.modality === "i2v" ? "auto" : job.motion.aspect,
    first_pass_num_inference_steps: steps,
    second_pass_num_inference_steps: steps,
    enable_safety_checker: true,
  };

  if (job.motion.seed !== undefined) input.seed = job.motion.seed;
  if (job.modality === "i2v") input.image_url = job.imageUrl;
  if (job.loras.length) {
    input.loras = job.loras.map((l) => ({ path: l.repo, scale: l.weight }));
  }
  return input;
}

export const falProvider: VideoProvider = {
  id: "fal",
  label: "fal.ai",
  isConfigured: () => Boolean(process.env.FAL_KEY),
  supports: (model) => model in ENDPOINTS,

  async run(job, ctx) {
    const ep = ENDPOINTS[job.model];
    if (!ep) throw new Error(`fal has no endpoint mapped for ${job.model}`);
    if (job.modality === "i2v" && !job.imageUrl) {
      throw new Error("This preset is image-to-video and needs a source image");
    }

    // LoRAs are silently dropped by the base endpoints — route or refuse.
    let endpoint = ep.base;
    if (job.loras.length) {
      if (!ep.lora) {
        throw new Error(
          `${job.model} has LoRAs configured but fal exposes no LoRA variant for it`,
        );
      }
      endpoint = ep.lora;
    }

    const input = ep.family === "wan" ? buildWanInput(job) : buildLtxInput(job);

    const submit = await falFetch(`${QUEUE}/${endpoint}`, {
      method: "POST",
      body: JSON.stringify(input),
    });
    if (!submit.ok) {
      throw new Error(`fal submit failed (${submit.status}): ${await submit.text()}`);
    }

    const { request_id, status_url, response_url } = (await submit.json()) as {
      request_id: string;
      status_url: string;
      response_url: string;
    };

    const deadline = Date.now() + 15 * 60_000;
    let ticks = 0;
    let done = false;

    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 2500));
      ticks++;

      const st = await falFetch(status_url);
      if (!st.ok) throw new Error(`fal status failed (${st.status}): ${await st.text()}`);
      const body = (await st.json()) as { status: string; queue_position?: number };

      if (body.status === "COMPLETED") {
        done = true;
        break;
      }
      if (body.status === "FAILED" || body.status === "ERROR") {
        throw new Error(`fal job failed: ${JSON.stringify(body)}`);
      }
      // The queue exposes no real progress signal, so approach 0.9 asymptotically
      // rather than inventing a percentage that would jump around.
      ctx.onProgress(Math.min(0.9, 1 - Math.exp(-ticks / 12)));
    }

    if (!done) throw new Error("fal job timed out after 15 minutes");

    const res = await falFetch(response_url);
    if (!res.ok) throw new Error(`fal result failed (${res.status}): ${await res.text()}`);

    const out = (await res.json()) as { video?: { url?: string }; seed?: number };
    const url = out.video?.url;
    if (!url) {
      throw new Error(`fal returned no video url: ${JSON.stringify(out).slice(0, 400)}`);
    }

    ctx.onProgress(1);
    return { outputUrl: url, externalId: request_id };
  },
};
