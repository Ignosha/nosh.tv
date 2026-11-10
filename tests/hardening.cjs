const test = require("node:test"),
  assert = require("node:assert/strict"),
  ts = require("typescript"),
  vm = require("node:vm"),
  fs = require("node:fs");
function load(file, deps = {}, env = {}) {
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    {
      exports,
      require: (name) => deps[name],
      process: { env },
      URL,
      Buffer,
      Error,
      Date,
      AbortSignal,
      fetch,
      TextEncoder,
      console,
    },
  );
  return exports;
}
const valid = {
  APP_ORIGIN: "https://app.example.com",
  SUPABASE_URL: "https://project.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_test",
  ENTERPRISE_MODE: "1",
};
test("Auth redirects stay in the company workspace and public keys cannot become service credentials", () => {
  const env = { ...valid };
  const c = load("src/lib/enterprise/config.ts", {}, env);
  for (const value of [
    "https://evil.example",
    "//evil.example",
    "/admin",
    "/workspace\\evil",
    "/workspace\r\nevil",
  ])
    assert.equal(c.safeNext(value), "/workspace");
  assert.equal(c.safeNext("/workspace/company"), "/workspace/company");
  assert.equal(c.secureCookies(), true);
  env.SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_ANON_KEY;
  assert.throws(() => c.authConfig(), /public Supabase key/);
  delete env.SUPABASE_SERVICE_ROLE_KEY;
  env.SUPABASE_ANON_KEY = "sb_secret_bad";
  assert.throws(() => c.authConfig(), /public Supabase key/);
});
test("Release readiness rejects HTTP, privileged web credentials and disabled enterprise mode", () => {
  const cfg = load("src/lib/enterprise/config.ts", {}, valid);
  const { configurationProblems } = load(
    "src/lib/enterprise/readiness.ts",
    { "./config": cfg },
    valid,
  );
  assert.equal(configurationProblems(valid).length, 0);
  assert.ok(
    configurationProblems({ ...valid, APP_ORIGIN: "http://example.com" })
      .length,
  );
  assert.ok(
    configurationProblems({ ...valid, SUPABASE_SERVICE_ROLE_KEY: "secret" })
      .length,
  );
  assert.ok(configurationProblems({ ...valid, ENTERPRISE_MODE: "0" }).length);
});
test("Company mutations reject missing or cross-origin requests", async () => {
  let origin = null;
  const cfg = load("src/lib/enterprise/config.ts", {}, valid);
  const { requireMutationOrigin } = load(
    "src/lib/enterprise/origin.ts",
    {
      "./config": cfg,
      "next/headers": { headers: async () => ({ get: () => origin }) },
    },
    valid,
  );
  await assert.rejects(() => requireMutationOrigin(), /origin denied/);
  origin = "https://evil.example";
  await assert.rejects(() => requireMutationOrigin(), /origin denied/);
  origin = valid.APP_ORIGIN;
  await requireMutationOrigin();
});
test("Enterprise mode disables shared administrator actions even with a correct legacy password", async () => {
  const { requireAdmin } = load(
    "src/lib/adminAuth.ts",
    {
      "next/headers": {
        headers: async () => ({
          get: () => "Basic " + Buffer.from("admin:test").toString("base64"),
        }),
      },
      "node:crypto": require("node:crypto"),
    },
    { ENTERPRISE_MODE: "1", ADMIN_PASSWORD: "test" },
  );
  await assert.rejects(() => requireAdmin(), /disabled/);
});
test("Company sessions verify provider identity, require confirmed email and current MFA, and use HttpOnly cookies", async () => {
  let user = {
      id: "user-1",
      email: "user@example.com",
      email_confirmed_at: "2026-01-01",
    },
    level = "aal1",
    verifiedCalls = 0,
    cookieOptions;
  const cookieWrites = [];
  const client = {
    auth: {
      getUser: async () => {
        verifiedCalls++;
        return { data: { user }, error: null };
      },
      mfa: {
        getAuthenticatorAssuranceLevel: async () => ({
          data: { currentLevel: level },
          error: null,
        }),
      },
    },
  };
  const session = load(
    "src/lib/enterprise/session.ts",
    {
      "@supabase/ssr": {
        createServerClient: (_url, _key, opts) => {
          cookieOptions = opts;
          return client;
        },
      },
      "next/headers": {
        cookies: async () => ({
          getAll: () => [],
          set: (...v) => cookieWrites.push(v),
        }),
      },
      "next/navigation": {
        redirect: (path) => {
          throw new Error("REDIRECT " + path);
        },
      },
      react: { cache: (fn) => fn },
      "./config": {
        authConfig: () => ({
          url: valid.SUPABASE_URL,
          key: valid.SUPABASE_ANON_KEY,
        }),
        secureCookies: () => true,
      },
    },
    valid,
  );
  await assert.rejects(() => session.requireMfa(), /REDIRECT \/auth\/mfa/);
  level = "aal2";
  assert.equal((await session.requireMfa()).user.id, "user-1");
  assert.ok(verifiedCalls >= 2);
  assert.equal(cookieOptions.cookieOptions.httpOnly, true);
  cookieOptions.cookies.setAll([
    {
      name: "session",
      value: "test",
      options: { httpOnly: false, secure: false },
    },
  ]);
  assert.equal(cookieWrites[0][2].httpOnly, true);
  assert.equal(cookieWrites[0][2].secure, true);
  user = { ...user, email_confirmed_at: null };
  await assert.rejects(
    () => session.requireSession(),
    /REDIRECT \/auth\/sign-in/,
  );
});
