import type { MotionParams, Preset } from "./types";

/**
 * Canonical camera vocabulary. Every preset picks one. Keeping these as ids
 * (not free text) is what lets you swap the underlying model without the
 * preset library rotting â€” you retrain/remap the LoRA, the id stays.
 */
export const CAMERA_MOVES = [
  "static",
  "dolly_in",
  "dolly_out",
  "crash_zoom_in",
  "orbit_left",
  "orbit_right",
  "crane_up",
  "crane_down",
  "whip_pan",
  "handheld_follow",
  "fpv_drone",
  "bullet_time",
  "dutch_roll",
  "rack_focus",
  "product_spin_360",
  "top_down_reveal",
] as const;

const BASE_NEGATIVE =
  "blurry, low quality, jpeg artifacts, watermark, text overlay, distorted hands, " +
  "extra limbs, morphing face, flickering, duplicate subject, oversaturated";

function motion(p: Partial<MotionParams> & Pick<MotionParams, "cameraMove">): MotionParams {
  return {
    intensity: 0.7,
    shakiness: 0.15,
    durationSec: 5,
    // Wan 2.2's native rate. The fal adapter interpolates up to ~32fps on the
    // way out, which looks better than paying to generate 24 real frames.
    fps: 16,
    aspect: "16:9",
    resolution: "720p",
    steps: 27,
    guidance: 3.5,
    ...p,
  };
}

