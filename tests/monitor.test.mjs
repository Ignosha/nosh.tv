import test from "node:test";
import assert from "node:assert/strict";
import worker, { probe, runMonitor } from "../ops/monitor.mjs";

function harness(notify = false) {
  const storage = new Map(),
    requests = [],
    emails = [];
  const state = {
    broken: false,
    rejectMail: false,
    oversized: false,
    anonymousExposed: false,
  };
  const env = {
    SUPABASE_PUBLIC_KEY: "public-test-key",
    MONITOR_STATE: {
      async get(key) {
        return storage.has(key) ? JSON.parse(storage.get(key)) : null;
      },
      async put(key, value, options) {
        storage.set(key, value);
        if (key.startsWith("history:"))
          assert.equal(options.expirationTtl, 604800);
      },
    },
    ...(notify
      ? {
          RESEND_API_KEY: "test-send-only-key",
          ALERT_TO: "fixture@example.invalid",
        }
      : {}),
  };
  async function request(url, options) {
    requests.push({ url, options });
    if (url === "https://api.resend.com/emails") {
      assert.equal(options.redirect, "manual");
      emails.push(JSON.parse(options.body));
      if (state.rejectMail) throw Error("Synthetic network failure");
      return Response.json({ id: "00000000-0000-4000-8000-000000000001" });
    }
    assert.equal(options.redirect, "manual");
    assert.equal(options.cache, "no-store");
    if (url.startsWith("https://tracesworn.com/")) {
      assert.equal(
        options.headers.apikey,
        undefined,
        "Public database key must not reach the website",
      );
      return new Response("<!doctype html><title>Fixture website</title>", {
        headers: { "content-type": "text/html" },
      });
    }
    assert.ok(url.startsWith("https://bowpuebiycqbodkpwdcb.supabase.co/"));
    assert.equal(options.headers.apikey, "public-test-key");
    if (url.includes("kl_organizations"))
      return state.anonymousExposed
        ? Response.json([])
        : new Response(null, { status: 401 });
    if (url.includes("settings"))
      return Response.json({ disable_signup: true });
    if (state.broken) return new Response(null, { status: 503 });
    if (state.oversized) return new Response(" ".repeat(40000) + "true");
    return Response.json(true);
  }
  return { env, request, storage, emails, requests, state };
}
const base = Date.parse("2026-11-11T01:00:00Z");

test("fixed-target probes check readiness, closed signup, anonymous denial and website reachability", async () => {
  const h = harness();
  const result = await runMonitor(h.env, h.request, base);
  assert.equal(result.status, "healthy");
  assert.equal(result.checks.length, 4);
  assert.equal(result.notification, "unconfigured");
  assert.equal(h.requests.length, 4);
  assert.equal(h.storage.size, 2);
  assert.equal(h.emails.length, 0);
  assert.equal(JSON.stringify(result).includes("public-test-key"), false);
});

test("two failures open incident; hourly reminders and recovery retries are bounded", async () => {
  const h = harness(true);
  h.state.broken = true;
  await runMonitor(h.env, h.request, base);
  assert.equal(h.emails.length, 0);
  const incident = await runMonitor(h.env, h.request, base + 300000);
  assert.equal(incident.incident, true);
  assert.equal(incident.notification, "accepted_by_provider");
  assert.equal(h.emails.length, 1);
  await runMonitor(h.env, h.request, base + 600000);
  assert.equal(h.emails.length, 1);
  await runMonitor(h.env, h.request, base + 3900000);
  assert.equal(h.emails.length, 2);
  h.state.broken = false;
  h.state.rejectMail = true;
  const failedRecovery = await runMonitor(h.env, h.request, base + 4200000);
  assert.equal(failedRecovery.notification, "failed");
  assert.equal(failedRecovery.alertedIncident, true);
  h.state.rejectMail = false;
  const recovery = await runMonitor(h.env, h.request, base + 4500000);
  assert.equal(recovery.notification, "accepted_by_provider");
  assert.equal(recovery.alertedIncident, false);
  await runMonitor(h.env, h.request, base + 4800000);
  assert.equal(h.emails.length, 4);
  assert.match(h.emails.at(-1).subject, /recovered/);
  assert.equal(JSON.stringify(recovery).includes("test-send-only-key"), false);
  assert.equal(
    JSON.stringify(recovery).includes("fixture@example.invalid"),
    false,
  );
});

test("bounded bodies and missing anonymous denial fail closed", async () => {
  const h = harness();
  h.state.oversized = true;
  h.state.anonymousExposed = true;
  const checks = await probe(h.env, h.request);
  assert.equal(
    checks.find((x) => x.name === "staging_database_ready").ok,
    false,
  );
  assert.equal(
    checks.find((x) => x.name === "staging_anonymous_company_denied").ok,
    false,
  );
});

test("old checker failures do not become a new incident", async () => {
  const h = harness(true);
  h.storage.set(
    "latest",
    JSON.stringify({
      failureStreak: 181,
      incident: true,
      alertedIncident: true,
    }),
  );
  h.state.broken = true;
  const result = await runMonitor(h.env, h.request, base);
  assert.equal(result.version, 2);
  assert.equal(result.failureStreak, 1);
  assert.equal(result.incident, false);
  assert.equal(h.emails.length, 0);
});

test("missing configuration makes no requests and HTTP handler exposes no state", async () => {
  let calls = 0;
  await assert.rejects(
    probe({}, () => {
      calls++;
    }),
    /configuration/,
  );
  assert.equal(calls, 0);
  const result = await worker.fetch(new Request("https://example.invalid/"));
  assert.equal(result.status, 404);
  assert.equal(result.headers.get("cache-control"), "no-store");
});

test("private delivery checks retry one idempotent fixed message and ignore expired or malformed requests", async () => {
  const h = harness(true),
    id = "00000000-0000-4000-8000-000000000002";
  h.storage.set(
    "delivery-test",
    JSON.stringify({
      id,
      requestedAt: new Date(base).toISOString(),
      to: "attacker@example.invalid",
      text: "Untrusted replacement",
    }),
  );
  h.state.rejectMail = true;
  assert.equal(
    (await runMonitor(h.env, h.request, base)).deliveryTest.status,
    "failed",
  );
  h.state.rejectMail = false;
  const result = await runMonitor(h.env, h.request, base + 300000);
  assert.equal(result.deliveryTest.status, "accepted_by_provider");
  assert.equal(
    result.deliveryTest.providerMessageId,
    "00000000-0000-4000-8000-000000000001",
  );
  assert.deepEqual(h.emails[0].to, ["fixture@example.invalid"]);
  assert.ok(!h.emails[0].text.includes("Untrusted replacement"));
  const keys = h.requests
    .filter((r) => r.url === "https://api.resend.com/emails")
    .map((r) => r.options.headers["Idempotency-Key"]);
  assert.equal(keys[0], keys[1]);
  await runMonitor(h.env, h.request, base + 600000);
  assert.equal(h.emails.length, 2, "Accepted delivery check is not sent again");
  h.storage.set(
    "delivery-test",
    JSON.stringify({
      id: "00000000-0000-4000-8000-000000000003",
      requestedAt: new Date(base).toISOString(),
    }),
  );
  await runMonitor(h.env, h.request, base + 3900000);
  h.storage.set(
    "delivery-test",
    JSON.stringify({
      id: "invalid",
      requestedAt: new Date(base + 4000000).toISOString(),
    }),
  );
  await runMonitor(h.env, h.request, base + 4000000);
  assert.equal(h.emails.length, 2);
  assert.ok(!JSON.stringify(result).includes("fixture@example.invalid"));
});
