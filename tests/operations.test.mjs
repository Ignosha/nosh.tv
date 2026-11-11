import test from "node:test";
import assert from "node:assert/strict";
import { runAcceptance, stagingOrigin, totp, validateConfig } from "../scripts/live-acceptance.mjs";

test("TOTP matches independent RFC 6238 SHA-1 standard vectors", () => {
  const secret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";
  for (const [seconds, expected] of [[59, "94287082"], [1111111109, "07081804"], [1111111111, "14050471"], [1234567890, "89005924"], [2000000000, "69279037"], [20000000000, "65353130"]])
    assert.equal(totp(secret, seconds * 1000, 8), expected);
  assert.equal(totp(secret, 59000), "287082");
  assert.throws(() => totp("not-a-secret"), /Invalid/);
});
test("production, URL tricks and missing credentials are rejected before network I/O", async () => {
  const base = { SUPABASE_URL: stagingOrigin, ACCEPTANCE_CONFIRMATION: "ISOLATED_STAGING_PROJECT", SUPABASE_ANON_KEY: "public-fixture-key-length-24", SUPABASE_SERVICE_ROLE_KEY: "private-fixture-key-length-24" };
  validateConfig(base);
  const original = globalThis.fetch;
  let requests = 0;
  globalThis.fetch = () => { requests++; throw Error("Unexpected network request"); };
  try {
    for (const url of ["https://xiurbiwuwcfowqnpmwki.supabase.co", stagingOrigin + ".attacker.invalid", stagingOrigin + "/", "https://attacker.invalid@bowpuebiycqbodkpwdcb.supabase.co", "http://localhost:3100"])
      await assert.rejects(runAcceptance({ ...base, SUPABASE_URL: url }), /confirmed staging/);
    await assert.rejects(runAcceptance({ ...base, ACCEPTANCE_CONFIRMATION: "" }), /confirmed staging/);
    await assert.rejects(runAcceptance({ ...base, SUPABASE_SERVICE_ROLE_KEY: "" }), /credentials/);
    assert.equal(requests, 0);
  } finally { globalThis.fetch = original; }
});