export const PRESETS: Preset[] = [
  // ---------------------------------------------------------------- camera
  {
    id: "crash-zoom",
    name: "Crash Zoom",
    pack: "camera",
    blurb: "Violent snap-in on the subject. The workhorse of every viral edit.",
    modality: ["i2v", "t2v"],
    promptTemplate:
      "{{subject}}. Extremely fast crash zoom pushing in hard toward the subject, " +
      "motion blur streaking at the frame edges, subject stays locked in the centre, " +
      "shallow depth of field, anamorphic lens, cinematic color grade",
    negative: BASE_NEGATIVE + ", slow motion, static camera",
    motion: motion({ cameraMove: "crash_zoom_in", intensity: 0.95, shakiness: 0.35 }),
    preferredModel: "wan2.2-i2v-a14b",
    loras: [],
    plannedLoras: [{ repo: "nosh-tv/wan22-crash-zoom", weight: 0.9 }],
    swatch: ["#ff5f6d", "#ffc371"],
  },
  {
    id: "slow-push",
    name: "Slow Push In",
    pack: "camera",
    blurb: "Patient dolly toward the face. Reads as prestige drama.",
    modality: ["i2v"],
    promptTemplate:
      "{{subject}}. Slow deliberate dolly push toward the subject on a smooth track, " +
      "subtle parallax on the background, 35mm film grain, soft key light, " +
      "shallow focus falling off behind the subject",
    negative: BASE_NEGATIVE + ", fast motion, zoom out, shaky",
    motion: motion({ cameraMove: "dolly_in", intensity: 0.4, shakiness: 0.05, durationSec: 5 }),
    preferredModel: "wan2.2-i2v-a14b",
    loras: [],
    plannedLoras: [{ repo: "nosh-tv/wan22-dolly", weight: 0.6 }],
    swatch: ["#243949", "#517fa4"],
  },
  {
    id: "orbit",
    name: "Hero Orbit",
    pack: "camera",
    blurb: "Camera arcs around the subject while they hold still.",
    modality: ["i2v"],
    promptTemplate:
      "{{subject}}. Camera arcs smoothly around the subject in a wide orbit, " +
      "background sweeps past with strong parallax, subject remains sharp and centred, " +
      "volumetric light, cinematic lens flare",
    negative: BASE_NEGATIVE + ", subject rotating, static camera, warping background",
    motion: motion({ cameraMove: "orbit_left", intensity: 0.65, shakiness: 0.08 }),
    preferredModel: "wan2.2-i2v-a14b",
    loras: [],
    plannedLoras: [{ repo: "nosh-tv/wan22-orbit", weight: 0.8 }],
    swatch: ["#0f2027", "#2c5364"],
  },
  {
    id: "fpv-drone",
    name: "FPV Drone",
    pack: "camera",
    blurb: "Aggressive first-person drone dive through the scene.",
    modality: ["i2v", "t2v"],
    promptTemplate:
      "{{subject}}. Aggressive FPV racing drone flight diving through the scene, " +
      "wide-angle fisheye distortion, rapid altitude change, whip-fast direction changes, " +
      "high shutter speed, GoPro look",
    negative: BASE_NEGATIVE + ", tripod, static, slow",
    motion: motion({ cameraMove: "fpv_drone", intensity: 0.9, shakiness: 0.45, durationSec: 5 }),
    preferredModel: "wan2.2-t2v-a14b",
    loras: [],
    plannedLoras: [{ repo: "nosh-tv/wan22-fpv", weight: 0.85 }],
    swatch: ["#1e3c72", "#2a5298"],
  },
  {
    id: "bullet-time",
    name: "Bullet Time",
    pack: "camera",
    blurb: "Subject frozen mid-action, camera keeps moving around them.",
    modality: ["i2v"],
    promptTemplate:
      "{{subject}}. Time freezes on the subject mid-action while the camera continues " +
      "to sweep around them, floating debris suspended in the air, dramatic rim lighting, " +
      "high contrast, ultra slow motion",
    negative: BASE_NEGATIVE + ", subject moving normally, fast subject motion",
    motion: motion({ cameraMove: "bullet_time", intensity: 0.8, shakiness: 0.02 }),
    preferredModel: "wan2.2-i2v-a14b",
    loras: [],
    plannedLoras: [{ repo: "nosh-tv/wan22-bullettime", weight: 0.9 }],
    swatch: ["#3a1c71", "#d76d77"],
  },
  {
    id: "crane-reveal",
    name: "Crane Reveal",
    pack: "camera",
    blurb: "Rises off the subject to expose the whole environment.",
    modality: ["i2v"],
    promptTemplate:
      "{{subject}}. Camera cranes upward and back, pulling away from the subject to " +
      "reveal the full environment, epic establishing shot, wide vista opening up, " +
      "golden hour light",
    negative: BASE_NEGATIVE + ", push in, close up, cramped framing",
    motion: motion({ cameraMove: "crane_up", intensity: 0.7, shakiness: 0.06 }),
    preferredModel: "wan2.2-i2v-a14b",
    loras: [],
    plannedLoras: [{ repo: "nosh-tv/wan22-crane", weight: 0.7 }],
    swatch: ["#134e5e", "#71b280"],
  },

  // ------------------------------------------------------------------- vfx
  {
    id: "disintegrate",
    name: "Disintegrate",
    pack: "vfx",
    blurb: "Subject crumbles into drifting ash and particles.",
    modality: ["i2v"],
    promptTemplate:
      "{{subject}}. The subject slowly disintegrates into fine drifting ash and glowing " +
      "embers from the edges inward, particles carried away on the wind, backlit, " +
      "dark moody background",
    negative: BASE_NEGATIVE + ", subject intact, no particles",
    motion: motion({ cameraMove: "dolly_in", intensity: 0.5, shakiness: 0.1 }),
    preferredModel: "wan2.2-i2v-a14b",
    loras: [],
    plannedLoras: [{ repo: "nosh-tv/wan22-disintegrate", weight: 1.0 }],
    swatch: ["#870000", "#190a05"],
  },
  {
    id: "levitate",
    name: "Levitate",
    pack: "vfx",
    blurb: "Subject lifts off the ground with energy building underneath.",
    modality: ["i2v"],
    promptTemplate:
      "{{subject}}. The subject slowly rises off the ground, dust and small debris " +
      "lifting with them, energy rippling outward beneath, clothing and hair floating " +
      "upward, low angle hero shot",
    negative: BASE_NEGATIVE + ", subject on ground, falling",
    motion: motion({ cameraMove: "crane_down", intensity: 0.6, shakiness: 0.12 }),
    preferredModel: "wan2.2-i2v-a14b",
    loras: [],
    plannedLoras: [{ repo: "nosh-tv/wan22-levitate", weight: 0.85 }],
    swatch: ["#4568dc", "#b06ab3"],
  },
  {
    id: "liquid-morph",
    name: "Liquid Morph",
    pack: "vfx",
    blurb: "Subject melts and reforms as chrome liquid.",
    modality: ["i2v"],
    promptTemplate:
      "{{subject}}. The subject flows and reforms as liquid chrome, mirror-like " +
      "reflective surface rippling and settling, studio HDRI reflections, " +
      "high gloss, macro detail on the surface tension",
    negative: BASE_NEGATIVE + ", matte surface, static",
    motion: motion({ cameraMove: "orbit_right", intensity: 0.55, shakiness: 0.05 }),
    preferredModel: "wan2.2-i2v-a14b",
    loras: [],
    plannedLoras: [{ repo: "nosh-tv/wan22-chrome", weight: 0.9 }],
    swatch: ["#bdc3c7", "#2c3e50"],
  },
  {
    id: "ignite",
    name: "Ignite",
    pack: "vfx",
    blurb: "Fire catches and spreads across the subject.",
    modality: ["i2v"],
    promptTemplate:
      "{{subject}}. Flames catch and spread across the subject, realistic fire " +
      "simulation with rising heat distortion and floating embers, strong orange " +
      "key light from the flames, dark surroundings",
    negative: BASE_NEGATIVE + ", cartoon fire, no flames",
    motion: motion({ cameraMove: "handheld_follow", intensity: 0.7, shakiness: 0.3 }),
    preferredModel: "wan2.2-i2v-a14b",
    loras: [],
    plannedLoras: [{ repo: "nosh-tv/wan22-fire", weight: 0.95 }],
    swatch: ["#f12711", "#f5af19"],
  },

  // -------------------------------------------------------------- commerce
  // The wedge. Generalist "cool effects" is a crowded fight; owning the
  // product-ad job end to end is not.
  {
    id: "product-spin",
    name: "Product Spin",
    pack: "commerce",
    blurb: "Clean 360 turntable on seamless studio backdrop.",
    modality: ["i2v"],
    promptTemplate:
      "{{subject}} on a seamless studio backdrop. The product rotates smoothly on a " +
      "turntable through a full revolution, three-point softbox lighting, crisp " +
      "specular highlights, clean reflective floor, commercial product photography",
    negative: BASE_NEGATIVE + ", cluttered background, hands, people, changing product shape",
    motion: motion({ cameraMove: "product_spin_360", intensity: 0.5, shakiness: 0.0, durationSec: 5 }),
    preferredModel: "wan2.2-i2v-a14b",
    loras: [],
    plannedLoras: [{ repo: "nosh-tv/wan22-turntable", weight: 0.8 }],
    swatch: ["#e0eafc", "#8ea7c9"],
  },
  {
    id: "unbox-hero",
    name: "Unbox Hero",
    pack: "commerce",
    blurb: "Hands present the product to camera. UGC-ad grammar.",
    modality: ["i2v"],
    promptTemplate:
      "{{subject}} held up toward the camera by a pair of hands, presented at a " +
      "flattering angle, soft natural window light, shallow depth of field, " +
      "authentic handheld UGC style, warm domestic background out of focus",
    negative: BASE_NEGATIVE + ", studio sterile look, floating product, deformed hands",
    motion: motion({ cameraMove: "handheld_follow", intensity: 0.45, shakiness: 0.35, aspect: "9:16" }),
    preferredModel: "wan2.2-i2v-a14b",
    loras: [],
    plannedLoras: [{ repo: "nosh-tv/wan22-ugc-hands", weight: 0.75 }],
    swatch: ["#f7971e", "#ffd200"],
  },
  {
    id: "pour-shot",
    name: "Pour Shot",
    pack: "commerce",
    blurb: "Liquid pours in slow motion. Beverage-ad staple.",
    modality: ["i2v"],
    promptTemplate:
      "{{subject}}. Liquid pours in extreme slow motion with individual droplets and " +
      "splash crowns frozen in the air, high-speed camera look, backlit liquid glow, " +
      "condensation on the surface, macro lens",
    negative: BASE_NEGATIVE + ", fast motion, spilled mess, murky liquid",
    motion: motion({ cameraMove: "dolly_in", intensity: 0.35, shakiness: 0.04, aspect: "9:16" }),
    preferredModel: "wan2.2-i2v-a14b",
    loras: [],
    plannedLoras: [{ repo: "nosh-tv/wan22-liquid", weight: 0.85 }],
    swatch: ["#00c6ff", "#0072ff" ],
  },
  {
    id: "shelf-reveal",
    name: "Shelf Reveal",
    pack: "commerce",
    blurb: "Top-down reveal onto the product in context.",
    modality: ["i2v"],
    promptTemplate:
      "{{subject}}. Camera descends from directly overhead and settles on the product " +
      "in a styled lifestyle scene, props arranged around it, bright airy editorial " +
      "lighting, shallow depth of field on the surrounding props",
    negative: BASE_NEGATIVE + ", dark scene, cluttered, product obscured",
    motion: motion({ cameraMove: "top_down_reveal", intensity: 0.55, shakiness: 0.06, aspect: "1:1" }),
    preferredModel: "wan2.2-i2v-a14b",
    loras: [],
    plannedLoras: [{ repo: "nosh-tv/wan22-topdown", weight: 0.7 }],
    swatch: ["#ede574", "#e1f5c4"],
  },
  {
    id: "quick-preview",
    name: "Quick Preview",
    pack: "commerce",
    blurb: "8-step draft on LTX. Free tier and pre-commit previews.",
    modality: ["i2v", "t2v"],
    promptTemplate: "{{subject}}, cinematic, smooth natural camera movement, well lit",
    negative: BASE_NEGATIVE,
    // LTX is distilled: 8 steps per pass, and it runs natively at 24fps.
    motion: motion({ cameraMove: "dolly_in", intensity: 0.4, shakiness: 0.1, steps: 8, fps: 24, durationSec: 4 }),
    preferredModel: "ltx-video-13b",
    loras: [],
    swatch: ["#5f2c82", "#49a09d"],
  },
];

