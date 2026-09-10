import type { ModelId, ProviderId, VideoProvider } from "../types";
import { comfyProvider } from "./comfy";
import { falProvider } from "./fal";
import { mockProvider } from "./mock";
import { replicateProvider } from "./replicate";

export const PROVIDERS: Record<ProviderId, VideoProvider> = {
  mock: mockProvider,
  fal: falProvider,
  replicate: replicateProvider,
  comfy: comfyProvider,
};

/**
 * Cheapest first. Self-hosted beats serverless on unit economics once you have
 * steady volume; serverless wins on burst and on not being paged at 3am.
 */
const PREFERENCE: ProviderId[] = ["comfy", "fal", "replicate", "mock"];

export function getProvider(id: ProviderId): VideoProvider {
  return PROVIDERS[id] ?? mockProvider;
}

/** Pick a provider that is both configured and able to run this model. */
export function resolveProvider(model: ModelId, requested?: ProviderId): VideoProvider {
  if (requested) {
    const p = getProvider(requested);
    if (p.isConfigured() && p.supports(model)) return p;
  }

  const fromEnv = process.env.DEFAULT_PROVIDER as ProviderId | undefined;
  if (fromEnv) {
    const p = getProvider(fromEnv);
    if (p.isConfigured() && p.supports(model)) return p;
  }

  for (const id of PREFERENCE) {
    const p = PROVIDERS[id];
    if (p.isConfigured() && p.supports(model)) return p;
  }
  return mockProvider;
}

export function providerStatus(): { id: ProviderId; label: string; configured: boolean }[] {
  return (Object.keys(PROVIDERS) as ProviderId[]).map((id) => ({
    id,
    label: PROVIDERS[id].label,
    configured: PROVIDERS[id].isConfigured(),
  }));
}
