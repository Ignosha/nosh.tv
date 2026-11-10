import { createClient } from "@supabase/supabase-js";
const args = Object.fromEntries(
  process.argv.slice(2).map((s) => {
    const i = s.indexOf("=");
    return [s.slice(0, i), s.slice(i + 1)];
  }),
);
if (
  !process.env.SUPABASE_URL ||
  !process.env.SUPABASE_SERVICE_ROLE_KEY ||
  !args["--name"] ||
  !/^[a-f0-9-]{36}$/i.test(args["--owner-user-id"] ?? "")
) {
  console.error(
    "Set service credentials in the environment; use --name=Company --owner-user-id=VERIFIED_AUTH_USER_UUID",
  );
  process.exit(1);
}
const client = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);
const { data, error } = await client.rpc("kl_provision_organization", {
  p_name: args["--name"],
  p_owner: args["--owner-user-id"],
});
if (error) {
  console.error(
    "Provisioning failed. Verify the existing user, schema and service permissions.",
  );
  process.exit(1);
}
console.log(
  JSON.stringify({
    organizationId: data,
    entitlement: "trialing",
    next: "Owner signs in, enrolls MFA, and invites colleagues. Record a signed contract before activation.",
  }),
);