export const PACKS: { id: Preset["pack"]; label: string; blurb: string }[] = [
  { id: "camera", label: "Camera", blurb: "Moves a real DoP would call for." },
  { id: "vfx", label: "VFX", blurb: "Transformations and destruction." },
  { id: "commerce", label: "Commerce", blurb: "Ad shots that sell a product." },
];

export function getPreset(id: string): Preset | undefined {
  return PRESETS.find((p) => p.id === id);
}

/**
 * Resolve a preset + user subject into a final prompt. Intensity and shakiness
 * are folded in as language because prompt adherence beats parameter tweaking
 * on every open video model currently worth using.
 */
export function resolvePrompt(preset: Preset, subject: string, motionOverrides?: Partial<MotionParams>): string {
  const m = { ...preset.motion, ...motionOverrides };
  const clean = subject.trim().replace(/\.$/, "") || "the subject";
  let prompt = preset.promptTemplate.replace(/\{\{subject\}\}/g, clean);

  if (m.intensity >= 0.85) prompt += ", extremely pronounced camera movement";
  else if (m.intensity <= 0.3) prompt += ", very subtle restrained camera movement";

  if (m.shakiness >= 0.4) prompt += ", handheld with visible camera shake";
  else if (m.shakiness <= 0.05) prompt += ", perfectly stabilised gimbal movement";

  return prompt;
}
