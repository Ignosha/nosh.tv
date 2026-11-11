// Read-only monitoring; no public administration surface or customer records.
const database = "https://bowpuebiycqbodkpwdcb.supabase.co";
async function smallJson(response) {
  const reader = response.body?.getReader();
  if (!reader) throw Error("Empty response");
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 32768) throw Error("Oversized response");
      chunks.push(value);
    }
  } finally { await reader.cancel(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return JSON.parse(new TextDecoder().decode(bytes));
}

export async function probe(env, request = fetch) {
  if (!env.SUPABASE_PUBLIC_KEY) throw Error("Monitor configuration missing");
  const jobs = [
    { name: "staging_database_ready", url: database + "/rest/v1/rpc/kl_enterprise_ready", method: "POST", body: "{}", validate: value => value === true },
    { name: "staging_signup_closed", url: database + "/auth/v1/settings", validate: value => value.disable_signup === true },
    { name: "staging_anonymous_company_denied", url: database + "/rest/v1/kl_organizations?select=id&limit=1", denied: true },
    { name: "production_process_live", url: "https://tracesworn.com/api/health/live", validate: value => value.status === "alive", production: true },
  ];
  return Promise.all(jobs.map(async job => {
    const start = Date.now();
    try {
      const response = await request(job.url, {
        method: job.method || "GET", body: job.body, redirect: "error", cache: "no-store", signal: AbortSignal.timeout(10000),
        headers: job.production ? { accept: "application/json" } : { apikey: env.SUPABASE_PUBLIC_KEY, "content-type": "application/json" },
      });
      let ok;
      if (job.denied) { ok = [401, 403].includes(response.status); await response.body?.cancel(); }
      else if (response.ok) ok = job.validate(await smallJson(response));
      else { ok = false; await response.body?.cancel(); }
      return { name: job.name, ok, httpStatus: response.status, milliseconds: Date.now() - start };
    } catch { return { name: job.name, ok: false, httpStatus: null, milliseconds: Date.now() - start }; }
  }));
}

export async function runMonitor(env, request = fetch, now = Date.now()) {
  const checks = await probe(env, request);
  const previous = await env.MONITOR_STATE.get("latest", "json");
  const failures = checks.filter(check => !check.ok).map(check => check.name);
  const streak = failures.length ? (previous?.failureStreak || 0) + 1 : 0;
  const status = failures.length ? "degraded" : "healthy";
  const incident = streak >= 2;
  const incidentSince = failures.length ? previous?.incidentSince || Math.floor(now / 300000) : previous?.incidentSince || 0;
  let alertedIncident = previous?.alertedIncident || false;
  let lastAlertAt = previous?.lastAlertAt || 0;
  const recovered = status === "healthy" && alertedIncident;
  const channelReady = Boolean(env.RESEND_API_KEY && env.ALERT_TO);
  // Two failed probes open an incident. Reminders at most hourly; retry failed delivery.
  const shouldNotify = channelReady && ((incident && (!alertedIncident || now - lastAlertAt >= 3600000)) || recovered);
  let delivery = channelReady ? "idle" : "unconfigured";
  if (shouldNotify) {
    try {
      const kind = recovered ? "recovered" : "incident";
      const response = await request("https://api.resend.com/emails", { method: "POST", signal: AbortSignal.timeout(10000),
        headers: { Authorization: "Bearer " + env.RESEND_API_KEY, "content-type": "application/json", "Idempotency-Key": `tracesworn-monitor-${kind}-${incidentSince}-${Math.floor(now / 3600000)}` },
        body: JSON.stringify({ from: "TraceSworn monitoring <monitoring@mail.noshashi.app>", to: [env.ALERT_TO], subject: "TraceSworn monitor: " + kind,
          text: recovered ? "The monitored checks are healthy again. Review monitoring history and confirm service recovery."
            : "Repeated monitoring failure: " + failures.join(", ") + ". Review the provider dashboards. These probes do not test customer workflows or certify uptime." }),
      });
      delivery = response.ok ? "accepted_by_provider" : "failed";
      await response.body?.cancel();
      if (response.ok) { lastAlertAt = now; alertedIncident = !recovered; }
    } catch { delivery = "failed"; }
  }
  const snapshot = { at: new Date(now).toISOString(), status, checks, failureStreak: streak,
    incident, incidentSince: status === "healthy" && !alertedIncident ? 0 : incidentSince,
    alertedIncident, lastAlertAt, notification: delivery };
  await env.MONITOR_STATE.put("latest", JSON.stringify(snapshot));
  await env.MONITOR_STATE.put("history:" + Math.floor(now / 300000), JSON.stringify(snapshot), { expirationTtl: 604800 });
  console.log(JSON.stringify({ event: "monitor_check", ...snapshot }));
  return snapshot;
}

export default {
  async fetch() { return new Response("Not found", { status: 404, headers: { "cache-control": "no-store" } }); },
  async scheduled(controller, env) {
    try { await runMonitor(env, fetch, controller.scheduledTime); }
    catch { console.error(JSON.stringify({ event: "monitor_execution_failed" })); throw Error("Monitoring execution failed"); }
  },
};
