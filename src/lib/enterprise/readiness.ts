import { authConfig, appOrigin } from "./config";
export function configurationProblems(env = process.env): string[] {
  const problems: string[] = [];
  for (const key of ["SUPABASE_URL", "SUPABASE_ANON_KEY", "APP_ORIGIN"])
    if (!env[key]) problems.push(key + " missing");
  if (env.ENTERPRISE_MODE !== "1") problems.push("ENTERPRISE_MODE must be 1");
  if (env.SUPABASE_SERVICE_ROLE_KEY)
    problems.push(
      "Privileged service credentials must be absent from the enterprise web runtime",
    );
  if (env.APP_ORIGIN) {
    try {
      const url = new URL(env.APP_ORIGIN);
      if (url.protocol !== "https:")
        problems.push("APP_ORIGIN must use HTTPS for production");
      if (
        url.username ||
        url.password ||
        url.pathname !== "/" ||
        url.search ||
        url.hash
      )
        problems.push("APP_ORIGIN must be a bare origin");
    } catch {
      problems.push("APP_ORIGIN invalid");
    }
  }
  return problems;
}
export async function databaseReady() {
  const { url, key } = authConfig();
  appOrigin();
  const { createClient } = await import("@supabase/supabase-js");
  const client = createClient(url, key, {
    auth: { persistSession: false },
    global: {
      fetch: (input, init) =>
        fetch(input, { ...init, signal: AbortSignal.timeout(8000) }),
    },
  });
  const { data, error } = await client.rpc("kl_enterprise_ready");
  return !error && data === true;
}
