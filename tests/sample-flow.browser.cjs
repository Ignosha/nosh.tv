// Disposable browser/API/Postgres integration fixture. Never deploy this mock Auth provider.
const fs = require("node:fs"),
  http = require("node:http"),
  assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const { randomUUID } = require("node:crypto");
const { PGlite } = require("@electric-sql/pglite");
const { createServerClient } = require("@supabase/ssr");
const { chromium } = require("playwright");
const base = "http://127.0.0.1:3198",
  provider = "http://127.0.0.1:3871";
const key = "sb_publishable_local_fixture";
(async () => {
  const db = new PGlite();
  const fixture = fs
    .readFileSync("tests/enterprise.cjs", "utf8")
    .match(/`(create role anon;[^`]+)`/s)[1];
  await db.exec(fixture);
  await db.exec(fs.readFileSync("supabase/company-setup.sql", "utf8"));
  const uid = randomUUID(),
    now = new Date().toISOString();
  await db.query("insert into auth.users values($1,$2,now())", [
    uid,
    "owner@example.invalid",
  ]);
  const org = (
    await db.query(
      "select kl_provision_organization('Fixture Company',$1) as id",
      [uid],
    )
  ).rows[0].id;
  const user = {
    id: uid,
    aud: "authenticated",
    role: "authenticated",
    email: "owner@example.invalid",
    email_confirmed_at: now,
    confirmed_at: now,
    created_at: now,
    updated_at: now,
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: {},
    identities: [],
    factors: [
      {
        id: randomUUID(),
        factor_type: "totp",
        status: "verified",
        friendly_name: "Fixture",
        created_at: now,
        updated_at: now,
      },
    ],
  };
  const claims = {
    sub: uid,
    role: "authenticated",
    aud: "authenticated",
    email: user.email,
    aal: "aal2",
    iss: provider + "/auth/v1",
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
    session_id: randomUUID(),
    amr: [{ method: "totp", timestamp: Math.floor(Date.now() / 1000) }],
  };
  const token = [
    Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString(
      "base64url",
    ),
    Buffer.from(JSON.stringify(claims)).toString("base64url"),
    Buffer.alloc(32, 1).toString("base64url"),
  ].join(".");
  const calls = [],
    errors = [];
  let queue = Promise.resolve();
  const tables = new Set([
    "kl_organizations",
    "kl_org_members",
    "kl_assurance_programs",
    "kl_assurance_history",
    "kl_action_reviews",
  ]);
  function inRole(authenticated, fn) {
    const task = queue.then(async () => {
      await db.exec("reset role");
      await db.query("select set_config('request.jwt.claims',$1,false)", [
        JSON.stringify(authenticated ? claims : {}),
      ]);
      await db.exec("set role " + (authenticated ? "authenticated" : "anon"));
      try {
        return await fn();
      } finally {
        await db.exec("reset role");
      }
    });
    queue = task.catch(() => {});
    return task;
  }
  function inAdmin(fn) {
    const task = queue.then(async () => {
      await db.exec("reset role");
      return fn();
    });
    queue = task.catch(() => {});
    return task;
  }
  const mock = http.createServer(async (req, res) => {
    const url = new URL(req.url, provider);
    const authenticated = req.headers.authorization === "Bearer " + token;
    function send(status, body) {
      res.writeHead(status, { "content-type": "application/json" });
      res.end(JSON.stringify(body));
    }
    try {
      if (url.pathname === "/auth/v1/user")
        return authenticated
          ? send(200, user)
          : send(401, { message: "Missing fixture session" });
      if (!url.pathname.startsWith("/rest/v1/"))
        return send(404, { message: "Unknown fixture path" });
      let raw = "";
      for await (const part of req) raw += part;
      const body = raw ? JSON.parse(raw) : {};
      const resource = url.pathname.slice("/rest/v1/".length);
      calls.push({ method: req.method, resource });
      const result = await inRole(authenticated, async () => {
        if (
          resource === "rpc/kl_company_save" &&
          process.env.SAMPLE_FLOW_FAILURE === "1"
        )
          throw Object.assign(new Error("Program quota reached"), {
            code: "P0001",
          });
        if (resource === "rpc/kl_company_save")
          return db.query("select * from kl_company_save($1,$2,$3,$4,$5)", [
            body.p_org,
            body.p_id,
            body.p_expected,
            JSON.stringify(body.p_workspace),
            body.p_reason,
          ]);
        if (resource === "rpc/kl_org_directory")
          return db.query("select * from kl_org_directory($1)", [body.p_org]);
        if (resource === "rpc/kl_enterprise_ready")
          return {
            rows: [
              {
                ready: (await db.query("select kl_enterprise_ready() as ready"))
                  .rows[0].ready,
              },
            ],
            scalar: true,
          };
        if (!tables.has(resource) || req.method !== "GET")
          throw Error("Unexpected fixture operation");
        const columns = url.searchParams.get("select") || "*";
        if (columns !== "*" && !/^[a-z_,]+$/.test(columns))
          throw Error("Unexpected fixture projection");
        const args = [],
          where = [];
        for (const [field, value] of url.searchParams) {
          if (["select", "order", "limit", "offset"].includes(field)) continue;
          if (!/^[a-z_]+$/.test(field) || !value.startsWith("eq."))
            throw Error("Unexpected fixture filter");
          args.push(value.slice(3));
          where.push('"' + field + '"=$' + args.length);
        }
        const condition = where.length ? " where " + where.join(" and ") : "";
        const count = req.headers.prefer?.includes("count=exact")
          ? (
              await db.query(
                "select count(*)::int as n from " + resource + condition,
                args,
              )
            ).rows[0].n
          : undefined;
        let sql = "select " + columns + " from " + resource + condition;
        const order = url.searchParams.get("order");
        if (order) {
          const [field, direction] = order.split(".");
          if (!/^[a-z_]+$/.test(field) || !["asc", "desc"].includes(direction))
            throw Error("Unexpected order");
          sql += ' order by "' + field + '" ' + direction;
        }
        if (url.searchParams.has("limit"))
          sql +=
            " limit " +
            Math.min(100, Math.max(1, Number(url.searchParams.get("limit"))));
        if (url.searchParams.has("offset"))
          sql +=
            " offset " +
            Math.min(
              10000,
              Math.max(0, Number(url.searchParams.get("offset"))),
            );
        return { ...(await db.query(sql, args)), count };
      });
      if (result.scalar) return send(200, result.rows[0].ready);
      if (result.count !== undefined)
        res.setHeader(
          "content-range",
          "0-" + Math.max(0, result.rows.length - 1) + "/" + result.count,
        );
      if (req.headers.accept?.includes("application/vnd.pgrst.object+json"))
        return send(200, result.rows[0] ?? null);
      return send(200, result.rows);
    } catch (e) {
      errors.push({ path: url.pathname, code: e.code, message: e.message });
      return send(e.code === "42501" ? 403 : 400, {
        code: e.code ?? "FIXTURE",
        message: e.message,
        details: null,
        hint: null,
      });
    }
  });
  await new Promise((resolve) => mock.listen(3871, "127.0.0.1", resolve));
  let browser,
    server,
    log = "";
  try {
    const jar = [];
    const client = createServerClient(provider, key, {
      cookieOptions: { httpOnly: true, secure: false, sameSite: "lax" },
      cookies: {
        getAll: () => jar,
        setAll: (cookies) => {
          for (const c of cookies) {
            const index = jar.findIndex((x) => x.name === c.name);
            if (index >= 0) jar.splice(index, 1);
            jar.push(c);
          }
        },
      },
    });
    const signed = await client.auth.setSession({
      access_token: token,
      refresh_token: "local-test-refresh",
    });
    assert.equal(signed.error, null);
    server = spawn(
      process.execPath,
      ["node_modules/next/dist/bin/next", "start", "-p", "3198"],
      {
        env: {
          ...process.env,
          ENTERPRISE_MODE: "1",
          APP_ORIGIN: base,
          NEXT_PUBLIC_SITE_URL: base,
          SUPABASE_URL: provider,
          SUPABASE_ANON_KEY: key,
          SUPABASE_SERVICE_ROLE_KEY: "",
          ADMIN_PASSWORD: "",
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    server.stdout.on("data", (d) => (log += d));
    server.stderr.on("data", (d) => (log += d));
    for (let i = 0; i < 80; i++) {
      try {
        if ((await fetch(base + "/api/health/live")).ok) break;
      } catch {}
      await new Promise((r) => setTimeout(r, 250));
    }
    browser = await chromium.launch({
      headless: true,
      executablePath: process.env.BROWSER_EXECUTABLE || undefined,
      args: ["--no-sandbox"],
    });
    const context = await browser.newContext({
      viewport: { width: 375, height: 812 },
      javaScriptEnabled: process.env.SAMPLE_FLOW_NO_JS !== "1",
    });
    await context.addCookies(
      jar
        .filter((c) => c.value)
        .map((c) => ({
          name: c.name,
          value: c.value,
          url: base,
          httpOnly: true,
          secure: false,
          sameSite: "Lax",
        })),
    );
    const page = await context.newPage();
    const clientErrors = [];
    page.on("pageerror", (e) => clientErrors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") clientErrors.push(m.text());
    });
    await page.goto(base + "/workspace");
    await page.getByRole("heading", { name: "Your organizations" }).waitFor();
    await page.waitForLoadState("domcontentloaded");
    const headers = await context.request.get(base + "/workspace");
    assert.equal(headers.headers()["referrer-policy"], "same-origin");
    await page.getByRole("button", { name: "Create sample program" }).click();
    if (process.env.SAMPLE_FLOW_FAILURE === "1") {
      await page.waitForURL(/sample_error=quota/, { timeout: 15000 });
      await page
        .getByRole("alert")
        .filter({ hasText: "program limit" })
        .waitFor();
      assert.equal(
        (await db.query("select count(*)::int as n from kl_assurance_programs"))
          .rows[0].n,
        0,
      );
      console.log(
        "PASS sample quota failure returns a visible error and creates no program",
      );
      return;
    }
    try {
      await page.waitForURL(/\/programs\/[0-9a-f-]+$/, { timeout: 15000 });
    } catch (e) {
      console.log(
        JSON.stringify({
          reproduction: "stalled",
          url: page.url(),
          body: (await page.locator("body").innerText()).slice(-1800),
          clientErrors,
          providerErrors: errors,
          calls,
          serverLog: log.slice(-2000),
        }),
      );
      throw e;
    }
    await page
      .getByRole("heading", { name: "First test program", exact: true })
      .waitFor();
    await page.reload();
    await page
      .getByRole("heading", { name: "First test program", exact: true })
      .waitFor();
    await page.goto(base + "/workspace");
    await page.getByRole("button", { name: "Create sample program" }).click();
    await page.waitForURL(/\/programs\/[0-9a-f-]+$/, { timeout: 15000 });
    const audit = (
      await db.query(
        "select actor_id,reason from kl_assurance_history where organization_id=$1",
        [org],
      )
    ).rows;
    assert.equal(audit.length, 1);
    assert.equal(audit[0].actor_id, uid);
    assert.equal(audit[0].reason, "Initial setup: create sample program");
    assert.equal(
      calls.filter((c) => c.resource === "rpc/kl_company_save").length,
      1,
    );
    const saved = (
      await db.query(
        "select name,revision from kl_assurance_programs where organization_id=$1",
        [org],
      )
    ).rows;
    assert.equal(saved.length, 1);
    assert.equal(saved[0].name, "First test program");
    assert.equal(saved[0].revision, 1);
    assert.equal(errors.length, 0);
    assert.ok(!clientErrors.some((e) => e.includes("Content Security Policy")));
    console.log(
      "PASS " +
        (process.env.SAMPLE_FLOW_NO_JS === "1"
          ? "native form without JavaScript"
          : "hydrated form") +
        ": real Next action, fixture Auth, Postgres save/audit, redirect, reload and existing-program reuse",
    );
    if (process.env.COMPANY_GROWTH_FLOW === "1") {
      await page.goto(base + "/workspace/" + org);
      await page
        .getByLabel("Program or matter name")
        .fill("Client portfolio playbook");
      await page
        .getByLabel("Playbook", { exact: true })
        .selectOption("crypto-matter");
      await page
        .getByRole("button", { name: "Create playbook program" })
        .click();
      await page.waitForURL(/\/programs\/[0-9a-f-]+$/, { timeout: 15000 });
      await page
        .getByRole("heading", {
          name: "Client portfolio playbook",
          exact: true,
        })
        .waitFor();
      const created = (
        await db.query(
          "select id,workspace from kl_assurance_programs where organization_id=$1 and name='Client portfolio playbook'",
          [org],
        )
      ).rows[0];
      assert.equal(created.workspace.owner, uid);
      assert.equal(created.workspace.risks.length, 3);
      assert.equal(created.workspace.actions.length, 3);
      assert.equal(created.workspace.evidence.length, 0);
      assert.equal(created.workspace.freshnessDays, 30);
      const foreignUid = randomUUID();
      const foreignOrg = await inAdmin(async () => {
        await db.query("insert into auth.users values($1,$2,now())", [
          foreignUid,
          "foreign@example.invalid",
        ]);
        return (
          await db.query(
            "select kl_provision_organization('Foreign tenant fixture',$1) as id",
            [foreignUid],
          )
        ).rows[0].id;
      });
      await inRole(true, async () => {
        await db.query("select set_config('request.jwt.claims',$1,false)", [
          JSON.stringify({ ...claims, sub: foreignUid }),
        ]);
        await db.query("select * from kl_company_save($1,null,0,$2,$3)", [
          foreignOrg,
          JSON.stringify({
            format: "TraceSworn Assurance v1",
            name: "Foreign tenant private program",
            owner: foreignUid,
            freshnessDays: 90,
            evidence: [],
            risks: [],
            actions: [],
          }),
          "Foreign fixture setup",
        ]);
      });
      const portfolioUrl = base + "/workspace/" + org + "/portfolio";
      await page.goto(portfolioUrl);
      await page
        .getByRole("heading", { name: "Portfolio command center" })
        .waitFor();
      assert.ok(
        (await page.locator("body").innerText()).includes("2 of 2 programs"),
      );
      assert.equal(
        await page.getByText("Foreign tenant private program").count(),
        0,
      );
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > window.innerWidth,
        ),
        false,
      );
      if (process.env.SAMPLE_FLOW_NO_JS !== "1") {
        await page.getByLabel("Exception type").selectOption("assessment");
        await page
          .getByRole("status")
          .filter({ hasText: "3 matching exceptions" })
          .waitFor();
        await page.getByLabel("Find work").fill("wallet");
        await page
          .getByRole("status")
          .filter({ hasText: "1 matching exceptions" })
          .waitFor();
        await page.getByLabel("Find work").fill("");
        await page.screenshot({
          path: "/tmp/nosh-growth-portfolio.png",
          fullPage: true,
        });
      }
      const exported = await context.request.get(
        portfolioUrl + "/export?format=json",
      );
      assert.equal(exported.status(), 200);
      assert.ok(exported.headers()["cache-control"].includes("no-store"));
      const brief = await exported.json();
      assert.equal(brief.record.scope.totalPrograms, 2);
      assert.equal(brief.record.programs.length, 2);
      assert.ok(
        !JSON.stringify(brief).includes("Foreign tenant private program"),
      );
      const canonical = (v) =>
        v === null || typeof v !== "object"
          ? JSON.stringify(v)
          : Array.isArray(v)
            ? "[" + v.map(canonical).join(",") + "]"
            : "{" +
              Object.keys(v)
                .sort()
                .map((k) => JSON.stringify(k) + ":" + canonical(v[k]))
                .join(",") +
              "}";
      assert.equal(
        brief.fingerprint.value,
        require("node:crypto")
          .createHash("sha256")
          .update(canonical(brief.record))
          .digest("hex"),
      );
      const csv = await context.request.get(
        portfolioUrl + "/export?format=csv",
      );
      assert.equal(csv.status(), 200);
      assert.ok((await csv.text()).includes("Client portfolio playbook"));
      const denied = await context.request.get(
        base + "/workspace/" + foreignOrg + "/portfolio/export?format=json",
      );
      assert.ok(denied.status() >= 400);
      assert.ok(
        !(await denied.text()).includes("Foreign tenant private program"),
      );
      await page.goto(portfolioUrl + "/brief");
      await page
        .getByRole("heading", { name: "Saved revision register" })
        .waitFor();
      await page.getByRole("button", { name: "Print / save as PDF" }).waitFor();
      await inAdmin(() =>
        db.query("update kl_organizations set max_programs=25 where id=$1", [
          org,
        ]),
      );
      await inRole(true, async () => {
        for (let index = 0; index < 19; index++) {
          await db.query("select * from kl_company_save($1,null,0,$2,$3)", [
            org,
            JSON.stringify({
              format: "TraceSworn Assurance v1",
              name: "Pagination fixture " + index,
              owner: uid,
              freshnessDays: 90,
              evidence: [],
              risks: [],
              actions: [],
            }),
            "Pagination fixture setup",
          ]);
        }
      });
      await page.goto(portfolioUrl + "?page=2");
      await page
        .getByRole("heading", { name: "Portfolio command center" })
        .waitFor();
      assert.ok(
        (await page.locator("body").innerText()).includes("1 of 21 programs"),
      );
      const secondPage = await context.request.get(
        portfolioUrl + "/export?format=json&page=2",
      );
      assert.equal(secondPage.status(), 200);
      const secondBrief = await secondPage.json();
      assert.equal(secondBrief.record.scope.totalPrograms, 21);
      assert.equal(secondBrief.record.scope.includedPrograms, 1);
      assert.equal(secondBrief.record.scope.page, 2);
      assert.equal(
        (
          await context.request.get(portfolioUrl + "/export?format=json&page=3")
        ).status(),
        404,
      );
      await inAdmin(() =>
        db.query("update kl_organizations set max_programs=21 where id=$1", [
          org,
        ]),
      );
      await page.goto(base + "/workspace/" + org);
      await page
        .getByLabel("Program or matter name")
        .fill("Quota must not create");
      await page
        .getByRole("button", { name: "Create playbook program" })
        .click();
      await page.waitForURL(/playbook_error=quota/);
      await page
        .getByRole("alert")
        .filter({ hasText: "program or audit capacity" })
        .waitFor();
      assert.equal(
        (
          await db.query(
            "select count(*)::int as n from kl_assurance_programs where organization_id=$1",
            [org],
          )
        ).rows[0].n,
        21,
      );
      await inAdmin(() =>
        db.query(
          "update kl_organizations set access_until=now()-interval '1 day' where id=$1",
          [org],
        ),
      );
      assert.equal(
        (
          await context.request.get(portfolioUrl + "/export?format=json")
        ).status(),
        200,
        "Expired companies retain authorized exports",
      );
      const proposalUrl = base + "/plans/proposal";
      const crafted = await context.request.post(proposalUrl, {
        headers: { origin: base },
        form: {
          company: "Fixture buyer",
          seats: "11",
          programs: "5",
          monthlyUsd: "0",
          plan: "company",
        },
      });
      assert.equal(crafted.status(), 200);
      assert.equal(
        (await crafted.json()).record.proposedPlan.monthlyUsd,
        3499,
        "Client prices and plan IDs are not trusted",
      );
      assert.equal(
        (
          await context.request.post(proposalUrl, {
            headers: { origin: "https://attacker.invalid" },
            form: { seats: "10", programs: "5" },
          })
        ).status(),
        403,
      );
      assert.equal(
        (
          await context.request.post(proposalUrl, {
            headers: { origin: base },
            form: { company: "x".repeat(9000), seats: "10", programs: "5" },
          })
        ).status(),
        413,
      );
      assert.equal(
        (
          await context.request.post(proposalUrl, {
            headers: { origin: base },
            form: { seats: "-1", programs: "5" },
          })
        ).status(),
        400,
      );
      await page.goto(base + "/plans");
      await page
        .locator(".masthead")
        .getByRole("link", { name: "Workspace", exact: true })
        .waitFor();
      assert.equal(
        (await context.request.get(base + "/plans")).headers()[
          "referrer-policy"
        ],
        "same-origin",
      );
      await page.getByLabel("Active team seats").fill("11");
      if (process.env.SAMPLE_FLOW_NO_JS !== "1") {
        await page
          .getByText("Suggested scope: Portfolio", { exact: false })
          .waitFor();
        await page
          .getByText("Estimate the value using your own assumptions", {
            exact: true,
          })
          .click();
        await page.getByLabel("Hours per program per month").fill("1");
        await page.getByLabel("Labor cost per hour (USD)").fill("10");
        await page.getByLabel("Assumed time reduction (%)").fill("10");
        assert.ok(
          (await page.locator(".company-roi").innerText()).includes("-$3,494"),
        );
        const downloadPromise = page.waitForEvent("download");
        await page
          .getByRole("button", { name: "Download scoped proposal" })
          .click();
        const download = await downloadPromise;
        const proposal = JSON.parse(
          fs.readFileSync(await download.path(), "utf8"),
        );
        assert.equal(proposal.record.proposedPlan.id, "portfolio");
        assert.ok(proposal.record.estimate.monthlyNetBenefitUsd < 0);
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth > window.innerWidth,
          ),
          false,
        );
        await page.screenshot({
          path: "/tmp/nosh-growth-plans.png",
          fullPage: true,
        });
      } else {
        const downloadPromise = page.waitForEvent("download");
        await page
          .getByRole("button", { name: "Download scoped proposal" })
          .click();
        const download = await downloadPromise;
        const proposal = JSON.parse(
          fs.readFileSync(await download.path(), "utf8"),
        );
        assert.equal(proposal.record.proposedPlan.id, "portfolio");
        assert.equal(proposal.record.proposedPlan.monthlyUsd, 3499);
      }
      console.log(
        "PASS company growth: audited playbook save, portfolio scope, foreign-tenant export denial, sealed brief, CSV, print, quota, expired exports and proposal math",
      );
    }
  } finally {
    await browser?.close();
    server?.kill("SIGTERM");
    await new Promise((r) => mock.close(r));
    await db.close();
  }
})().catch((e) => {
  console.error("Fixture flow failed:", e.message);
  process.exit(1);
});
