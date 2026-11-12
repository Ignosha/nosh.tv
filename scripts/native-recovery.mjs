// Exercises real pg_dump/pg_restore + age using isolated, synthetic databases.
// This never reads live connection credentials or connects to a Supabase project.
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";

const image = "postgres:17-bookworm@sha256:665dc7b37ac52a17e298511414c21d23ffa4e6a6ef6225b3e5d59c7afb35e994";
const age = resolve(process.env.AGE_BINARY_PATH || "/usr/bin/age");
const keygen = resolve(process.env.AGE_KEYGEN_BINARY_PATH || "/usr/bin/age-keygen");
if (!existsSync(age) || !existsSync(keygen)) throw Error("Install age and age-keygen or set their binary paths");
const dir = mkdtempSync(join(tmpdir(), "nosh-recovery-"));
chmodSync(dir, 0o700);
const container = "nosh-recovery-" + randomUUID().slice(0, 8);
const dockerEnv = { ...process.env };
for (const key of ["DOCKER_HOST", "DOCKER_CONTEXT", "DOCKER_TLS", "DOCKER_TLS_VERIFY", "DOCKER_CERT_PATH"]) delete dockerEnv[key];
function docker(args, input, allowedFailure = false) {
  const p = spawnSync("docker", ["--host=unix:///var/run/docker.sock", ...args], { env: dockerEnv, input, encoding: "utf8", maxBuffer: 5e6 });
  if (p.error) throw Error("Docker execution failed: " + p.error.code);
  if (p.status !== 0 && !allowedFailure) throw Error("Disposable recovery operation failed: " + p.stderr.slice(0, 400));
  return p;
}
const sql = (database, text) => docker(["exec", "-i", container, "psql", "-U", "postgres", "-d", database, "-Atq", "-v", "ON_ERROR_STOP=1"], text).stdout.trim();
const literal = value => "'" + value.replaceAll("'", "''") + "'";
let started = false;
try {
  docker(["run", "--rm", "-d", "--name", container, "--network", "none", "-e", "POSTGRES_HOST_AUTH_METHOD=trust",
    "--mount", `type=bind,src=${dir},dst=/work`,
    "--mount", `type=bind,src=${age},dst=/usr/local/bin/age,readonly`,
    "--mount", `type=bind,src=${keygen},dst=/usr/local/bin/age-keygen,readonly`,
    "--mount", `type=bind,src=${resolve("scripts/backup.sh")},dst=/ops/backup.sh,readonly`,
    "--mount", `type=bind,src=${resolve("scripts/restore-drill.sh")},dst=/ops/restore-drill.sh,readonly`, image]);
  started = true;
  let ready = false;
  for (let i = 0; i < 80; i++) {
    const initialized = docker(["logs", container], undefined, true).stdout.includes("PostgreSQL init process complete");
    if (initialized && docker(["exec", container, "pg_isready", "-U", "postgres"], undefined, true).status === 0) { ready = true; break; }
    await new Promise(r => setTimeout(r, 250));
  }
  assert.ok(ready, "Disposable Postgres did not start");
  for (const database of ["kl_source", "kl_restore", "kl_failed"]) docker(["exec", container, "createdb", "-U", "postgres", database]);
  const fixture = readFileSync("tests/enterprise.cjs", "utf8").match(/`(create role anon;[^`]+)`/s)?.[1];
  assert.ok(fixture);
  sql("kl_source", fixture + "\n" + readFileSync("supabase/company-setup.sql", "utf8"));
  const owners = [randomUUID(), randomUUID()];
  const organizations = [];
  for (let i = 0; i < owners.length; i++) {
    sql("kl_source", `insert into auth.users values(${literal(owners[i])},'fixture${i}@example.invalid',now());`);
    const organization = sql("kl_source", `select kl_provision_organization('Recovery fixture ${i}',${literal(owners[i])});`);
    organizations.push(organization);
    const workspace = { format: "TraceSworn Assurance v1", name: "Recovery sample " + i, owner: owners[i], freshnessDays: 90, evidence: [], risks: [], actions: [] };
    sql("kl_source", `select set_config('request.jwt.claims',${literal(JSON.stringify({ sub: owners[i], aal: "aal2" }))},false);set role authenticated;select * from kl_company_save(${literal(organization)},null,0,${literal(JSON.stringify(workspace))},'Synthetic recovery fixture');`);
  }
  const tables = JSON.parse(sql("kl_source", "select json_agg(tablename order by tablename) from pg_tables where schemaname='public' and tablename like 'kl_%';"));
  function snapshot(database) {
    return tables.map(table => JSON.parse(sql(database, `select json_build_object('table',${literal(table)},'rows',count(*),'sha256',encode(sha256(convert_to(coalesce(string_agg(row_to_json(x)::text,E'\\n' order by row_to_json(x)::text),''),'UTF8')),'hex')) from public.${table} x;`)));
  }
  const original = snapshot("kl_source");
  writeFileSync(join(dir, "pg_service.conf"), "[isolated]\nhost=/var/run/postgresql\nuser=postgres\ndbname=kl_restore\n[source]\nhost=/var/run/postgresql\nuser=postgres\ndbname=kl_source\n[failed]\nhost=/var/run/postgresql\nuser=postgres\ndbname=kl_failed\n", { mode: 0o600 });
  docker(["exec", container, "age-keygen", "-o", "/work/identity.txt"]);
  const recipient = docker(["exec", container, "age-keygen", "-y", "/work/identity.txt"]).stdout.trim();
  const backupEnv = ["-e", "PGSERVICEFILE=/work/pg_service.conf", "-e", "BACKUP_PG_SERVICE=source", "-e", `BACKUP_AGE_RECIPIENT=${recipient}`, "-e", "BACKUP_OUTPUT=/work/backup.age"];
  docker(["exec", container, "age", "--version"]);
  docker(["exec", ...backupEnv, container, "bash", "/ops/backup.sh"]);
  docker(["exec", container, "chown", `${process.getuid()}:${process.getgid()}`, "/work/backup.age"]);
  assert.equal(statSync(join(dir, "backup.age")).mode & 0o777, 0o600);
  const repeat = docker(["exec", ...backupEnv, container, "bash", "/ops/backup.sh"], undefined, true);
  assert.notEqual(repeat.status, 0, "Existing archive must not be overwritten");
  const restore = (service, file = "backup.age") => ["exec", "-e", "BACKUP_PG_SERVICE=source", "-e", "PGSERVICEFILE=/work/pg_service.conf", "-e", `RESTORE_PG_SERVICE=${service}`, "-e", `BACKUP_INPUT=/work/${file}`, "-e", "BACKUP_AGE_IDENTITY_FILE=/work/identity.txt", "-e", "RESTORE_CONFIRMATION=ISOLATED_DISPOSABLE_DATABASE", container, "bash", "/ops/restore-drill.sh"];
  assert.notEqual(docker(restore("source"), undefined, true).status, 0, "Restoring into the source must be refused");
  const startedAt = Date.now();
  const damaged = readFileSync(join(dir, "backup.age"));
  damaged[damaged.length - 1] ^= 1;
  writeFileSync(join(dir, "damaged.age"), damaged, { mode: 0o600 });
  assert.notEqual(docker(restore("failed", "damaged.age"), undefined, true).status, 0, "Unauthenticated archive must be rejected");
  assert.equal(sql("kl_failed", "select count(*) from pg_tables where schemaname in ('public','auth');"), "0", "Damaged archive must not start a restore");
  docker(restore("isolated"));
  assert.deepEqual(snapshot("kl_restore"), original);
  assert.equal(sql("kl_restore", "select kl_enterprise_ready();"), "t");
  assert.equal(sql("kl_restore", "select has_function_privilege('anon','kl_provision_organization(text,uuid)','execute');"), "f");
  assert.equal(sql("kl_restore", "select has_function_privilege('anon','kl_company_save(uuid,uuid,integer,jsonb,text)','execute');"), "f");
  const count = sql("kl_restore", `set request.jwt.claims=${literal(JSON.stringify({ sub: owners[0], aal: "aal2" }))};set role authenticated;select count(*) from kl_assurance_programs;`);
  assert.equal(count, "1", "Restored RLS must expose only the caller's company");
  assert.notEqual(docker(restore("isolated"), undefined, true).status, 0, "Populated target must fail without --clean");
  assert.deepEqual(snapshot("kl_restore"), original, "Failed restore must roll back");
  const brokenBackup = docker(["exec", "-e", "PGSERVICEFILE=/work/pg_service.conf", "-e", "BACKUP_PG_SERVICE=missing_service", "-e", `BACKUP_AGE_RECIPIENT=${recipient}`, "-e", "BACKUP_OUTPUT=/work/incomplete.age", container, "bash", "/ops/backup.sh"], undefined, true);
  assert.notEqual(brokenBackup.status, 0);
  assert.equal(existsSync(join(dir, "incomplete.age")), false);
  assert.deepEqual(snapshot("kl_source"), original, "Source data must be unchanged");
  console.log(JSON.stringify({ status: "passed", scope: "synthetic native PostgreSQL recovery, not live Supabase", postgresImage: image, tables: original.length, organizations: 2, restoredPrograms: 2, restoreMilliseconds: Date.now() - startedAt, aclAndTenantIsolationPreserved: true, archiveMode: "0600", sourceAndOverwriteGuards: true, partialArchiveNotPublished: true, damagedArchiveRejectedBeforeRestore: true }));
} finally {
  if (started) docker(["rm", "-f", container], undefined, true);
  rmSync(dir, { recursive: true, force: true });
}
