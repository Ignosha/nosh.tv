const { PGlite } = require(process.env.PGLITE_MODULE || "@electric-sql/pglite");
const fs = require("node:fs");
const assert = require("node:assert/strict");
(async () => {
  const db = new PGlite();
  await db.exec(
    "create role anon; create role authenticated; create role service_role;",
  );
  const schema = fs.readFileSync(
    require("node:path").join(__dirname, "../supabase/schema.sql"),
    "utf8",
  );
  await db.exec(schema);
  await db.exec(schema);
  console.log("PASS: schema applies and reruns");
  const {
    rows: [firm],
  } = await db.query(
    "insert into kl_firms(name,email,case_lead) values('Test Firm','owner@example.com','Named Lead') returning id,token",
  );
  let caseToken;
  for (let n = 0; n < 4; n++) {
    const r = await db.query(
      "select kl_open_firm_matter($1,$2,'bankruptcy','investigation',now()) token",
      [firm.token, `Matter ${n}`],
    );
    caseToken = r.rows[0].token;
  }
  await assert.rejects(
    () =>
      db.query(
        "select kl_open_firm_matter($1,'Overflow','estate','investigation',now())",
        [firm.token],
      ),
    /Monthly capacity/,
  );
  console.log("PASS: four-matter cap");
  const {
    rows: [matter],
  } = await db.query("select id from kl_cases where token=$1", [caseToken]);
  await db.query("update kl_cases set findings=$1 where id=$2", [
    JSON.stringify({ addresses: [] }),
    matter.id,
  ]);
  let r = await db.query("select * from kl_jobs");
  assert.equal(r.rows.length, 1);
  assert.equal(r.rows[0].version, 1);
  r = await db.query("select * from kl_claim_job()");
  assert.equal(r.rows[0].attempts, 1);
  assert.equal(r.rows[0].state, "running");
  r = await db.query("select * from kl_claim_job()");
  assert.equal(r.rows.length, 0);
  console.log("PASS: findings queue and exclusive claim");
  await db.query("update kl_cases set report_approved=true where id=$1", [
    matter.id,
  ]);
  await db.query("update kl_cases set findings=$1 where id=$2", [
    JSON.stringify({ addresses: [{ address: "changed" }] }),
    matter.id,
  ]);
  r = await db.query(
    "select report_approved,findings_version from kl_cases where id=$1",
    [matter.id],
  );
  assert.equal(r.rows[0].report_approved, false);
  assert.equal(r.rows[0].findings_version, 2);
  console.log("PASS: new findings invalidate approval");
  const {
    rows: [unpaid],
  } = await db.query(
    "insert into kl_cases(role,name,email) values('attorney','Unpaid','test@example.com') returning id",
  );
  await db.query("update kl_cases set findings=$1 where id=$2", [
    JSON.stringify({ addresses: [] }),
    unpaid.id,
  ]);
  r = await db.query("select * from kl_jobs where case_id=$1", [unpaid.id]);
  assert.equal(r.rows.length, 0);
  await db.query("update kl_cases set paid_at=now() where id=$1", [unpaid.id]);
  r = await db.query("select * from kl_jobs where case_id=$1", [unpaid.id]);
  assert.equal(r.rows.length, 1);
  console.log("PASS: unpaid intake waits; payment queues findings");
  const {
    rows: [f2],
  } = await db.query(
    "insert into kl_firms(name,email,case_lead) values('Hours Firm','hours@example.com','Lead') returning id,token",
  );
  r = await db.query(
    "select kl_open_firm_matter($1,'First','estate','investigation',now()) token",
    [f2.token],
  );
  const t = r.rows[0].token;
  await db.query(
    "insert into kl_time_entries(case_id,minutes,note) select id,1000,'work' from kl_cases where token=$1",
    [t],
  );
  await db.query(
    "insert into kl_time_entries(case_id,minutes,note) select id,500,'work' from kl_cases where token=$1",
    [t],
  );
  await assert.rejects(
    () =>
      db.query(
        "select kl_open_firm_matter($1,'Extra','estate','investigation',now())",
        [f2.token],
      ),
    /specialist hours/,
  );
  console.log("PASS: 25-hour gate");
  for (let n = 0; n < 50; n++)
    await db.query(
      "select kl_open_firm_matter($1,$2,'estate','screening',now())",
      [f2.token, `Screen ${n}`],
    );
  await assert.rejects(
    () =>
      db.query(
        "select kl_open_firm_matter($1,'Extra screen','estate','screening',now())",
        [f2.token],
      ),
    /Monthly capacity/,
  );
  console.log("PASS: 50-screening cap");
  await db.query("update kl_cases set extras=$1 where id=$2", [
    JSON.stringify({ trace: { preserve: true } }),
    matter.id,
  ]);
  r = await db.query("select kl_save_preparation($1,1,'{}','{}','[]') saved", [
    matter.id,
  ]);
  assert.equal(r.rows[0].saved, false);
  r = await db.query("select kl_save_preparation($1,2,'{}','{}','[]') saved", [
    matter.id,
  ]);
  assert.equal(r.rows[0].saved, true);
  r = await db.query("select extras from kl_cases where id=$1", [matter.id]);
  assert.equal(r.rows[0].extras.trace.preserve, true);
  await db.query("update kl_cases set report_approved=true where id=$1", [
    matter.id,
  ]);
  r = await db.query("select kl_save_preparation($1,2,'{}','{}','[]') saved", [
    matter.id,
  ]);
  assert.equal(r.rows[0].saved, false);
  console.log(
    "PASS: stale preparation is rejected; extras and approved reports are preserved",
  );
  const issued = {
    record: {
      format: "TraceSworn Report Studio v1",
      revision: 1,
      issuedAt: "2026-11-10T00:00:00Z",
      document: { author: "Author", reviewer: "Reviewer" },
    },
    fingerprint: { value: "a".repeat(64) },
  };
  r = await db.query("select kl_archive_report($1,$2) version", [
    matter.id,
    JSON.stringify(issued),
  ]);
  assert.equal(r.rows[0].version, 1);
  r = await db.query("select kl_archive_report($1,$2) version", [
    matter.id,
    JSON.stringify(issued),
  ]);
  assert.equal(r.rows[0].version, 1);
  issued.record.revision = 2;
  issued.fingerprint.value = "b".repeat(64);
  r = await db.query("select kl_archive_report($1,$2) version", [
    matter.id,
    JSON.stringify(issued),
  ]);
  assert.equal(r.rows[0].version, 2);
  await assert.rejects(
    () =>
      db.query(
        "update kl_report_versions set reviewer='Changed' where case_id=$1",
        [matter.id],
      ),
    /append-only/,
  );
  await assert.rejects(
    () =>
      db.query("delete from kl_report_versions where case_id=$1", [matter.id]),
    /append-only/,
  );
  console.log(
    "PASS: report archive versions are sequential, duplicate-safe and append-only",
  );
  await db.exec("set role anon");
  await assert.rejects(
    () =>
      db.query("select kl_archive_report($1,$2)", [
        matter.id,
        JSON.stringify(issued),
      ]),
    /permission denied/,
  );
  await db.exec("reset role");
  console.log("PASS: anonymous callers cannot archive reports");
  const program = {
    format: "TraceSworn Assurance v1",
    name: "Test company",
    owner: "Owner",
    freshnessDays: 90,
    evidence: [],
    risks: [],
    actions: [],
  };
  r = await db.query("select * from kl_save_assurance(null,0,$1,$2,$3)", [
    JSON.stringify(program),
    "Operator",
    "Create program",
  ]);
  const programId = r.rows[0].id;
  assert.equal(r.rows[0].revision, 1);
  program.name = "Updated company";
  r = await db.query("select * from kl_save_assurance($1,1,$2,$3,$4)", [
    programId,
    JSON.stringify(program),
    "Operator",
    "Updated name",
  ]);
  assert.equal(r.rows[0].revision, 2);
  await assert.rejects(
    () =>
      db.query("select * from kl_save_assurance($1,1,$2,$3,$4)", [
        programId,
        JSON.stringify(program),
        "Operator",
        "Stale save",
      ]),
    /Revision conflict/,
  );
  r = await db.query(
    "select revision,workspace from kl_assurance_history where program_id=$1 order by revision",
    [programId],
  );
  assert.equal(r.rows.length, 2);
  assert.equal(r.rows[0].workspace.name, "Test company");
  await assert.rejects(
    () =>
      db.query(
        "update kl_assurance_history set actor='Changed' where program_id=$1",
        [programId],
      ),
    /append-only/,
  );
  await db.exec("set role anon");
  await assert.rejects(
    () =>
      db.query("select * from kl_save_assurance(null,0,$1,$2,$3)", [
        JSON.stringify(program),
        "Anon",
        "Try",
      ]),
    /permission denied/,
  );
  await db.exec("reset role");
  console.log(
    "PASS: assurance saves preserve audit snapshots, reject stale revisions and deny anonymous writes",
  );
  await db.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
