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
  !args["--org"] ||
  !args["--signed-reference"] ||
  !args["--until"]
) {
  console.error(
    "Set service credentials; provide --org=UUID --signed-reference=CONTRACT_ID --until=ISO_DATE --seats=N --programs=N. Only run after confirming the contract and billing outside the app.",
  );
  process.exit(1);
}
const client = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);
const { error } = await client.rpc("kl_activate_contract", {
  p_org: args["--org"],
  p_reference: args["--signed-reference"],
  p_until: args["--until"],
  p_seats: Number(args["--seats"] ?? 10),
  p_programs: Number(args["--programs"] ?? 5),
});
if (error) {
  console.error(
    "Activation rejected. Check contract dates, quota and permissions.",
  );
  process.exit(1);
}
console.log(
  "Contract activation recorded. No payment was charged by this command.",
);
