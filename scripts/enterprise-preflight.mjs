import { createClient } from "@supabase/supabase-js";
const errors = [];
for (const key of ["APP_ORIGIN", "SUPABASE_URL", "SUPABASE_ANON_KEY"])
  if (!process.env[key]) errors.push(`${key} is missing`);
if (process.env.ENTERPRISE_MODE !== "1")
  errors.push("ENTERPRISE_MODE must be 1");
if (process.env.SUPABASE_SERVICE_ROLE_KEY)
  errors.push(
    "Remove service-role credentials from the enterprise web environment; use an isolated operations environment",
  );
try {
  const origin = new URL(process.env.APP_ORIGIN);
  if (
    origin.protocol !== "https:" ||
    origin.pathname !== "/" ||
    origin.username ||
    origin.password ||
    origin.search ||
    origin.hash
  )
    errors.push("APP_ORIGIN must be a bare HTTPS origin");
} catch {
  errors.push("APP_ORIGIN is invalid");
}
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
const service = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
  {
    auth: { persistSession: false },
    global: {
      fetch: (input, init) =>
        fetch(input, { ...init, signal: AbortSignal.timeout(12000) }),
    },
  },
);
const { data, error } = await service.rpc("kl_enterprise_ready");
if (error || data !== true) {
  console.error(
    "Enterprise database readiness failed. Apply both migrations and verify RLS/function permissions.",
  );
  process.exit(1);
}
console.log(
  "PASS configuration and database readiness. This does not certify IdP/MFA, backup restoration, operational staffing or compliance; complete RELEASE.md evidence before launch.",
);
