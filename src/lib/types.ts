export type Modality = "t2v" | "i2v";

export type ModelId =
  | "wan2.2-i2v-a14b"
  | "wan2.2-t2v-a14b"
  | "wan2.1-i2v-14b"
  | "ltx-video-13b"
  | "hunyuan-video"
  | "mock";

export type ProviderId = "mock" | "fal" | "replicate" | "comfy";

export type Aspect = "16:9" | "9:16" | "1:1";

/**
 * The knobs a preset locks in. This is the layer Higgsfield sells: users don't
 * want a sampler config, they want "crash zoom" to look like a crash zoom.
 */
export interface MotionParams {
  /** Canonical camera move id — see CAMERA_MOVES. Drives prompt + LoRA choice. */
  cameraMove: string;
  /** 0..1 — how hard the move is pushed. Maps to LoRA weight and prompt adverbs. */
  intensity: number;
  /** 0..1 — handheld/organic noise. */
  shakiness: number;
  durationSec: number;
  /**
   * Generation fps. Wan 2.2 is trained at 16 — asking for 24 costs 50% more
   * frames for motion that isn't 50% better. Prefer 16 + film interpolation.
   */
  fps: number;
  aspect: Aspect;
  /** Render resolution. Dropping to 480p is the cheapest quality/cost lever. */
  resolution?: Resolution;
  /** Sampler steps. Distilled models want 4-8, full models 25-40. */
  steps?: number;
  guidance?: number;
  seed?: number;
}

export type Resolution = "480p" | "580p" | "720p";

export interface LoraRef {
  /** HF repo, or a URL to weights, e.g. "nosh-tv/wan22-crash-zoom-v3" */
  repo: string;
  weight: number;
  /**
   * Which Wan 2.2 expert to apply to. The A14B model denoises in two stages:
   * the high-noise expert lays down motion and composition, the low-noise one
   * resolves detail and texture. Camera-motion LoRAs belong on "high";
   * style/texture LoRAs on "low".
   */
  transformer?: "high" | "low" | "both";
}

export interface Preset {
  id: string;
  name: string;
  pack: PackId;
  blurb: string;
  modality: Modality[];
  /** Uses {{subject}}. Everything else is baked in — that's the point. */
  promptTemplate: string;
  negative: string;
  motion: MotionParams;
  preferredModel: ModelId;
  /**
   * LoRAs that actually exist and resolve. Sent to the provider. Keep empty
   * until weights are real — a bad path fails the whole generation.
   */
  loras: LoraRef[];
  /**
   * The training roadmap for this shot: LoRAs worth having but not yet trained.
   * Never sent to a provider. Move an entry into `loras` once it's real.
   */
  plannedLoras?: LoraRef[];
  /** Two hex colors for the card gradient until you have real thumbnails. */
  swatch: [string, string];
}

export type PackId = "camera" | "vfx" | "commerce";

export interface GenerateRequest {
  presetId: string;
  subject: string;
  /** Required for i2v presets. Public URL or data URL. */
  imageUrl?: string;
  overrides?: Partial<MotionParams>;
  provider?: ProviderId;
}

export type JobStatus = "queued" | "running" | "succeeded" | "failed";

export interface Job {
  id: string;
  createdAt: number;
  updatedAt: number;
  status: JobStatus;
  /** 0..1 */
  progress: number;
  presetId: string;
  presetName: string;
  subject: string;
  imageUrl?: string;
  provider: ProviderId;
  model: ModelId;
  modality: Modality;
  resolvedPrompt: string;
  negative: string;
  motion: MotionParams;
  loras: LoraRef[];
  outputUrl?: string;
  /** Provider-side id, useful for support tickets and refunds. */
  externalId?: string;
  error?: string;
  /** Ballpark, computed up front so you can gate on credits before spending. */
  estCostUsd: number;
  actualCostUsd?: number;
}

export interface ProviderRunContext {
  onProgress: (p: number) => void;
}

export interface ProviderResult {
  outputUrl: string;
  externalId?: string;
  actualCostUsd?: number;
}

export interface VideoProvider {
  id: ProviderId;
  label: string;
  /** False when the required env vars are missing — the UI greys it out. */
  isConfigured(): boolean;
  supports(model: ModelId): boolean;
  run(job: Job, ctx: ProviderRunContext): Promise<ProviderResult>;
}
