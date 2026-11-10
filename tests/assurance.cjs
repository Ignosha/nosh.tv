const test = require("node:test"),
  assert = require("node:assert/strict"),
  ts = require("typescript"),
  fs = require("node:fs"),
  vm = require("node:vm");
function load(file, deps = {}) {
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
      Error,
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
      Buffer,
      process,
    },
  );
  return exports;
}
const model = load("src/lib/assurance.ts");
const now = new Date("2026-11-10T12:00:00Z");
function workspace() {
  return {
    ...model.newAssurance(),
    name: "Company controls",
    owner: "Program Owner",
    evidence: [
      {
        id: "E1",
        title: "Test record",
        reference: "https://example.com/evidence",
        sha256: "",
        observedAt: "2026-11-01",
      },
    ],
    risks: [
      {
        id: "R1",
        title: "Unreviewed access",
        owner: "Risk Owner",
        likelihood: 5,
        impact: 5,
        controlEffectiveness: 80,
        control: "Quarterly review",
        assessed: true,
        evidenceIds: ["E1"],
      },
    ],
    actions: [],
  };
}
function action(id, patch = {}) {
  return {
    id,
    riskId: "R1",
    title: id,
    owner: "Owner",
    dueDate: "2026-10-01",
    status: "open",
    dependsOn: [],
    evidenceIds: ["E1"],
    reviewer: "",
    resolution: "",
    completedAt: null,
    recurrenceDays: 0,
    series: "",
    cycle: 0,
    ...patch,
  };
}
test("Stale, missing, future and unassessed evidence does not earn control credit", () => {
  const w = workspace();
  assert.equal(model.riskScore(w.risks[0], w, "2026-11-10").residual, 5);
  w.evidence[0].observedAt = "2025-01-01";
  assert.equal(model.riskScore(w.risks[0], w, "2026-11-10").residual, 25);
  w.evidence[0].observedAt = "2027-01-01";
  assert.equal(
    model.riskScore(w.risks[0], w, "2026-11-10").creditedEffectiveness,
    0,
  );
  w.evidence[0].observedAt = "2026-11-01";
  w.risks[0].assessed = false;
  assert.equal(model.riskScore(w.risks[0], w, "2026-11-10").band, "unassessed");
  assert.equal(
    model.riskScore(w.risks[0], w, "2026-11-10").creditedEffectiveness,
    0,
  );
});
test("Dependency graph rejects dangling references and cycles", () => {
  const w = workspace();
  w.actions = [
    action("A", { dependsOn: ["B"] }),
    action("B", { dependsOn: ["A"] }),
  ];
  assert.throws(() => model.parseAssurance(w), /Circular/);
  w.actions = [action("A", { dependsOn: ["missing"] })];
  assert.throws(() => model.parseAssurance(w), /missing dependency/);
});
test("Closure requires lifecycle, distinct reviewer, fresh evidence and completed dependencies", () => {
  let w = workspace();
  w.actions = [
    action("A"),
    action("B", { dependsOn: ["A"], status: "review" }),
  ];
  assert.throws(
    () => model.transitionAction(w, "A", "complete", "Reviewer", "Done", now),
    /Invalid workflow/,
  );
  assert.throws(
    () => model.transitionAction(w, "B", "complete", "Owner", "Done", now),
    /distinct reviewer/,
  );
  assert.throws(
    () => model.transitionAction(w, "B", "complete", "Reviewer", "Done", now),
    /dependencies/,
  );
  w.actions[0].status = "review";
  w = model.transitionAction(w, "A", "complete", "Reviewer", "Done", now);
  w = model.transitionAction(w, "B", "complete", "Reviewer", "Done", now);
  assert.equal(w.actions[1].status, "complete");
  assert.throws(
    () => model.transitionAction(w, "A", "in_progress", "", "", now),
    /dependent actions/,
  );
});
test("Recurring actions stay anchored to due dates, create once and do not mutate input", () => {
  const original = workspace();
  original.actions = [action("A", { status: "review", recurrenceDays: 30 })];
  let w = model.transitionAction(
    original,
    "A",
    "complete",
    "Reviewer",
    "Reviewed",
    now,
  );
  assert.equal(original.actions[0].status, "review");
  assert.equal(w.actions.length, 2);
  assert.equal(w.actions[1].dueDate, "2026-10-31");
  assert.equal(w.actions[1].dependsOn[0], "A");
  assert.equal(w.actions[1].evidenceIds.length, 0);
  w = model.transitionAction(w, "A", "in_progress", "", "", now);
  w = model.transitionAction(w, "A", "review", "", "", now);
  w = model.transitionAction(
    w,
    "A",
    "complete",
    "Reviewer",
    "Reviewed again",
    now,
  );
  assert.equal(w.actions.length, 2);
});
test("Stale evidence blocks closure and invalid calendar dates are rejected", () => {
  const w = workspace();
  w.evidence[0].observedAt = "2024-01-01";
  w.actions = [action("A", { status: "review" })];
  assert.throws(
    () => model.transitionAction(w, "A", "complete", "Reviewer", "Done", now),
    /stale/,
  );
  assert.equal(model.validDate("2026-02-30"), false);
  assert.equal(model.validDate("2028-02-29"), true);
});
test("Portfolio exposes overdue, blocked and stale items; CSV neutralizes formulas", () => {
  const w = workspace();
  w.actions = [
    action("A"),
    action("B", { dependsOn: ["A"], title: '=HYPERLINK("malicious")' }),
  ];
  const p = model.portfolio(w, "2026-11-10");
  assert.equal(p.overdue.length, 2);
  assert.equal(p.blocked.length, 1);
  assert.ok(model.exportActionsCsv(w).includes("'=HYPERLINK"));
});
test("Report comparison detects changed evidence fingerprints and findings by stable identity", () => {
  const fingerprints = load("src/lib/fingerprint.ts");
  const { compareReports } = load("src/lib/reportDiff.ts", {
    "./fingerprint": fingerprints,
  });
  const before = {
    title: "Report",
    sources: [{ id: "S1", sha256: "old" }],
    findings: [{ id: "F1", observation: "before" }],
  };
  const after = {
    ...before,
    sources: [{ id: "S1", sha256: "new" }],
    findings: [
      { id: "F1", observation: "after" },
      { id: "F2", observation: "added" },
    ],
  };
  const changes = compareReports(before, after);
  assert.equal(changes.length, 3);
  assert.ok(
    changes.some((c) => c.section === "sources" && c.kind === "changed"),
  );
  assert.ok(changes.some((c) => c.id === "F2" && c.kind === "added"));
});

