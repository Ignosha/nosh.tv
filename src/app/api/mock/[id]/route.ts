import { CAMERA_MOVES } from "@/lib/presets";

export const runtime = "nodejs";

/**
 * Stand-in "render" for the mock provider: an animated SVG whose motion mimics
 * the requested camera move. Lets you build and demo the whole product loop
 * before wiring a GPU. Delete once real providers are live.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(req.url);
  const move = url.searchParams.get("move") ?? "static";
  const name = url.searchParams.get("name") ?? "Preset";
  const subject = url.searchParams.get("subject") ?? "subject";

  const known = (CAMERA_MOVES as readonly string[]).includes(move);
  const transform = motionFor(known ? move : "static");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" width="640" height="360">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1b1030"/>
      <stop offset="100%" stop-color="#08131f"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="45%">
      <stop offset="0%" stop-color="#7b5cff" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#7b5cff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="640" height="360" fill="url(#bg)"/>
  <g>
    ${transform}
    <ellipse cx="320" cy="170" rx="230" ry="150" fill="url(#glow)"/>
    <rect x="230" y="110" width="180" height="130" rx="14" fill="#2de1c2" opacity="0.85"/>
    <circle cx="320" cy="150" r="34" fill="#08131f" opacity="0.55"/>
    <rect x="262" y="196" width="116" height="10" rx="5" fill="#08131f" opacity="0.45"/>
  </g>
  <text x="24" y="40" font-family="ui-monospace, monospace" font-size="18" fill="#eae6ff">${esc(name)}</text>
  <text x="24" y="64" font-family="ui-monospace, monospace" font-size="13" fill="#9c93c9">${esc(move)} · mock render</text>
  <text x="24" y="336" font-family="ui-monospace, monospace" font-size="12" fill="#6f6795">${esc(subject)}</text>
  <text x="616" y="336" text-anchor="end" font-family="ui-monospace, monospace" font-size="11" fill="#4b4570">${esc(id)}</text>
</svg>`;

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

function esc(s: string): string {
  return s.replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" })[c]!);
}

/** SMIL transform that roughly reads as the named camera move. */
function motionFor(move: string): string {
  const anim = (attr: string, values: string, dur = "3s") =>
    `<animateTransform attributeName="transform" type="${attr}" values="${values}" dur="${dur}" repeatCount="indefinite" additive="sum"/>`;

  switch (move) {
    case "crash_zoom_in":
      return anim("scale", "1;1.9;1", "1.4s");
    case "dolly_in":
      return anim("scale", "1;1.25;1", "5s");
    case "dolly_out":
      return anim("scale", "1.25;1;1.25", "5s");
    case "orbit_left":
    case "orbit_right":
    case "product_spin_360":
      return `<animateTransform attributeName="transform" type="rotate" values="0 320 180;360 320 180" dur="6s" repeatCount="indefinite" additive="sum"/>`;
    case "crane_up":
      return anim("translate", "0 60;0 -30;0 60", "6s");
    case "crane_down":
    case "top_down_reveal":
      return anim("translate", "0 -60;0 30;0 -60", "6s");
    case "whip_pan":
      return anim("translate", "-180 0;180 0;-180 0", "1.6s");
    case "handheld_follow":
      return anim("translate", "0 0;6 -4;-5 5;3 2;0 0", "1.2s");
    case "fpv_drone":
      return anim("translate", "0 0;40 -30;-35 25;15 10;0 0", "2s");
    case "dutch_roll":
      return `<animateTransform attributeName="transform" type="rotate" values="-12 320 180;12 320 180;-12 320 180" dur="4s" repeatCount="indefinite" additive="sum"/>`;
    case "bullet_time":
      return anim("scale", "1;1.08;1", "8s");
    default:
      return anim("scale", "1;1.02;1", "6s");
  }
}
