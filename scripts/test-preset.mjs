#!/usr/bin/env node
/**
 * End-to-end preset test against a running dev server.
 *
 *   npm run dev                       # in one terminal
 *   node scripts/test-preset.mjs product-spin --image https://…/mug.jpg
 *
 * Goes through the real /api/generate path rather than calling fal directly,
 * so a pass here means the whole product path works, not just the credentials.
 */

const args = process.argv.slice(2);
if (args.length === 0 || args.includes("--help")) {
  console.log(`
Usage: node scripts/test-preset.mjs <presetId> [options]

Options:
  --subject "<text>"   Subject description (default: a sample subject)
  --image <url>        Source image URL. Required for image-to-video presets.
  --provider <id>      mock | fal | replicate | comfy  (default: server's choice)
  --host <url>         Dev server (default: http://localhost:3000)

Examples:
  node scripts/test-preset.mjs quick-preview --provider mock
  node scripts/test-preset.mjs crash-zoom --provider fal --image https://picsum.photos/1280/720
`);
  process.exit(args.length === 0 ? 1 : 0);
}

function flag(name, fallback = undefined) {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
}

const presetId = args[0];
const host = (flag("host", "http://localhost:3000")).replace(/\/$/, "");
const subject = flag("subject", "a matte black espresso machine on a marble counter");
const imageUrl = flag("image");
const provider = flag("provider");

const t0 = Date.now();
const elapsed = () => `${((Date.now() - t0) / 1000).toFixed(1)}s`;

async function main() {
  // Confirm the preset exists before spending anything.
  const cat = await fetch(`${host}/api/presets`).catch(() => null);
  if (!cat || !cat.ok) {
    console.error(`✗ Can't reach ${host}. Is "npm run dev" running?`);
    process.exit(1);
  }
  const { presets, providers } = await cat.json();
  const preset = presets.find((p) => p.id === presetId);
  if (!preset) {
    console.error(`✗ Unknown preset "${presetId}". Available:`);
    for (const p of presets) console.error(`    ${p.pack.padEnd(9)} ${p.id}`);
    process.exit(1);
  }

  const configured = providers.filter((p) => p.configured).map((p) => p.id);
  console.log(`preset    ${preset.name} (${preset.id})`);
  console.log(`model     ${preset.preferredModel}`);
  console.log(`loras     ${preset.loras.length ? preset.loras.map((l) => l.repo).join(", ") : "none"}`);
  console.log(`providers ${configured.join(", ")}`);

  if (provider === "fal" && !configured.includes("fal")) {
    console.error(`\n✗ fal isn't configured. Put FAL_KEY in .env.local and restart the dev server.`);
    process.exit(1);
  }
  if (!preset.modality.includes("t2v") && !imageUrl) {
    console.error(`\n✗ "${preset.name}" is image-to-video — pass --image <url>.`);
    process.exit(1);
  }

  const res = await fetch(`${host}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ presetId, subject, imageUrl, provider }),
  });
  const body = await res.json();
  if (!res.ok) {
    console.error(`\n✗ generate failed (${res.status}): ${body.error ?? JSON.stringify(body)}`);
    process.exit(1);
  }

  const { job } = body;
  console.log(`\nqueued    ${job.id} via ${job.provider} · est $${job.estCostUsd.toFixed(3)}`);
  console.log(`prompt    ${job.resolvedPrompt}\n`);

  // Never poll forever — a stuck job should fail the test, not hang the terminal.
  const timeoutSec = Number(flag("timeout", "900"));
  const deadline = Date.now() + timeoutSec * 1000;

  let last = "";
  let stuckSince = Date.now();
  let stuckAt = -1;

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 2000));
    const poll = await fetch(`${host}/api/jobs/${job.id}`, { cache: "no-store" });
    if (!poll.ok) {
      console.error(`✗ poll failed (${poll.status})`);
      process.exit(1);
    }
    const { job: j } = await poll.json();

    const line = `[${elapsed()}] ${j.status} ${Math.round(j.progress * 100)}%`;
    if (line !== last) {
      console.log(line);
      last = line;
    }

    if (j.status === "succeeded") {
      console.log(`\n✓ done in ${elapsed()}`);
      console.log(`  ${j.outputUrl.startsWith("/") ? host + j.outputUrl : j.outputUrl}`);
      return;
    }
    if (j.status === "failed") {
      console.error(`\n✗ failed after ${elapsed()}: ${j.error}`);
      process.exit(1);
    }

    // A job that reports the same progress for two minutes is wedged, not slow.
    if (j.progress !== stuckAt) {
      stuckAt = j.progress;
      stuckSince = Date.now();
    } else if (Date.now() - stuckSince > 120_000) {
      console.error(
        `\n✗ stuck at ${Math.round(j.progress * 100)}% for 2min — job never reached a terminal state.`,
      );
      process.exit(1);
    }
  }

  console.error(`\n✗ timed out after ${timeoutSec}s`);
  process.exit(1);
}

main().catch((e) => {
  console.error(`✗ ${e.message}`);
  process.exit(1);
});
