const { chromium } = require("playwright");
const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict"),
  crypto = require("node:crypto");
const base = process.env.REPORT_STUDIO_URL || "http://localhost:3100";
const output =
  process.env.REPORT_STUDIO_ARTIFACTS ||
  fs.mkdtempSync(path.join(require("node:os").tmpdir(), "assurance-"));
fs.mkdirSync(output, { recursive: true });
const today = new Date().toISOString().slice(0, 10),
  day = (n) =>
    new Date(Date.parse(today) + n * 86400000).toISOString().slice(0, 10);
function action(id, title, dependsOn = [], recurrenceDays = 0) {
  return {
    id,
    riskId: "R1",
    title,
    owner: "Test Owner",
    dueDate: day(-45),
    status: "review",
    dependsOn,
    evidenceIds: ["E1"],
    reviewer: "",
    resolution: "",
    completedAt: null,
    recurrenceDays,
    series: "",
    cycle: 0,
  };
}
const workspace = {
  format: "TraceSworn Assurance v1",
  name: "Acceptance Test Company",
  owner: "Test Program Owner",
  freshnessDays: 90,
  evidence: [
    {
      id: "E1",
      title: "Test evidence",
      reference: "https://example.com/evidence",
      sha256: "",
      observedAt: today,
    },
  ],
  risks: [
    {
      id: "R1",
      title: "Test risk",
      owner: "Risk Owner",
      likelihood: 5,
      impact: 5,
      assessed: true,
      controlEffectiveness: 80,
      control: "Test control",
      evidenceIds: ["E1"],
    },
  ],
  actions: [
    action("A", "Parent review", [], 30),
    action("B", "Dependent review", ["A"]),
  ],
};
function canonical(v) {
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return "[" + v.map(canonical).join(",") + "]";
  return (
    "{" +
    Object.keys(v)
      .sort()
      .map((k) => JSON.stringify(k) + ":" + canonical(v[k]))
      .join(",") +
    "}"
  );
}
function sealed(record) {
  return {
    record,
    fingerprint: {
      algorithm: "SHA-256",
      canonicalization: "sorted-keys-json",
      value: crypto
        .createHash("sha256")
        .update(canonical(record))
        .digest("hex"),
    },
  };
}
function issued(revision, conclusion, hash) {
  return sealed({
    format: "TraceSworn Report Studio v1",
    revision,
    issuedAt: new Date().toISOString(),
    reviewIdentity: "Declared names",
    integrityNote: "Integrity only",
    document: {
      template: "financial-evidence",
      title: "Test report",
      organization: "Test Company",
      accent: "#244c45",
      matterReference: "TEST-1",
      preparedFor: "Test Client",
      author: "Author",
      reviewer: "Reviewer",
      scope: "Test scope",
      methodology: "Test review",
      limitations: "Fictional acceptance data",
      conclusion,
      sources: [
        {
          id: "S1",
          title: "Test source",
          reference: "https://example.com/source",
          observedAt: today,
          sha256: hash,
          note: "",
        },
      ],
      findings: [
        {
          id: "F1",
          date: today,
          observation: "Test finding",
          sourceIds: ["S1"],
        },
      ],
      checks: { sources: true, limitations: true, conclusions: true },
    },
  });
}
(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.BROWSER_EXECUTABLE || undefined,
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    acceptDownloads: true,
  });
  const errors = [],
    posts = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => {
    if (r.method() === "POST") posts.push(r.url());
  });
  await page.goto(base + "/assurance");
  await page.getByLabel("Import workspace", { exact: true }).setInputFiles({
    name: "test.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(workspace)),
  });
  await page.getByRole("cell", { name: "5 · low", exact: true }).waitFor();
  let dependent = page.locator(".assurance-action").filter({
    has: page.getByRole("heading", { name: "Dependent review", exact: true }),
  });
  await dependent.getByText("Edit / review action", { exact: true }).click();
  await dependent.getByLabel("Declared reviewer").fill("Test Reviewer");
  await dependent
    .getByLabel("Resolution", { exact: true })
    .fill("Test resolution");
  await dependent
    .getByRole("button", { name: "Move to complete", exact: true })
    .click();
  await page.getByRole("alert").filter({ hasText: "dependencies" }).waitFor();
  let parent = page.locator(".assurance-action").filter({
    has: page.getByRole("heading", { name: "Parent review", exact: true }),
  });
  await parent.getByText("Edit / review action", { exact: true }).click();
  await parent.getByLabel("Declared reviewer").fill("Test Reviewer");
  await parent
    .getByLabel("Resolution", { exact: true })
    .fill("Test parent resolution");
  await parent
    .getByRole("button", { name: "Move to complete", exact: true })
    .click();
  await parent.getByRole("button", { name: "Reopen action" }).waitFor();
  assert.equal(await page.locator(".assurance-action").count(), 3);
  await dependent
    .getByRole("button", { name: "Move to complete", exact: true })
    .click();
  await dependent.getByRole("button", { name: "Reopen action" }).waitFor();
  await parent.getByRole("button", { name: "Reopen action" }).click();
  await page
    .getByRole("alert")
    .filter({ hasText: "dependent actions" })
    .waitFor();
  let pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export sealed workspace" }).click();
  let download = await pending;
  await download.saveAs(path.join(output, "assurance.json"));
  const exported = JSON.parse(
    fs.readFileSync(path.join(output, "assurance.json"), "utf8"),
  );
  assert.equal(exported.record.workspace.actions.length, 3);
  assert.equal(
    exported.record.workspace.actions.find((a) => a.id === "A:r1").dueDate,
    day(-15),
  );
  pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export action CSV" }).click();
  download = await pending;
  await download.saveAs(path.join(output, "actions.csv"));
  assert.ok(
    fs
      .readFileSync(path.join(output, "actions.csv"), "utf8")
      .includes("Dependent review"),
  );
  await page.screenshot({
    path: path.join(output, "assurance.png"),
    fullPage: true,
  });
  await page.emulateMedia({ media: "print" });
  await page.pdf({
    path: path.join(output, "assurance.pdf"),
    format: "A4",
    printBackground: true,
  });
  await page.emulateMedia({ media: "screen" });
  const altered = JSON.parse(JSON.stringify(exported));
  altered.record.workspace.name = "Tampered";
  await page.getByLabel("Import workspace", { exact: true }).setInputFiles({
    name: "tampered.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(altered)),
  });
  await page
    .getByRole("alert")
    .filter({ hasText: "fingerprint does not match" })
    .waitFor();
  await page.goto(base + "/assurance");
  const large = {...workspace,actions:Array.from({length:500},(_,i)=>({...action(`bulk-${i}`,`Bulk action ${i}`),status:'open'}))};
  await page.getByLabel('Import workspace',{exact:true}).setInputFiles({name:'large.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(large))});
  await page.locator('.assurance-action').last().waitFor();
  assert.equal(await page.locator('.assurance-action').count(),500);
  assert.equal(await page.locator('.assurance-action form').count(),0,'Action editors must mount lazily');
  assert.ok(await page.locator('*').count()<25000,'Large workspace should not build hundreds of dependency selectors');
  await page.goto(base + "/report-compare");
  const before = issued(1, "Before", "a".repeat(64)),
    after = issued(2, "After", "b".repeat(64));
  await page.getByLabel("Earlier issued report").setInputFiles({
    name: "before.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(before)),
  });
  await page.getByLabel("Later issued report").setInputFiles({
    name: "after.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(after)),
  });
  await page.getByText(/2 content changes/).waitFor();
  await page.getByRole("heading", { name: "sources · S1 · changed" }).waitFor();
  await page.goto(base + "/assurance");
  await page.getByLabel("Import issued report", { exact: true }).setInputFiles({
    name: "report.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(before)),
  });
  await page
    .getByRole("cell", { name: "Pending assessment · unassessed", exact: true })
    .waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: path.join(output, "assurance-mobile.png"),
    fullPage: true,
  });
  assert.equal(posts.length, 0);
  assert.deepEqual(errors, []);
  console.log(
    "PASS: portfolio scores, dependency closure, recurrence, protected reopening, sealed/CSV exports, PDF printing, tamper rejection, report diff and unassessed import; no content POSTs or runtime errors.",
  );
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
