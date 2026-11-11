const test = require("node:test"),
  assert = require("node:assert/strict"),
  ts = require("typescript"),
  fs = require("node:fs"),
  vm = require("node:vm");
function load(file, dependencies = {}) {
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
      require: (name) => dependencies[name],
      Date,
      Map,
      Set,
      URL,
      Number,
      String,
      Math,
      Object,
      JSON,
      TextEncoder,
      Error,
      FormData,
      console,
      process,
    },
  );
  return exports;
}
const assurance = load("src/lib/assurance.ts");
const model = load("src/lib/companyPortfolio.ts", { "./assurance": assurance });
const pricing = load("src/lib/softwarePlans.ts");
const uid = "11111111-1111-4111-8111-111111111111",
  org = "22222222-2222-4222-8222-222222222222";
const member = { id: uid, label: "owner@example.invalid", active: true };
function workspace() {
  return assurance.applyPolicyPack(
    { ...assurance.newAssurance(), name: "Matter screening", owner: uid },
    "crypto-matter",
    "2026-10-01",
  );
}
function row(w = workspace(), id = "33333333-3333-4333-8333-333333333333") {
  return { id, workspace: w, revision: 2, updated_at: "2026-11-10T12:00:00Z" };
}

test("all five playbooks create linked, owned work with no invented evidence or approval", () => {
  assert.equal(assurance.POLICY_PACKS.length, 5);
  for (const pack of assurance.POLICY_PACKS) {
    const w = assurance.applyPolicyPack(
      { ...assurance.newAssurance(), name: pack.name, owner: uid },
      pack.id,
      "2026-11-11",
    );
    assert.equal(w.evidence.length, 0);
    assert.equal(w.risks.length, 3);
    assert.equal(w.actions.length, 3);
    assert.ok(
      w.risks.every(
        (risk) =>
          !risk.assessed &&
          risk.controlEffectiveness === 0 &&
          risk.owner === uid,
      ),
    );
    assert.ok(
      w.actions.every(
        (action) =>
          action.status === "open" &&
          action.owner === uid &&
          !action.completedAt,
      ),
    );
    assert.equal(w.actions[1].dependsOn[0], w.actions[0].id);
    assert.ok(w.actions[1].recurrenceDays > 0);
    assert.equal(w.freshnessDays, pack.freshnessDays);
  }
  const strict = assurance.applyPolicyPack(
    {
      ...assurance.newAssurance(),
      name: "Strict source policy",
      owner: uid,
      freshnessDays: 7,
    },
    "vendor-oversight",
    "2026-11-11",
  );
  assert.equal(strict.freshnessDays, 7);
});

test("portfolio prioritizes overdue work and denies control credit for stale evidence", () => {
  const w = workspace();
  w.evidence.push({
    id: "E1",
    title: "Old source",
    reference: "https://example.invalid/proof",
    sha256: "",
    observedAt: "2026-10-01",
  });
  Object.assign(w.risks[0], {
    assessed: true,
    likelihood: 5,
    impact: 5,
    controlEffectiveness: 100,
    control: "Review",
    evidenceIds: ["E1"],
  });
  w.actions[0].status = "review";
  const p = model.companyPortfolio([row(w)], [member], "2026-11-11");
  assert.equal(p.totals.overdue, 3);
  assert.equal(p.totals.blocked, 2);
  assert.equal(p.totals.review, 1);
  assert.equal(p.totals.unassessed, 2);
  assert.equal(p.totals.critical, 1);
  assert.equal(p.totals.evidenceGaps, 1);
  assert.equal(p.requests.length, 3);
  assert.equal(p.exceptions[0].priority, 5);
  assert.ok(
    p.exceptions.some(
      (item) => item.kind === "risk" && item.detail.includes("25/25"),
    ),
  );
  const inactive = model.companyPortfolio(
    [row(w)],
    [{ ...member, active: false }],
    "2026-11-11",
  );
  assert.equal(
    inactive.exceptions.filter((item) => item.kind === "owner").length,
    1,
  );
});

test("portfolio pagination and capped exceptions retain honest scope and fail on unreadable data", () => {
  const w = workspace();
  for (let i = 3; i < 500; i++)
    w.actions.push({
      ...w.actions[0],
      id: "extra:" + i,
      dependsOn: [],
      status: "open",
    });
  const p = model.companyPortfolio([row(w)], [member], "2026-11-11");
  assert.equal(p.exceptions.length, 500);
  assert.ok(p.exceptionCount > p.exceptions.length);
  assert.equal(p.requests.length, 500);
  assert.throws(() =>
    model.companyPortfolio([row({ format: "bad" })], [member], "2026-11-11"),
  );
  assert.throws(
    () => model.companyPortfolio(Array(21).fill(row()), [member], "2026-11-11"),
    /scope/,
  );
  assert.throws(
    () => model.companyPortfolio([row()], [member], "2026-02-30"),
    /scope/,
  );
  for (const input of [undefined, "0", "-1", "NaN", "1.5", "<script>"])
    assert.equal(model.portfolioPage(input), 1);
  assert.equal(model.portfolioPage("2"), 2);
  assert.equal(model.portfolioPage("9999"), 500);
});

