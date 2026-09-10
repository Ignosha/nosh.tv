import type { ModelId } from "./types";

export interface ModelSpec {
  id: ModelId;
  label: string;
  /** Weights license. This is a business decision, not a footnote. */
  license: string;
  openWeights: boolean;
  modality: ("t2v" | "i2v")[];
  maxDurationSec: number;
  nativeRes: string;
  /**
   * Ballpark $/second-of-output on rented H100-class hardware, assuming you
   * batch and keep the GPU warm. Serverless providers charge 2-5x this.
   * Verify against your own bills before you price a subscription on it.
   */
  estCostPerOutputSecUsd: number;
  notes: string;
}

export const MODELS: Record<ModelId, ModelSpec> = {
  "wan2.2-i2v-a14b": {
    id: "wan2.2-i2v-a14b",
    label: "Wan 2.2 I2V A14B",
    license: "Apache-2.0",
    openWeights: true,
    modality: ["i2v"],
    maxDurationSec: 5,
    nativeRes: "1280x720",
    estCostPerOutputSecUsd: 0.02,
    notes:
      "Strongest open image-to-video as of writing. MoE-style A14B: two expert " +
      "denoisers, high-noise then low-noise. LoRA tooling is mature (diffusion-pipe, " +
      "musubi-tuner). This is the default workhorse.",
  },
  "wan2.2-t2v-a14b": {
    id: "wan2.2-t2v-a14b",
    label: "Wan 2.2 T2V A14B",
    license: "Apache-2.0",
    openWeights: true,
    modality: ["t2v"],
    maxDurationSec: 5,
    nativeRes: "1280x720",
    estCostPerOutputSecUsd: 0.02,
    notes: "Text-to-video sibling. Prefer i2v where you can — a good first frame is the cheapest quality win there is.",
  },
  "wan2.1-i2v-14b": {
    id: "wan2.1-i2v-14b",
    label: "Wan 2.1 I2V 14B",
    license: "Apache-2.0",
    openWeights: true,
    modality: ["i2v"],
    maxDurationSec: 5,
    nativeRes: "1280x720",
    estCostPerOutputSecUsd: 0.018,
    notes: "Older but has the largest community LoRA ecosystem. Good fallback when a 2.2 LoRA doesn't exist yet.",
  },
  "ltx-video-13b": {
    id: "ltx-video-13b",
    label: "LTX-Video 13B (distilled)",
    license: "LTXV Open Weights (see terms)",
    openWeights: true,
    modality: ["t2v", "i2v"],
    maxDurationSec: 10,
    nativeRes: "1216x704",
    estCostPerOutputSecUsd: 0.004,
    notes:
      "Distilled: ~8 steps, near-realtime. Use it for the free tier and for " +
      "instant previews before the user commits credits to a Wan render.",
  },
  "hunyuan-video": {
    id: "hunyuan-video",
    label: "HunyuanVideo 13B",
    license: "Tencent Hunyuan Community",
    openWeights: true,
    modality: ["t2v"],
    maxDurationSec: 5,
    nativeRes: "1280x720",
    estCostPerOutputSecUsd: 0.03,
    notes: "Strong motion and human anatomy. License is community, not Apache — read it before you charge for output.",
  },
  mock: {
    id: "mock",
    label: "Mock (offline)",
    license: "n/a",
    openWeights: false,
    modality: ["t2v", "i2v"],
    maxDurationSec: 10,
    nativeRes: "n/a",
    estCostPerOutputSecUsd: 0,
    notes: "Simulates the full job lifecycle with no GPU and no keys. Renders an animated SVG so the UI has something to show.",
  },
};

/** Provider markup over raw GPU cost, used only for the pre-flight estimate. */
const PROVIDER_MULTIPLIER: Record<string, number> = {
  mock: 0,
  comfy: 1,
  fal: 3,
  replicate: 3.5,
};

export function estimateCostUsd(model: ModelId, durationSec: number, provider: string): number {
  const spec = MODELS[model];
  const mult = PROVIDER_MULTIPLIER[provider] ?? 3;
  return +(spec.estCostPerOutputSecUsd * durationSec * mult).toFixed(4);
}
