const { PGlite } = require("@electric-sql/pglite");
const fs = require("node:fs"),
  assert = require("node:assert/strict"),
  { randomUUID } = require("node:crypto");
(async () => {
  const db = new PGlite();
  await db.exec(
    `create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);create function auth.jwt()returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;create function auth.uid()returns uuid language sql stable as $$select(auth.jwt()->>'sub')::uuid$$;grant usage on schema public,auth to authenticated,anon,service_role;`,
  );
  for (let i = 0; i < 2; i++) {
    await db.exec(fs.readFileSync("supabase/schema.sql", "utf8"));
    await db.exec(fs.readFileSync("supabase/enterprise.sql", "utf8"));
  }
  console.log("PASS enterprise migrations rerun");
  const ids = {
    ownerA: randomUUID(),
    ownerB: randomUUID(),
    editor: randomUUID(),
    reviewer: randomUUID(),
    viewer: randomUUID(),
    outsider: randomUUID(),
  };
  for (const [name, id] of Object.entries(ids))
    await db.query("insert into auth.users values($1,$2,now())", [
      id,
      name.toLowerCase() + "@example.com",
    ]);
  const orgA = (
      await db.query("select kl_provision_organization('Company A',$1) id", [
        ids.ownerA,
      ])
    ).rows[0].id,
    orgB = (
      await db.query("select kl_provision_organization('Company B',$1) id", [
        ids.ownerB,
      ])
    ).rows[0].id;
  for (const role of ["editor", "reviewer", "viewer"])
    await db.query(
      "insert into kl_org_members(organization_id,user_id,role)values($1,$2,$3)",
      [orgA, ids[role], role],
    );
  async function asUser(id, run, aal = "aal2") {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claims',$1,false)", [
      JSON.stringify({
        sub: id,
        aal,
        email:
          Object.entries(ids)
            .find(([, v]) => v === id)[0]
            .toLowerCase() + "@example.com",
      }),
    ]);
    await db.exec("set role authenticated");
    try {
      return await run();
    } finally {
      await db.exec("reset role");
    }
  }
  await asUser(ids.ownerA, async () =>
    assert.equal(
      (await db.query("select * from kl_organizations")).rows.length,
      1,
    ),
  );
  await asUser(
    ids.ownerA,
    async () =>
      assert.equal(
        (await db.query("select * from kl_organizations")).rows.length,
        0,
      ),
    "aal1",
  );
  console.log("PASS tenant and MFA read isolation");
  const today = new Date().toISOString().slice(0, 10);
  const w = {
    format: "TraceSworn Assurance v1",
    name: "Company A program",
    owner: ids.ownerA,
    freshnessDays: 90,
    evidence: [
      {
        id: "E1",
        title: "Proof",
        reference: "https://example.com/proof",
        sha256: "",
        observedAt: today,
      },
    ],
    risks: [
      {
        id: "R1",
        title: "Risk",
        owner: ids.editor,
        likelihood: 3,
        impact: 3,
        controlEffectiveness: 50,
        control: "Review",
        assessed: true,
        evidenceIds: ["E1"],
      },
    ],
    actions: [
      {
        id: "A1",
        riskId: "R1",
        title: "Review evidence",
        owner: ids.editor,
        dueDate: today,
        status: "open",
        dependsOn: [],
        evidenceIds: ["E1"],
        reviewer: "",
        resolution: "",
        completedAt: null,
        recurrenceDays: 30,
        series: "",
        cycle: 0,
      },
    ],
  };
  const save = (id, revision, workspace = w) =>
    db.query("select * from kl_company_save($1,$2,$3,$4,$5)", [
      orgA,
      id,
      revision,
      JSON.stringify(workspace),
      "Acceptance change",
    ]);
  await asUser(
    ids.viewer,
    async () => await assert.rejects(() => save(null, 0), /access denied/),
  );
  const program = (await asUser(ids.editor, () => save(null, 0))).rows[0].id;
  await asUser(ids.ownerB, async () => {
    assert.equal(
      (
        await db.query("select * from kl_assurance_programs where id=$1", [
          program,
        ])
      ).rows.length,
      0,
    );
    await assert.rejects(() => save(program, 1), /access denied/);
  });
  await asUser(
    ids.editor,
    async () =>
      await assert.rejects(
        () =>
          db.query("update kl_assurance_programs set name=$1 where id=$2", [
            "Forged",
            program,
          ]),
        /permission denied/,
      ),
  );
  await asUser(
    ids.editor,
    async () =>
      await assert.rejects(() => save(program, 0), /Revision conflict/),
  );
  console.log(
    "PASS role, cross-tenant write, direct DML and optimistic conflict checks",
  );
  w.actions[0].status = "in_progress";
  await asUser(ids.editor, () => save(program, 1));
  w.actions[0].status = "review";
  await asUser(ids.editor, () => save(program, 2));
  await asUser(
    ids.editor,
    async () =>
      await assert.rejects(
        () =>
          db.query("select kl_company_approve_action($1,$2,3,$3,$4)", [
            orgA,
            program,
            "A1",
            "Done",
          ]),
        /access denied/,
      ),
  );
  // Even an owner cannot approve a review they submitted.
  let selfWorkspace = JSON.parse(JSON.stringify(w));
  selfWorkspace.name = "Self review";
  const selfProgram = (
    await asUser(ids.ownerA, () =>
      save(null, 0, { ...selfWorkspace, actions: [] }),
    )
  ).rows[0].id;
  selfWorkspace.actions[0].status = "open";
  await asUser(ids.ownerA, () => save(selfProgram, 1, selfWorkspace));
  selfWorkspace.actions[0].status = "in_progress";
  await asUser(ids.ownerA, () => save(selfProgram, 2, selfWorkspace));
  selfWorkspace.actions[0].status = "review";
  await asUser(ids.ownerA, () => save(selfProgram, 3, selfWorkspace));
  await asUser(
    ids.ownerA,
    async () =>
      await assert.rejects(
        () =>
          db.query("select kl_company_approve_action($1,$2,4,$3,$4)", [
            orgA,
            selfProgram,
            "A1",
            "Self approve",
          ]),
        /different authenticated reviewer/,
      ),
  );
  await asUser(ids.reviewer, () =>
    db.query("select kl_company_approve_action($1,$2,3,$3,$4)", [
      orgA,
      program,
      "A1",
      "Verified evidence",
    ]),
  );
  const updated = (
    await asUser(ids.viewer, () =>
      db.query(
        "select workspace,revision from kl_assurance_programs where id=$1",
        [program],
      ),
    )
  ).rows[0];
  assert.equal(updated.revision, 4);
  assert.equal(updated.workspace.actions[0].reviewer, ids.reviewer);
  assert.equal(updated.workspace.actions.length, 2);
  assert.equal(updated.workspace.actions[1].status, "open");
  await asUser(
    ids.editor,
    async () =>
      await assert.rejects(
        () =>
          save(program, 4, {
            ...updated.workspace,
            actions: updated.workspace.actions.map((a) => ({
              ...a,
              resolution: "Forged",
            })),
          }),
        /authenticated review/,
      ),
  );
  console.log(
    "PASS authenticated approval and recurring follow-up; closed data cannot be forged",
  );
  await asUser(
    ids.ownerA,
    async () =>
      await assert.rejects(
        () =>
          db.query("select kl_set_org_member($1,$2,$3,false)", [
            orgA,
            ids.ownerA,
            "owner",
          ]),
        /last owner/,
      ),
  );
  const invitation = (
    await asUser(ids.ownerA, () =>
      db.query("select kl_create_org_invite($1,$2,$3) token", [
        orgA,
        "outsider@example.com",
        "viewer",
      ]),
    )
  ).rows[0].token;
  await asUser(
    ids.ownerB,
    async () =>
      await assert.rejects(
        () => db.query("select kl_accept_org_invite($1)", [invitation]),
        /unavailable/,
      ),
  );
  await asUser(ids.outsider, () =>
    db.query("select kl_accept_org_invite($1)", [invitation]),
  );
  await asUser(
    ids.outsider,
    async () =>
      await assert.rejects(
        () => db.query("select kl_accept_org_invite($1)", [invitation]),
        /unavailable/,
      ),
  );
  await asUser(ids.ownerA, () =>
    db.query("select kl_set_org_member($1,$2,$3,false)", [
      orgA,
      ids.outsider,
      "viewer",
    ]),
  );
  await asUser(ids.outsider, async () =>
    assert.equal(
      (await db.query("select * from kl_assurance_programs")).rows.length,
      0,
    ),
  );
  console.log(
    "PASS email-bound one-use invitations, last-owner protection and revocation",
  );
  const doc = {
    template: "financial-evidence",
    title: "Test report",
    organization: "Company A",
    accent: "#244c45",
    matterReference: "CASE-1",
    preparedFor: "Company",
    author: "Author",
    reviewer: "Reviewer",
    scope: "Scope",
    methodology: "Method",
    limitations: "Limitations",
    conclusion: "Conclusion",
    sources: [
      {
        id: "S1",
        title: "Source",
        reference: "https://example.com/proof",
        observedAt: today,
        sha256: "",
        note: "",
      },
    ],
    findings: [
      { id: "F1", date: today, observation: "Observation", sourceIds: ["S1"] },
    ],
    checks: { sources: true, limitations: true, conclusions: true },
  };
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
  const record = {
    format: "TraceSworn Report Studio v1",
    revision: 1,
    issuedAt: new Date().toISOString(),
    document: doc,
    reviewIdentity: "Declared identities",
    integrityNote: "Integrity only",
  };
  const sealed = {
    record,
    fingerprint: {
      algorithm: "SHA-256",
      canonicalization: "sorted-keys-json",
      value: require("node:crypto")
        .createHash("sha256")
        .update(canonical(record))
        .digest("hex"),
    },
  };
  const report = (
    await asUser(ids.ownerA, () =>
      db.query("select kl_submit_org_report($1,$2) id", [
        orgA,
        JSON.stringify(sealed),
      ]),
    )
  ).rows[0].id;
  const tampered = JSON.parse(JSON.stringify(sealed));
  tampered.record.document.title = "Tampered";
  await asUser(
    ids.ownerA,
    async () =>
      await assert.rejects(
        () =>
          db.query("select kl_submit_org_report($1,$2)", [
            orgA,
            JSON.stringify(tampered),
          ]),
        /fingerprint mismatch/,
      ),
  );
  await asUser(ids.viewer, async () =>
    assert.equal(
      (await db.query("select * from kl_org_reports")).rows.length,
      0,
    ),
  );
  await asUser(
    ids.ownerA,
    async () =>
      await assert.rejects(
        () => db.query("select kl_publish_org_report($1,$2)", [orgA, report]),
        /different authenticated reviewer/,
      ),
  );
  await asUser(ids.reviewer, () =>
    db.query("select kl_publish_org_report($1,$2)", [orgA, report]),
  );
  await asUser(ids.viewer, async () =>
    assert.equal(
      (await db.query("select * from kl_org_reports")).rows.length,
      1,
    ),
  );
  await asUser(ids.ownerB, async () =>
    assert.equal(
      (await db.query("select * from kl_org_reports")).rows.length,
      0,
    ),
  );
  console.log(
    "PASS database report fingerprints, pending-viewer restriction and authenticated independent publication",
  );
  await db.query(
    "update kl_organizations set access_until=now()-interval'1 day'where id=$1",
    [orgA],
  );
  await asUser(ids.editor, async () => {
    assert.equal(
      (
        await db.query("select * from kl_assurance_programs where id=$1", [
          program,
        ])
      ).rows.length,
      1,
    );
    await assert.rejects(
      () => save(program, 4, updated.workspace),
      /read-only/,
    );
  });
  console.log(
    "PASS expired entitlement is read-only, preserving access to exports",
  );
  // Security revocation remains available even when billing is read-only.
  await asUser(ids.ownerA, () =>
    db.query("select kl_set_org_member($1,$2,$3,false)", [
      orgA,
      ids.viewer,
      "viewer",
    ]),
  );
  await asUser(ids.viewer, async () =>
    assert.equal(
      (await db.query("select * from kl_assurance_programs")).rows.length,
      0,
    ),
  );
  const expected = JSON.stringify(
    (
      await db.query(
        "select organization_id,fingerprint,sealed from kl_org_reports order by id",
      )
    ).rows,
  );
  const backup = await db.dumpDataDir();
  const restored = new PGlite({ loadDataDir: backup });
  assert.equal(
    JSON.stringify(
      (
        await restored.query(
          "select organization_id,fingerprint,sealed from kl_org_reports order by id",
        )
      ).rows,
    ),
    expected,
  );
  await restored.query("select set_config('request.jwt.claims',$1,false)", [
    JSON.stringify({
      sub: ids.ownerB,
      aal: "aal2",
      email: "ownerb@example.com",
    }),
  ]);
  await restored.exec("set role authenticated");
  assert.equal(
    (await restored.query("select * from kl_org_reports")).rows.length,
    0,
  );
  await restored.close();
  console.log(
    "PASS local physical restore preserves report contents and tenant policies; billing expiry does not block revocation",
  );
  await db.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
