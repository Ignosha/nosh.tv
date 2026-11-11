import test from "node:test";
import assert from "node:assert/strict";
import { Miniflare } from "miniflare";

test("scheduled monitoring runs in the Workers runtime with real KV", async () => {
  const requests = [];
  let redirect = false;
  const mf = new Miniflare({
    modules: true,
    scriptPath: "ops/monitor.mjs",
    // The published local workerd binary supports dates through 2026-08-06.
    // The hosted Worker retains its current 2026-11-11 date and is checked separately.
    compatibilityDate: "2026-08-06",
    bindings: { SUPABASE_PUBLIC_KEY: "runtime-public-fixture-key" },
    kvNamespaces: ["MONITOR_STATE"],
    cf: false,
    outboundService: async request => {
      requests.push(request.url);
      if (request.url.startsWith("https://tracesworn.com")) {
        assert.equal(request.headers.get("apikey"), null);
        return new Response("<!doctype html><title>Fixture</title>");
      }
      assert.equal(request.headers.get("apikey"), "runtime-public-fixture-key");
      if (redirect && request.url.includes("kl_enterprise_ready")) return Response.redirect("https://attacker.invalid/", 302);
      if (request.url.includes("kl_organizations")) return new Response(null, { status: 401 });
      if (request.url.includes("settings")) return Response.json({ disable_signup: true });
      return Response.json(true);
    },
  });
  try {
    const worker = await mf.getWorker();
    await worker.scheduled({ scheduledTime: Date.now(), cron: "*/5 * * * *" });
    const state = await mf.getKVNamespace("MONITOR_STATE");
    const result = await state.get("latest", "json");
    assert.equal(result.status, "healthy", JSON.stringify(result.checks));
    assert.equal(requests.length, 4);
    redirect = true;
    await worker.scheduled({ scheduledTime: Date.now() + 300000, cron: "*/5 * * * *" });
    const redirected = await state.get("latest", "json");
    assert.equal(redirected.status, "degraded");
    assert.equal(redirected.checks.find(check => check.name === "staging_database_ready").httpStatus, 302);
    assert.equal(requests.length, 8, "Redirects must not be followed");
    assert.equal(requests.some(url => url.includes("attacker.invalid")), false);
    assert.equal((await worker.fetch("https://example.invalid/")).status, 404);
  } finally { await mf.dispose(); }
});
