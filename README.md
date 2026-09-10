# nosh.tv

A preset-driven video generation studio built on **open-weight models**. The product layer —
shot library, prompt engineering, LoRA stacks, job lifecycle, cost accounting — is the thing
that gets built here. The model is a swappable backend.

## Status

Scaffold. Runs end to end on the `mock` provider with no API keys and no GPU. Real providers
(fal, Replicate, self-hosted ComfyUI) are wired but their endpoint slugs need verifying against
current vendor docs before you trust them.

## Run it

Requires **Node 20+**.

```bash
npm install
```

```bash
npm run dev
```

Open http://localhost:3000. With no `.env.local`, everything runs on the mock provider —
the full queue → progress → output loop, rendered as an animated SVG. That's deliberate:
you can build and demo the product before spending a cent on compute.

To use real GPUs, copy `.env.example` to `.env.local` and fill in one of:

- `FAL_KEY` — serverless, fastest to a working render
- `REPLICATE_API_TOKEN` — second source, useful for failover
- `COMFY_URL` — your own ComfyUI on a rented GPU; cheapest per clip at volume

## Architecture

```
src/lib/presets.ts        The moat. Shot definitions: prompt template, negatives,
                          camera move, LoRA stack, sampler settings.
src/lib/models.ts         Model registry — licenses, limits, cost per output second.
src/lib/providers/*       One adapter per compute backend. All implement VideoProvider.
src/lib/runner.ts         In-process job runner. Replace with a real worker before deploying.
src/lib/store.ts          File-backed job store. Replace with Postgres at 2 concurrent users.
src/app/api/*             generate / jobs / presets endpoints.
src/components/Studio.tsx The whole UI.
```

Three seams are deliberately narrow so they can be replaced independently:

1. **`VideoProvider`** — swapping compute vendors touches one file.
2. **`Preset`** — the shot library is data. Adding shots ships no code.
3. **`startJob`** — the one place that assumes an in-process runner.

## Known gaps

These are real, not TODO theatre:

- **No auth, no credits, no rate limiting.** Anyone who can reach the server can spend your GPU budget.
- **No moderation.** You need an input and output classifier before this touches the public internet.
- **The runner dies with the process.** Serverless deploys will drop in-flight jobs. Needs a queue + worker.
- **Replicate endpoint slugs are unverified.** fal's are checked against its API docs; Replicate's are not — verify at replicate.com/explore before relying on that provider.
- **LoRA repos in `presets.ts` are placeholders.** They name LoRAs you have to train (see MODEL_STRATEGY.md).
- **No first-frame generation.** i2v presets need a source image; a real product generates that too.

## Where the differentiation actually lives

Not in the model. In:

- the **shot library** (data, iterable daily, no deploys)
- the **LoRA stack** trained on curated shot footage
- picking one **job to own end to end** — the `commerce` pack is the wedge

See [MODEL_STRATEGY.md](MODEL_STRATEGY.md).
