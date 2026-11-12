const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");
const output =
  process.env.REPORT_STUDIO_ARTIFACTS ||
  fs.mkdtempSync(path.join(require("node:os").tmpdir(), "report-studio-"));
fs.mkdirSync(output, { recursive: true });
const base = process.env.REPORT_STUDIO_URL || "http://localhost:3100";
const assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.BROWSER_EXECUTABLE || undefined,
    headless: true,
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    acceptDownloads: true,
  });
  const errors = [];
  const posts = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => {
    if (r.method() === "POST") posts.push(r.url());
  });
  await page.goto(base + "/report-builder");
  await page
    .getByRole("button", { name: "Issue & download revision 1" })
    .click();
  await page
    .getByRole("alert")
    .filter({ hasText: "Complete organization" })
    .waitFor();
  for (const [label, value] of Object.entries({
    Organization: "Example Test Practice",
    "Report title": "Acceptance Test Report",
    "Matter reference": "TEST-001",
    "Prepared for": "Test Client",
    Author: "Test Author",
    Reviewer: "Test Reviewer",
  }))
    await page.getByLabel(label, { exact: true }).fill(value);
  await page.getByRole("button", { name: "Add source", exact: true }).click();
  const source = page.locator("fieldset").first();
  await source.getByLabel("Source title", { exact: true }).fill("Test Source");
  await source
    .getByLabel("Source URL (HTTPS)")
    .fill("https://example.com/evidence");
  await source.getByLabel("Observed date").fill("2026-11-10");
  await source
    .getByLabel(/Hash an original file/)
    .setInputFiles({
      name: "test-evidence.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("test source evidence"),
    });
  await page
    .getByText(/File fingerprint computed locally/)
    .first()
    .waitFor();
  await page.getByRole("button", { name: "Add finding", exact: true }).click();
  const finding = page.locator("fieldset").last();
  await finding
    .getByLabel("Observation", { exact: true })
    .fill("Test observation supported by the cited source.");
  await finding.getByLabel("Test Source", { exact: true }).check();
  for (const [label, value] of Object.entries({
    scope: "Supplied test source only.",
    methodology: "Checked the test source reference.",
    limitations: "Test report; no real investigation.",
    conclusion: "Test finding documented.",
  }))
    await page.getByLabel(label, { exact: true }).fill(value);
  await page.getByLabel("Source references and figures checked").check();
  await page.getByLabel("Coverage and limitations reviewed").check();
  await page.getByLabel("Conclusions supported by cited findings").check();
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Issue & download revision 1" })
    .click();
  const download = await downloadPromise;
  await download.saveAs(path.join(output, "studio-issued.json"));
  const issued = JSON.parse(
    fs.readFileSync(path.join(output, "studio-issued.json"), "utf8"),
  );
  assert.equal(issued.record.document.organization, "Example Test Practice");
  assert.equal(issued.record.revision, 1);
  assert.equal(
    issued.record.document.sources[0].sha256,
    require("node:crypto")
      .createHash("sha256")
      .update("test source evidence")
      .digest("hex"),
  );
  await page.screenshot({
    path: path.join(output, "report-studio.png"),
    fullPage: true,
  });
  await page.emulateMedia({ media: "print" });
  await page.pdf({
    path: path.join(output, "report-studio-test.pdf"),
    format: "A4",
    printBackground: true,
  });
  await page.emulateMedia({ media: "screen" });
  await page.getByLabel(/^conclusion$/i).fill("Changed after issuance");
  assert.equal(
    await page.getByLabel("Source references and figures checked").isChecked(),
    false,
  );
  assert.equal(issued.record.document.conclusion, "Test finding documented.");
  await page
    .getByLabel("Import draft or issued JSON")
    .setInputFiles(path.join(output, "studio-issued.json"));
  await page
    .getByLabel(/^conclusion$/i)
    .filter({ visible: true })
    .waitFor();
  await page.waitForFunction(() => document.querySelector("textarea") !== null);
  await page
    .getByRole("button", { name: "Issue & download revision 2" })
    .waitFor();
  const changed = JSON.parse(JSON.stringify(issued));
  changed.record.document.title = "Tampered";
  await page
    .getByLabel("Import draft or issued JSON")
    .setInputFiles({
      name: "tampered.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(changed)),
    });
  await page
    .getByRole("alert")
    .filter({ hasText: "fingerprint does not match" })
    .waitFor();
  assert.equal(posts.length, 0, "Report content must not be posted");
  assert.deepEqual(errors, []);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: path.join(output, "report-studio-mobile.png"),
    fullPage: true,
  });
  console.log(
    "PASS: drafting, local hashing, citations, review gates, sealed issuance/download, PDF printing, edit invalidation, import and tamper rejection; no content POSTs or runtime errors.",
  );
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
