import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { authConfig, secureCookies } from "./config";
export async function sessionClient() {
  const { url, key } = authConfig();
  const jar = await cookies();
  return createServerClient(url, key, {
    global: {
      fetch: (input, init) =>
        fetch(input, {
          ...init,
          signal: init?.signal ?? AbortSignal.timeout(12000),
        }),
    },
    cookieOptions: {
      httpOnly: true,
      secure: secureCookies(),
      sameSite: "lax",
      path: "/",
    },
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (values) => {
        try {
          values.forEach(({ name, value, options }) =>
            jar.set(name, value, {
              ...options,
              httpOnly: true,
              secure: secureCookies(),
              sameSite: "lax",
            }),
          );
        } catch {
          /* Server-component refresh is handled by proxy. */
        }
      },
    },
  });
}
export const verifiedSession = cache(async () => {
  const client = await sessionClient();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user || !data.user.email_confirmed_at) return null;
  const { data: assurance, error: aalError } =
    await client.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aalError || !assurance) return null;
  return { client, user: data.user, aal: assurance.currentLevel };
});
export async function requireSession() {
  const session = await verifiedSession();
  if (!session) redirect("/auth/sign-in");
  return session;
}
export async function requireMfa() {
  const session = await requireSession();
  if (session.aal !== "aal2") redirect("/auth/mfa");
  return session;
}
export async function requireOrganization(
  id: string,
  roles: string[] = ["owner", "admin", "editor", "reviewer", "viewer"],
) {
  const session = await requireMfa();
  const { data, error } = await session.client
    .from("kl_org_members")
    .select("role,organization_id")
    .eq("organization_id", id)
    .eq("user_id", session.user.id)
    .eq("active", true)
    .maybeSingle();
  if (error || !data || !roles.includes(data.role))
    throw new Error("Organization access denied");
  return { ...session, role: data.role, organizationId: id };
}
