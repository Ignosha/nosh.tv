const { spawn } = require("node:child_process");
const assert = require("node:assert/strict");
const { chromium } = require("playwright");
(async () => {
  const port = 3199,
    base = `http://127.0.0.1:${port}`;
  const server = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "start", "-p", String(port)],
    {
      env: {
        ...process.env,
        ENTERPRISE_MODE: "1",
        APP_ORIGIN: "",
        SUPABASE_URL: "",
        SUPABASE_ANON_KEY: "",
        SUPABASE_SERVICE_ROLE_KEY: "",
        ADMIN_PASSWORD: "disabled-legacy-test",
      },
      stdio: ["ignore", "ignore", "pipe"],
    },
  );
  let log = "";
  server.stderr.on("data", (data) => {
    log += String(data).slice(0, 2000);
  });
  let browser;
  try {
    let ready = false;
    for (let i = 0; i < 60; i++) {
      try {
        if ((await fetch(base + "/api/health/live")).ok) {
          ready = true;
          break;
        }
      } catch {}
      await new Promise((r) => setTimeout(r, 250));
    }
    assert.ok(ready, "Test server failed to start: " + log);
    for (const path of [
      "/admin",
      "/admin/assurance",
      "/case/00000000-0000-0000-0000-000000000000",
      "/firm/00000000-0000-0000-0000-000000000000",
      "/api/cron/prepare",
    ]) {
      const r = await fetch(base + path, {
        headers: {
          Authorization:
            "Basic " +
            Buffer.from("admin:disabled-legacy-test").toString("base64"),
        },
      });
      assert.equal(
        r.status,
        404,
        path + " must be disabled in enterprise mode",
      );
    }
    assert.equal((await fetch(base + "/workspace")).status, 503);
    const health = await fetch(base + "/api/health/ready");
    assert.equal(health.status, 503);
    assert.deepEqual(await health.json(), { status: "not_ready" });
    const auth = await fetch(base + "/auth/sign-in");
    assert.equal(auth.status, 200);
    assert.ok(
      auth.headers.get("content-security-policy").includes("'strict-dynamic'"),
    );
    assert.ok(auth.headers.get("cache-control").includes("no-store"));
    browser = await chromium.launch({
      headless: true,
      executablePath: process.env.BROWSER_EXECUTABLE || undefined,
      args: ["--no-sandbox"],
    });
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error" && m.text().includes("Content Security Policy"))
        errors.push(m.text());
    });
    await page.goto(base + "/auth/sign-in");
    await page.getByRole("heading", { name: "Company sign in" }).waitFor();
    assert.deepEqual(errors, []);
    assert.ok(
      (await page.locator("script[nonce]").count()) > 0,
      "Framework scripts require CSP nonces",
    );
    console.log(
      "PASS enterprise mode disables legacy access, missing identity fails closed, health is redacted/not ready, and nonce CSP boots the sign-in page.",
    );
  } finally {
    await browser?.close();
    server.kill("SIGTERM");
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
