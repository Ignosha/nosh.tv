import { promises as fs } from "node:fs";
import path from "node:path";
import type { Job, VideoProvider } from "../types";

/**
 * Self-hosted ComfyUI adapter — the cheap path.
 *
 * You export a workflow from ComfyUI with "Save (API Format)" into
 * ./workflows/<model>.json, then give the nodes you want driven from the app a
 * *title* matching the keys in PATCHABLE below (right-click node -> Title).
 * Patching by title instead of node id means re-exporting the workflow doesn't
 * break the app.
 */

const PATCHABLE = {
  positive: "SF_POSITIVE",
  negative: "SF_NEGATIVE",
  image: "SF_IMAGE",
  sampler: "SF_SAMPLER",
  length: "SF_LENGTH",
} as const;

type ComfyNode = { class_type: string; inputs: Record<string, unknown>; _meta?: { title?: string } };
type ComfyGraph = Record<string, ComfyNode>;

const WORKFLOW_FILES: Record<string, string> = {
  "wan2.2-i2v-a14b": "wan22_i2v.json",
  "wan2.2-t2v-a14b": "wan22_t2v.json",
  "wan2.1-i2v-14b": "wan21_i2v.json",
  "ltx-video-13b": "ltx_i2v.json",
  "hunyuan-video": "hunyuan_t2v.json",
};

function base(): string {
  return (process.env.COMFY_URL ?? "").replace(/\/$/, "");
}

function authHeaders(): Record<string, string> {
  const t = process.env.COMFY_TOKEN;
  return t ? { Authorization: `Bearer ${t}` } : {};
}

function findByTitle(graph: ComfyGraph, title: string): ComfyNode | undefined {
  return Object.values(graph).find((n) => n._meta?.title === title);
}

async function buildGraph(job: Job): Promise<ComfyGraph> {
  const file = WORKFLOW_FILES[job.model];
  if (!file) throw new Error(`No ComfyUI workflow mapped for ${job.model}`);

  const raw = await fs.readFile(path.join(process.cwd(), "workflows", file), "utf8");
  const graph = JSON.parse(raw) as ComfyGraph;

  const pos = findByTitle(graph, PATCHABLE.positive);
  if (pos) pos.inputs.text = job.resolvedPrompt;

  const neg = findByTitle(graph, PATCHABLE.negative);
  if (neg) neg.inputs.text = job.negative;

  const sampler = findByTitle(graph, PATCHABLE.sampler);
  if (sampler) {
    if (job.motion.steps !== undefined) sampler.inputs.steps = job.motion.steps;
    if (job.motion.guidance !== undefined) sampler.inputs.cfg = job.motion.guidance;
    sampler.inputs.seed = job.motion.seed ?? Math.floor(Math.random() * 2 ** 32);
  }

  const length = findByTitle(graph, PATCHABLE.length);
  if (length) {
    length.inputs.length = Math.round(job.motion.durationSec * job.motion.fps);
    length.inputs.fps = job.motion.fps;
  }

  const img = findByTitle(graph, PATCHABLE.image);
  if (img && job.imageUrl) img.inputs.url = job.imageUrl;

  return graph;
}

export const comfyProvider: VideoProvider = {
  id: "comfy",
  label: "ComfyUI (self-hosted)",
  isConfigured: () => Boolean(process.env.COMFY_URL),
  supports: (model) => model in WORKFLOW_FILES,

  async run(job, ctx) {
    const graph = await buildGraph(job);
    const clientId = `shotforge-${job.id}`;

    const submit = await fetch(`${base()}/prompt`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ prompt: graph, client_id: clientId }),
    });
    if (!submit.ok) throw new Error(`comfy submit failed (${submit.status}): ${await submit.text()}`);
    const { prompt_id } = (await submit.json()) as { prompt_id: string };

    const deadline = Date.now() + 20 * 60_000;
    let ticks = 0;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 2000));
      ticks++;
      ctx.onProgress(Math.min(0.9, 1 - Math.exp(-ticks / 15)));

      const hist = await fetch(`${base()}/history/${prompt_id}`, { headers: authHeaders() });
      if (!hist.ok) continue;
      const body = (await hist.json()) as Record<
        string,
        { outputs?: Record<string, { gifs?: ComfyFile[]; videos?: ComfyFile[]; images?: ComfyFile[] }> }
      >;
      const entry = body[prompt_id];
      if (!entry?.outputs) continue;

      for (const out of Object.values(entry.outputs)) {
        const file = out.videos?.[0] ?? out.gifs?.[0] ?? out.images?.[0];
        if (file) {
          const q = new URLSearchParams({
            filename: file.filename,
            subfolder: file.subfolder ?? "",
            type: file.type ?? "output",
          });
          ctx.onProgress(1);
          return { outputUrl: `${base()}/view?${q.toString()}`, externalId: prompt_id };
        }
      }
    }
    throw new Error("comfy job timed out");
  },
};

interface ComfyFile {
  filename: string;
  subfolder?: string;
  type?: string;
}
