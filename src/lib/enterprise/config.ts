export function authConfig() {
  const url = process.env.SUPABASE_URL,
    key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Company authentication is not configured");
  if (
    key === process.env.SUPABASE_SERVICE_ROLE_KEY ||
    key.startsWith("sb_secret_")
  )
    throw new Error("A public Supabase key is required for user sessions");
  const parsed = new URL(url);
  if (
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash ||
    (parsed.protocol !== "https:" &&
      !["localhost", "127.0.0.1"].includes(parsed.hostname))
  )
    throw new Error("Invalid identity service origin");
  return { url, key };
}
export function appOrigin() {
  const value = process.env.APP_ORIGIN;
  if (!value) throw new Error("APP_ORIGIN is required");
  const url = new URL(value);
  if (
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  )
    throw new Error("APP_ORIGIN must be a bare origin");
  if (
    url.protocol !== "https:" &&
    !["localhost", "127.0.0.1"].includes(url.hostname)
  )
    throw new Error("HTTPS required");
  return url.origin;
}
export function safeNext(value: unknown) {
  return typeof value === "string" &&
    /^\/workspace(?:\/|$)/.test(value) &&
    !value.includes("\\") &&
    !/[\r\n]/.test(value)
    ? value
    : "/workspace";
}
export function secureCookies() {
  return new URL(appOrigin()).protocol === "https:";
}