test("Policy starters preserve unassessed status, add dependency order and avoid duplicate application", () => {
  const w = workspace();
  const next = model.applyPolicyPack(w, "vendor-oversight", "2026-11-10");
  assert.equal(next.actions.length, 3);
  assert.equal(next.actions[1].dependsOn[0], next.actions[0].id);
  assert.equal(next.risks[1].assessed, false);
  assert.equal(w.actions.length, 0);
  assert.throws(
    () => model.applyPolicyPack(next, "vendor-oversight", "2026-11-10"),
    /already applied/,
  );
  assert.equal(
    model
      .ownerWorkload(next, "2026-11-20")
      .find((o) => o.owner === "Program Owner").open,
    3,
  );
});

test("Admin mutations reject missing credentials independently of page middleware", async () => {
  const auth = load("src/lib/adminAuth.ts", {
    "next/headers": { headers: async () => ({ get: () => null }) },
    "node:crypto": require("node:crypto"),
  });
  assert.equal(auth.adminAuthorized(null, "secret"), false);
  assert.equal(
    auth.adminAuthorized(
      "Basic " + Buffer.from("admin:secret").toString("base64"),
      "secret",
    ),
    true,
  );
  assert.equal(
    auth.adminAuthorized(
      "Basic " + Buffer.from("other:secret").toString("base64"),
      "secret",
    ),
    false,
  );
  assert.equal(
    auth.adminAuthorized(
      "Basic " + Buffer.from("admin:wrong").toString("base64"),
      "secret",
    ),
    false,
  );
  await assert.rejects(() => auth.requireAdmin(), /authentication required/);
});

test('Workspace size limits preserve portable export capacity',()=>{const w=workspace();w.risks=Array.from({length:200},(_,i)=>({...w.risks[0],id:`R${i}`,control:'x'.repeat(4000)}));assert.throws(()=>model.parseAssurance(w),/600 KB/);});
