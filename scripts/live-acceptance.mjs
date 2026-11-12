// Real staging GoTrue and TOTP acceptance. Privileged keys never enter the web app.
// This is operations tooling: review the exact commit before granting it credentials.
import { createClient } from "@supabase/supabase-js";
import { createHmac, randomBytes, randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";

export const stagingOrigin = "https://bowpuebiycqbodkpwdcb.supabase.co";
export function validateConfig(env) {
  if (env.SUPABASE_URL !== stagingOrigin || env.ACCEPTANCE_CONFIRMATION !== "ISOLATED_STAGING_PROJECT")
    throw Error("Only the explicitly confirmed staging project is allowed");
  for (const key of ["SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"])
    if (!env[key] || env[key].length < 20) throw Error("Private operations credentials are missing");
}
export function totp(secret, milliseconds = Date.now(), digits = 6) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const char of secret.toUpperCase().replace(/=+$/, "")) {
    const index = alphabet.indexOf(char);
    if (index < 0) throw Error("Invalid TOTP enrollment secret");
    bits += index.toString(2).padStart(5, "0");
  }
  const key = Buffer.from(bits.match(/.{8}/g)?.map(value => parseInt(value, 2)) || []);
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(milliseconds / 30000)));
  const digest = createHmac("sha1", key).update(counter).digest();
  const offset = digest.at(-1) & 15;
  return ((digest.readUInt32BE(offset) & 0x7fffffff) % 10 ** digits).toString().padStart(digits, "0");
}
const need = (condition, label) => { if (!condition) throw Error(label); };
const good = (result, label) => { need(!result.error, label); return result.data; };
const denied = (result, pattern, label) => need(result.error && pattern.test(result.error.message), label);

