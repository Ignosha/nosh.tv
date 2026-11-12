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
    outboundService: async (request) => {
      requests.push(request.url);
      if (request.url.startsWith("https://tracesworn.com")) {
        assert.equal(request.headers.get("apikey"), null);
        return new Response("<!doctype html><title>Fixture</title>");
      }
      assert.equal(request.headers.get("apikey"), "runtime-public-fixture-key");
      if (redirect && request.url.includes("kl_enterprise_ready"))
        return Response.redirect("https://attacker.invalid/", 302);
      if (request.url.includes("kl_organizations"))
        return new Response(null, { status: 401 });
      if (request.url.includes("settings"))
        return Response.json({ disable_signup: true });
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
    await worker.scheduled({
      scheduledTime: Date.now() + 300000,
      cron: "*/5 * * * *",
    });
    const redirected = await state.get("latest", "json");
    assert.equal(redirected.status, "degraded");
    assert.equal(
      redirected.checks.find((check) => check.name === "staging_database_ready")
        .httpStatus,
      302,
    );
    assert.equal(requests.length, 8, "Redirects must not be followed");
    assert.equal(
      requests.some((url) => url.includes("attacker.invalid")),
      false,
    );
    assert.equal((await worker.fetch("https://example.invalid/")).status, 404);
  } finally {
    await mf.dispose();
  }
});

test("private delivery request uses the Workers secret binding and sends exactly once", async () => {
  const sent = [];
  const mf = new Miniflare({
    modules: true,
    scriptPath: "ops/monitor.mjs",
    compatibilityDate: "2026-08-06",
    cf: false,
    bindings: {
      SUPABASE_PUBLIC_KEY: "runtime-public-fixture-key",
      RESEND_API_KEY: "runtime-send-only-fixture",
      ALERT_TO: "fixture@example.invalid",
    },
    kvNamespaces: ["MONITOR_STATE"],
    outboundService: async (request) => {
      if (request.url === "https://api.resend.com/emails") {
        assert.equal(
          request.headers.get("authorization"),
          "Bearer runtime-send-only-fixture",
        );
        assert.equal(request.headers.get("apikey"), null);
        sent.push({
          key: request.headers.get("idempotency-key"),
          message: await request.json(),
        });
        return Response.json({ id: "00000000-0000-4000-8000-000000000001" });
      }
      assert.equal(request.headers.get("authorization"), null);
      if (request.url.includes("kl_organizations"))
        return new Response(null, { status: 401 });
      if (request.url.includes("settings"))
        return Response.json({ disable_signup: true });
      if (request.url.startsWith("https://tracesworn.com"))
        return new Response("Fixture");
      return Response.json(true);
    },
  });
  try {
    const state = await mf.getKVNamespace("MONITOR_STATE"),
      worker = await mf.getWorker(),
      now = Date.now();
    const id = "00000000-0000-4000-8000-000000000002";
    await state.put(
      "delivery-test",
      JSON.stringify({ id, requestedAt: new Date(now).toISOString() }),
    );
    await worker.scheduled({ scheduledTime: now, cron: "*/5 * * * *" });
    const result = await state.get("latest", "json");
    assert.equal(result.deliveryTest.status, "accepted_by_provider");
    assert.deepEqual(sent[0].message.to, ["fixture@example.invalid"]);
    assert.equal(sent[0].key, "tracesworn-monitor-test-" + id);
    await worker.scheduled({
      scheduledTime: now + 300000,
      cron: "*/5 * * * *",
    });
    assert.equal(sent.length, 1);
    assert.ok(!JSON.stringify(result).includes("runtime-send-only-fixture"));
    assert.ok(!JSON.stringify(result).includes("fixture@example.invalid"));
  } finally {
    await mf.dispose();
  }
});
