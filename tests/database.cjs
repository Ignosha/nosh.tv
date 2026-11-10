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
  await db.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