export async function runAcceptance(env) {
  validateConfig(env); // Before network access or mutations.
  const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }, global: {
    fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(12000) }),
  } };
  const client = () => createClient(stagingOrigin, env.SUPABASE_ANON_KEY, options);
  const operations = createClient(stagingOrigin, env.SUPABASE_SERVICE_ROLE_KEY, options);
  const users = [], organizations = [], checks = [];
  const run = randomUUID();
  let failed = false, cleanupFailed = false, stage = "preflight";
  const pass = label => { checks.push(label); console.log(JSON.stringify({ check: label, status: "passed" })); };
  const rpc = (actor, name, args) => actor.client.rpc(name, args);
  async function patchOrganization(id, patch) {
    need(organizations.includes(id), "Fixture organization guard failed");
    const rows = good(await operations.from("kl_organizations").update(patch).eq("id", id).select("id"), "Fixture organization update failed");
    need(rows.length === 1, "Fixture organization update did not affect exactly one row");
  }
  try {
    const publicClient = client();
    need(good(await publicClient.rpc("kl_enterprise_ready"), "Readiness request failed") === true, "Database is not ready");
    const settings = await fetch(stagingOrigin + "/auth/v1/settings", { headers: { apikey: env.SUPABASE_ANON_KEY }, signal: AbortSignal.timeout(12000) });
    need(settings.ok && (await settings.json()).disable_signup === true, "Public signup must be disabled");
    pass("readiness and closed public signup");
    stage = "real MFA enrollment";
    for (const label of ["ownerA", "ownerB", "operator", "reviewer"]) {
      const actor = { email: `acceptance-${run}-${label.toLowerCase()}@example.invalid`, password: randomBytes(32).toString("base64url"), client: client() };
      const created = good(await operations.auth.admin.createUser({ email: actor.email, password: actor.password, email_confirm: true,
        app_metadata: { acceptance_run: run } }), "Fixture Auth user creation failed");
      actor.id = created.user.id;
      users.push(actor);
      good(await actor.client.auth.signInWithPassword({ email: actor.email, password: actor.password }), "Fixture password sign-in failed");
      need(good(await actor.client.from("kl_assurance_programs").select("id"), "AAL1 read failed").length === 0, "AAL1 exposed company data");
      const factor = good(await actor.client.auth.mfa.enroll({ factorType: "totp", friendlyName: "Staging acceptance" }), "TOTP enrollment failed");
      actor.factorId = factor.id;
      actor.totpSecret = factor.totp.secret;
      good(await actor.client.auth.mfa.challengeAndVerify({ factorId: factor.id, code: totp(factor.totp.secret) }), "Real TOTP challenge failed");
      need(good(await actor.client.auth.mfa.getAuthenticatorAssuranceLevel(), "Assurance check failed").currentLevel === "aal2", "Current MFA assurance is not AAL2");
    }
    pass("four real password and TOTP sessions");
    const [ownerA, ownerB, operator, reviewer] = users;
    stage = "company provisioning and invitations";
    for (const owner of [ownerA, ownerB]) {
      const id = good(await operations.rpc("kl_provision_organization", { p_name: `Acceptance fixture ${run} ${organizations.length + 1}`, p_owner: owner.id }), "Fixture provisioning failed");
      organizations.push(id);
    }
    const [orgA, orgB] = organizations;
    for (const [actor, role] of [[operator, "editor"], [reviewer, "reviewer"]]) {
      const token = good(await rpc(ownerA, "kl_create_org_invite", { p_org: orgA, p_email: actor.email, p_role: role }), "Invitation creation failed");
      denied(await rpc(ownerB, "kl_accept_org_invite", { p_token: token }), /unavailable/i, "Email mismatch was not rejected");
      need(good(await rpc(actor, "kl_accept_org_invite", { p_token: token }), "Invitation acceptance failed") === orgA, "Invitation joined wrong organization");
      denied(await rpc(actor, "kl_accept_org_invite", { p_token: token }), /unavailable/i, "Invitation replay was not rejected");
    }
    denied(await rpc(ownerA, "kl_set_org_member", { p_org: orgA, p_user: ownerA.id, p_role: "owner", p_active: false }), /last owner/i, "Last owner removal was not rejected");
    pass("email-bound single-use invitations and last-owner protection");
    stage = "tenant isolation and write permissions";
    const today = new Date().toISOString().slice(0, 10);
    const workspace = { format: "TraceSworn Assurance v1", name: "Synthetic acceptance program", owner: ownerA.id, freshnessDays: 90,
      evidence: [{ id: "E1", title: "Synthetic evidence", reference: "https://example.invalid/proof", sha256: "", observedAt: today }],
      risks: [{ id: "R1", title: "Synthetic risk", owner: operator.id, likelihood: 3, impact: 3, controlEffectiveness: 50, control: "Review", assessed: true, evidenceIds: ["E1"] }],
      actions: [{ id: "A1", riskId: "R1", title: "Synthetic action", owner: operator.id, dueDate: today, status: "open", dependsOn: [], evidenceIds: ["E1"], reviewer: "", resolution: "", completedAt: null, recurrenceDays: 0, series: "", cycle: 0 }] };
    const save = (actor, id, expected) => rpc(actor, "kl_company_save", { p_org: orgA, p_id: id, p_expected: expected, p_workspace: workspace, p_reason: "Isolated automated acceptance" });
    const program = good(await save(operator, null, 0), "Editor program creation failed")[0].id;
    good(await rpc(ownerB, "kl_company_save", { p_org: orgB, p_id: null, p_expected: 0,
      p_workspace: { ...workspace, owner: ownerB.id, risks: [], actions: [] }, p_reason: "Second synthetic tenant" }), "Second tenant creation failed");
    const orgs = good(await ownerA.client.from("kl_organizations").select("id"), "Owner tenant read failed");
    need(orgs.length === 1 && orgs[0].id === orgA, "Wrong organization visibility");
    need(good(await ownerB.client.from("kl_assurance_programs").select("id").eq("id", program), "Foreign program read failed").length === 0, "Foreign program exposed");
    denied(await save(ownerB, program, 1), /access denied/i, "Cross-tenant RPC write was not rejected");
    denied(await operator.client.from("kl_assurance_programs").update({ name: "Forged" }).eq("id", program), /permission denied/i, "Direct DML was not rejected");
    denied(await save(operator, program, 0), /revision conflict/i, "Stale write was not rejected");
    pass("populated tenant isolation, direct DML denial and stale revisions");
    stage = "five roles and independent review";
    workspace.actions[0].status = "in_progress";
    good(await save(operator, program, 1), "Editor progression failed");
    workspace.actions[0].status = "review";
    good(await save(ownerA, program, 2), "Owner review submission failed");
    const approve = actor => rpc(actor, "kl_company_approve_action", { p_org: orgA, p_program: program, p_revision: 3, p_action: "A1", p_resolution: "Synthetic evidence reviewed" });
    denied(await approve(operator), /access denied/i, "Editor approval was not rejected");
    denied(await approve(ownerA), /different authenticated reviewer/i, "Self approval was not rejected");
    good(await approve(reviewer), "Independent reviewer approval failed");
    const setRole = role => rpc(ownerA, "kl_set_org_member", { p_org: orgA, p_user: operator.id, p_role: role, p_active: true });
    good(await setRole("viewer"), "Viewer assignment failed");
    denied(await save(operator, program, 4), /access denied/i, "Viewer write was not rejected");
    good(await setRole("admin"), "Admin assignment failed");
    good(await rpc(operator, "kl_org_directory", { p_org: orgA }), "Admin directory read failed");
    const current = good(await operator.client.from("kl_assurance_programs").select("workspace").eq("id", program).single(), "Admin read failed");
    good(await rpc(operator, "kl_company_save", { p_org: orgA, p_id: program, p_expected: 4, p_workspace: current.workspace, p_reason: "Admin acceptance revision" }), "Admin audited save failed");
    good(await setRole("editor"), "Editor reassignment failed");
    pass("owner, admin, editor, reviewer and viewer roles; independent action approval");
    stage = "session renewal and fresh authentication";
    good(await ownerA.client.auth.refreshSession(), "Session refresh failed");
    need(good(await ownerA.client.auth.mfa.getAuthenticatorAssuranceLevel(), "Refreshed assurance check failed").currentLevel === "aal2", "Refresh lost MFA assurance");
    good(await ownerA.client.auth.signOut({ scope: "global" }), "Logout failed");
    good(await ownerA.client.auth.signInWithPassword({ email: ownerA.email, password: ownerA.password }), "Fresh password sign-in failed");
    need(good(await ownerA.client.from("kl_assurance_programs").select("id"), "Fresh AAL1 read failed").length === 0, "Fresh password session bypassed MFA");
    await new Promise(resolve => setTimeout(resolve, 31000 - Date.now() % 30000));
    good(await ownerA.client.auth.mfa.challengeAndVerify({ factorId: ownerA.factorId, code: totp(ownerA.totpSecret) }), "Fresh MFA challenge failed");
    need(good(await ownerA.client.from("kl_assurance_programs").select("revision").eq("id", program).single(), "Fresh authenticated readback failed").revision === 5, "Audited revision did not persist");
    pass("refresh, global logout, fresh MFA and saved revision readback");
    stage = "quotas, expiry and revocation";
    await patchOrganization(orgA, { max_members: 3, max_programs: 1 });
    denied(await save(operator, null, 0), /program quota/i, "Program quota was not enforced");
    const seatToken = good(await rpc(ownerA, "kl_create_org_invite", { p_org: orgA, p_email: ownerB.email, p_role: "viewer" }), "Seat-test invitation creation failed");
    denied(await rpc(ownerB, "kl_accept_org_invite", { p_token: seatToken }), /seat limit/i, "Seat quota was not enforced");
    await patchOrganization(orgA, { access_until: new Date(Date.now() - 60000).toISOString() });
    need(good(await ownerA.client.from("kl_assurance_programs").select("id").eq("id", program), "Expired read failed").length === 1, "Expiry removed authorized reads");
    denied(await save(operator, program, 5), /read-only/i, "Expired company accepted a write");
    good(await rpc(ownerA, "kl_set_org_member", { p_org: orgA, p_user: operator.id, p_role: "editor", p_active: false }), "Expired-company revocation failed");
    need(good(await operator.client.from("kl_assurance_programs").select("id"), "Revoked member read failed").length === 0, "Revoked member retained access");
    pass("program and seat quotas, expired read-only access and member revocation");
  } catch {
    failed = true;
    console.error(JSON.stringify({ status: "failed", stage, diagnostic: "Provider details and secrets intentionally omitted" }));
  } finally {
    // Disable fixtures made by this run. Preserve all immutable evidence.
    for (const id of organizations) {
      try {
        await patchOrganization(id, { entitlement: "suspended", access_until: new Date(Date.now() - 60000).toISOString() });
        const members = good(await operations.from("kl_org_members").update({ active: false }).eq("organization_id", id).in("user_id", users.map(user => user.id)).select("user_id"), "Fixture membership disable failed");
        need(members.length >= 1, "Fixture memberships were not disabled");
      } catch { cleanupFailed = true; }
    }
    for (const actor of users) {
      try { await actor.client.auth.signOut({ scope: "global" }); } catch { /* Privileged ban must still run. */ }
      try {
        const result = good(await operations.auth.admin.updateUserById(actor.id, { ban_duration: "876000h", password: randomBytes(32).toString("base64url") }), "Fixture ban failed");
        need(result.user.id === actor.id, "Wrong fixture user returned");
      } catch { cleanupFailed = true; }
    }
  }
  const report = { status: failed || cleanupFailed ? "failed" : "passed", scope: "live staging Auth/API, not browser, SSO or production recovery", run, checks, fixtureUsers: users.length, fixtureOrganizations: organizations.length,
    cleanup: cleanupFailed ? "manual attention required" : "fixture memberships disabled, companies suspended, accounts disabled; immutable evidence retained",
    outstanding: ["browser session acceptance", "JWT expiry timing", "report/storage quota and invitation-expiry acceptance", "SSO if contracted", "managed Supabase recovery"] };
  console.log(JSON.stringify(report));
  if (failed || cleanupFailed) process.exitCode = 1;
  return report;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { await runAcceptance(process.env); }
  catch { console.error("Staging acceptance refused: check the fixed staging target, confirmation and private operations credentials."); process.exitCode = 1; }
}