test("evidence requests escape spreadsheet formulas and retain revision references", () => {
  const w = workspace();
  w.name = "=malicious()";
  w.actions[0].title = "+malicious()";
  const csv = model.evidenceRequestsCsv(
    model.companyPortfolio(
      [row(w)],
      [{ ...member, label: "@example" }],
      "2026-11-11",
    ).requests,
  );
  assert.ok(csv.includes('"\'=malicious()"'));
  assert.ok(csv.includes('"\'+malicious()"'));
  assert.ok(csv.includes('"\'@example"'));
  assert.ok(csv.includes("Saved revision"));
});

test("capacity recommendations use both limits, custom scopes and negative ROI", () => {
  const input = {
    seats: 10,
    programs: 5,
    hoursPerProgram: 1,
    hourlyCost: 10,
    timeReductionPercent: 10,
  };
  const basic = pricing.scopeCompanyPlan(input);
  assert.equal(basic.plan.id, "company");
  assert.ok(basic.estimatedNetBenefit < 0);
  assert.equal(
    pricing.scopeCompanyPlan({ ...input, seats: 11 }).plan.id,
    "portfolio",
  );
  assert.equal(
    pricing.scopeCompanyPlan({ ...input, programs: 26 }).plan.id,
    "enterprise",
  );
  assert.equal(pricing.scopeCompanyPlan({ ...input, seats: 101 }).plan, null);
  assert.equal(
    pricing.scopeCompanyPlan({ ...input, hourlyCost: 0 }).breakEvenHours,
    null,
  );
  for (const patch of [
    { seats: 0 },
    { seats: 1.5 },
    { programs: 1001 },
    { hoursPerProgram: Infinity },
    { hourlyCost: NaN },
    { timeReductionPercent: 101 },
  ])
    assert.throws(
      () => pricing.scopeCompanyPlan({ ...input, ...patch }),
      /valid/,
    );
  const quote = pricing.companyProposal(" Acme ", input, true);
  assert.equal(quote.company, "Acme");
  assert.equal(quote.proposedPlan.monthlyUsd, 1499);
  assert.ok(quote.estimate.monthlyNetBenefitUsd < 0);
  assert.equal(pricing.companyProposal("", input, false).estimate, null);
  assert.throws(
    () => pricing.companyProposal("x".repeat(161), input, true),
    /limit/,
  );
});

test("playbook action uses verified ownership, enforces origin/roles and shows safe capacity errors", async () => {
  let role = "owner",
    origin = true,
    calls = [],
    failure = null;
  const redirect = (location) => {
    throw Object.assign(new Error("Redirect"), { location });
  };
  const actions = load("src/app/workspace/actions.ts", {
    "@/lib/assurance": assurance,
    "@/lib/enterprise/origin": {
      requireMutationOrigin: async () => {
        if (!origin) throw Error("origin denied");
      },
    },
    "@/lib/enterprise/session": {
      requireOrganization: async (_org, roles) => {
        if (!roles.includes(role)) throw Error("role denied");
        return {
          user: { id: uid, email: member.label },
          client: {
            rpc: async (name, args) => {
              calls.push({ name, args });
              return failure
                ? { error: { message: failure } }
                : { data: [{ id: "saved-program", revision: 1 }] };
            },
          },
        };
      },
    },
    "@/lib/enterprise/errors": {
      operationError: (error) => ({ error: error.message }),
    },
    "@/lib/cases": { isUuid: (value) => /^[a-f0-9-]{36}$/.test(value) },
    "next/cache": { revalidatePath() {} },
    "next/navigation": { redirect },
  });
  const form = new FormData();
  form.set("name", "Company screening");
  form.set("playbook", "crypto-matter");
  form.set("owner", "attacker");
  await assert.rejects(
    actions.createPlaybookProgram(org, form),
    (error) => error.location === `/workspace/${org}/programs/saved-program`,
  );
  assert.equal(calls.length, 1);
  assert.equal(calls[0].args.p_workspace.owner, uid);
  assert.ok(
    calls[0].args.p_workspace.actions.every((action) => action.owner === uid),
  );
  role = "viewer";
  await assert.rejects(actions.createPlaybookProgram(org, form), /role denied/);
  role = "owner";
  origin = false;
  await assert.rejects(
    actions.createPlaybookProgram(org, form),
    /origin denied/,
  );
  assert.equal(calls.length, 1);
  origin = true;
  failure = "Program quota reached";
  await assert.rejects(
    actions.createPlaybookProgram(org, form),
    (error) =>
      error.location === `/workspace/${org}?playbook_error=quota#playbooks`,
  );
  failure = "Private upstream diagnostic must not appear";
  await assert.rejects(
    actions.createPlaybookProgram(org, form),
    (error) =>
      error.location ===
      `/workspace/${org}?playbook_error=unavailable#playbooks`,
  );
  form.set("playbook", "unknown");
  await assert.rejects(
    actions.createPlaybookProgram(org, form),
    (error) =>
      error.location === `/workspace/${org}?playbook_error=invalid#playbooks`,
  );
});
