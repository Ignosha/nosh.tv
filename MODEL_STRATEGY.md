# Model strategy

## The honest version of "build a custom model that beats Higgsfield"

You cannot pretrain a competitive video diffusion model. That is a $10M–$100M+ compute
problem plus a licensed video corpus plus a research team. Nobody bootstraps it.

You *can* build a custom model in the sense that matters commercially: take the best open
weights, then train an adapter stack that makes your output visibly better than theirs **on
one specific kind of shot**. That's a $2k–$20k problem, not a $50M one, and it produces
something a competitor can't copy by reading your marketing page.

That's the whole plan. Everything below is detail.

## Layer 1 — base weights (free, as in licensed)

| Model | License | Use it for |
|---|---|---|
| **Wan 2.2 I2V A14B** | Apache-2.0 | Default workhorse. Best open i2v currently. Mature LoRA tooling. |
| **Wan 2.2 T2V A14B** | Apache-2.0 | When there's no source frame. |
| **LTX-Video 13B distilled** | LTXV Open Weights | ~8 steps, near-realtime. Free tier + instant previews. |
| **HunyuanVideo** | Tencent Community | Strong human motion. Read the license before charging. |
| **FLUX.1-schnell / Qwen-Image** | Apache-2.0 / see repo | Generating the first frame for i2v. |

"Free" means the weights cost nothing. **Compute is not free.** Apache-2.0 also does not mean
the training data was clean — that's a risk you carry, not one you can license away.

Check every license yourself before you charge money for output. FLUX.1-dev in particular is
**non-commercial**; schnell is not. This trips people up constantly.

## Layer 2 — the adapter stack (this is your actual product)

Higgsfield's presets are, functionally, camera-motion conditioning. You replicate and then beat
that with a stack of LoRAs trained per shot type.

**Per-LoRA recipe:**

1. **Collect 30–100 clips** of the target move. Licensed stock, footage you shoot yourself, or
   synthetic renders from Blender with the exact camera path you want. Blender is underrated
   here: perfect labels, no licensing risk, infinite variations.
2. **Caption consistently.** Same vocabulary every time — this is why `CAMERA_MOVES` in
   `presets.ts` is a fixed id list and not free text.
3. **Train** with `diffusion-pipe` or `musubi-tuner`. Rank 32–64 is usually plenty.
4. **Cost:** ~4–12 hours on one A100/H100. At ~$2–3/hr that's **$10–40 of GPU per LoRA**,
   plus your data cost. Budget a few hundred dollars and several days of iteration per shot
   that you actually care about.
5. **Evaluate** against a fixed prompt set, same seeds, before/after. Keep the eval set in git.

Ten good LoRAs is a differentiated product. That is the entire "custom model" story, and it is
achievable by one person.

**Beyond LoRA**, when you have traction: a ControlNet-style camera-pose adapter trained on
Blender-rendered pose/video pairs gives you *parametric* camera control — the user drags a path
instead of picking a preset. That's a genuine product leap over a preset grid, and it's a
weeks-not-years project on top of Wan.

## Layer 3 — compute

| Path | Rough cost per 5s 720p clip | When |
|---|---|---|
| fal / Replicate serverless | ~$0.15–0.50 | Day one. Don't run infra to validate demand. |
| RunPod / Vast H100, warm | ~$0.05–0.15 | Once you have steady volume. |
| Reserved cluster | lower still | Only at real scale. |

Numbers are ballpark and move fast — measure your own before pricing anything.

**The margin trap:** a "free tier, 3 clips a day" offer on Wan 14B is roughly $0.30/day/user of
pure loss, and free users convert at a few percent. Put the free tier on the distilled LTX model
(~5–10x cheaper), and gate Wan behind credits. `presets.ts` already has a `quick-preview` preset
for exactly this.

## Layer 4 — where you actually win

You will not beat a funded competitor at general-purpose "cool AI effects." Distribution
compounds and they're ahead of you on it.

You beat them by owning one job completely. The `commerce` pack in `presets.ts` is the wedge:

- Upload a product photo → get 6 ad-ready shots in the aspect ratios each platform wants
- Consistent product across every shot (the thing generic tools fail at, and the thing that
  actually blocks a purchase)
- Brand kit: your colors, your lighting, your typography, locked across a campaign
- Export straight to the ad formats, not a bare mp4

That user has a budget line for this already. They are not price-shopping against a $9
prosumer subscription, and they don't care that you can also set someone on fire.

## Suggested order of work

1. **Ship the mock loop as the real loop.** Wire fal, verify one preset produces something good. (days)
2. **Hand-tune 5 commerce presets** until they beat the generic tools on prompt alone. No training yet. (1–2 weeks)
3. **Put it in front of 10 e-comm sellers.** Charge from the first one. This is the real test — everything above this line is the easy part.
4. **Only then train LoRAs**, on the two shots your actual users request most.
5. **Then** self-host to fix margins.

Do not invert 4 and 3. Training LoRAs is the fun part, which is exactly why it's the part that
kills projects that skip validation.
