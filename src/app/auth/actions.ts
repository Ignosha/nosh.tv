"use server";
import { requireMutationOrigin } from "@/lib/enterprise/origin";
import { sessionClient, requireSession } from "@/lib/enterprise/session";
import { appOrigin, safeNext } from "@/lib/enterprise/config";
import { redirect } from "next/navigation";
export async function signIn(form: FormData) {
  await requireMutationOrigin();
  const email = String(form.get("email") ?? "").trim(),
    password = String(form.get("password") ?? "");
  if (email.length > 254 || password.length > 1024 || !email || !password)
    return { error: "Enter your email and password" };
  try {
    const client = await sessionClient();
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error)
      return {
        error:
          "Sign-in failed. Check your credentials or contact your administrator.",
      };
  } catch {
    return { error: "Authentication is unavailable" };
  }
  redirect("/auth/mfa");
}
export async function startSso(form: FormData) {
  await requireMutationOrigin();
  const domain = String(form.get("domain") ?? "")
    .trim()
    .toLowerCase();
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain) || domain.length > 253)
    return { error: "Enter your company domain" };
  let destination: string;
  try {
    const client = await sessionClient();
    const { data, error } = await client.auth.signInWithSSO({
      domain,
      options: { redirectTo: appOrigin() + "/auth/callback" },
    });
    if (error || !data?.url)
      return {
        error: "Company SSO is unavailable. Contact your administrator.",
      };
    if (new URL(data.url).protocol !== "https:")
      throw new Error("Invalid provider redirect");
    destination = data.url;
  } catch {
    return { error: "Company SSO is unavailable" };
  }
  redirect(destination);
}
export async function enrollMfa() {
  await requireMutationOrigin();
  const { client } = await requireSession();
  const { data, error } = await client.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: "Company authenticator",
  });
  if (error)
    return {
      error:
        "Could not enroll authenticator. Remove abandoned factors through your identity administrator.",
    };
  return {
    factorId: data.id,
    qr:
      "data:image/svg+xml;charset=utf-8," +
      encodeURIComponent(data.totp.qr_code),
    secret: data.totp.secret,
  };
}
export async function verifyMfa(form: FormData) {
  await requireMutationOrigin();
  const { client } = await requireSession();
  const factorId = String(form.get("factorId") ?? ""),
    code = String(form.get("code") ?? "");
  if (!/^[0-9]{6}$/.test(code))
    return { error: "Enter the six-digit authenticator code" };
  const { error } = await client.auth.mfa.challengeAndVerify({
    factorId,
    code,
  });
  if (error) return { error: "Code verification failed" };
  redirect(safeNext(form.get("next")));
}
export async function signOut() {
  await requireMutationOrigin();
  const client = await sessionClient();
  await client.auth.signOut({ scope: "local" });
  redirect("/auth/sign-in");
}
