import { NextResponse } from "next/server";
import { estimateCostUsd, MODELS } from "@/lib/models";
import { getPreset, resolvePrompt } from "@/lib/presets";
import { resolveProvider } from "@/lib/providers";
import { startJob } from "@/lib/runner";
import { newId, putJob } from "@/lib/store";
import type { GenerateRequest, Job, Modality } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: GenerateRequest;
  try {
    body = (await req.json()) as GenerateRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const preset = getPreset(body.presetId);
  if (!preset) {
    return NextResponse.json({ error: `Unknown preset: ${body.presetId}` }, { status: 400 });
  }
  if (!body.subject?.trim()) {
    return NextResponse.json({ error: "Describe your subject first" }, { status: 400 });
  }

  // i2v presets need a first frame; fall back to t2v only if the preset allows it.
  const modality: Modality = body.imageUrl
    ? "i2v"
    : preset.modality.includes("t2v")
      ? "t2v"
      : "i2v";
  if (modality === "i2v" && !body.imageUrl) {
    return NextResponse.json(
      { error: `"${preset.name}" is image-to-video — give it a source image URL.` },
      { status: 400 },
    );
  }

  const motion = { ...preset.motion, ...(body.overrides ?? {}) };

  // Don't let a slider ask for more than the model can actually produce.
  const spec = MODELS[preset.preferredModel];
  motion.durationSec = Math.min(motion.durationSec, spec.maxDurationSec);

  const provider = resolveProvider(preset.preferredModel, body.provider);
  const model = provider.supports(preset.preferredModel) ? preset.preferredModel : "mock";

  const job: Job = {
    id: newId(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    status: "queued",
    progress: 0,
    presetId: preset.id,
    presetName: preset.name,
    subject: body.subject.trim(),
    imageUrl: body.imageUrl,
    provider: provider.id,
    model,
    modality,
    resolvedPrompt: resolvePrompt(preset, body.subject, body.overrides),
    negative: preset.negative,
    motion,
    loras: preset.loras,
    estCostUsd: estimateCostUsd(model, motion.durationSec, provider.id),
  };

  putJob(job);
  startJob(job);

  return NextResponse.json({ job }, { status: 202 });
}
