"use server";
import { requireMutationOrigin } from "@/lib/enterprise/origin";
import { requireMfa, requireOrganization } from "@/lib/enterprise/session";
import { newAssurance, parseAssurance } from "@/lib/assurance";
import { operationError } from "@/lib/enterprise/errors";
import { isUuid } from "@/lib/cases";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
export async function saveCompany(
  org: string,
  id: string | null,
  revision: number,
  workspace: unknown,
  _actor: string,
  reason: string,
) {
  await requireMutationOrigin();
  const { client } = await requireOrganization(org, [
    "owner",
    "admin",
    "editor",
  ]);
  try {
    if (
      (id && !isUuid(id)) ||
      !Number.isSafeInteger(revision) ||
      revision < 0 ||
      reason.length > 2000
    )
      throw new Error("Invalid workspace");
    const parsed = parseAssurance(workspace);
    const { data, error } = await client.rpc("kl_company_save", {
      p_org: org,
      p_id: id,
      p_expected: revision,
      p_workspace: parsed,
      p_reason: reason,
    });
    if (error) return operationError(error);
    revalidatePath(`/workspace/${org}`);
    if (id) revalidatePath(`/workspace/${org}/programs/${id}`);
    return { id: data[0].id as string, revision: data[0].revision as number };
  } catch (e) {
    return operationError(e);
  }
}
export async function createSampleProgram(org: string, _form: FormData) {
  await requireMutationOrigin();
  const { client, user } = await requireOrganization(org, [
    "owner",
    "admin",
    "editor",
  ]);
  const name = "First test program";
  const existing = await client
    .from("kl_assurance_programs")
    .select("id")
    .eq("organization_id", org)
    .eq("name", name)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (existing.error) return operationError(existing.error);
  let id = existing.data?.id as string | undefined;
  if (!id) {
    const saved = await saveCompany(
      org,
      null,
      0,
      { ...newAssurance(), name, owner: user.id },
      user.email ?? user.id,
      "Initial setup: create sample program",
    );
    if ("error" in saved) return saved;
    id = saved.id;
  }
  redirect(`/workspace/${org}/programs/${id}`);
}
export async function approveCompanyAction(org: string, form: FormData) {
  await requireMutationOrigin();
  const { client } = await requireOrganization(org, [
    "owner",
    "admin",
    "reviewer",
  ]);
  const id = String(form.get("program")),
    revision = Number(form.get("revision")),
    action = String(form.get("action")),
    resolution = String(form.get("resolution") ?? "");
  if (
    !isUuid(id) ||
    !Number.isSafeInteger(revision) ||
    resolution.length > 4000
  )
    return { error: "Invalid review request" };
  const { error } = await client.rpc("kl_company_approve_action", {
    p_org: org,
    p_program: id,
    p_revision: revision,
    p_action: action,
    p_resolution: resolution,
  });
  if (error) return operationError(error);
  revalidatePath(`/workspace/${org}/programs/${id}`);
  return { ok: true };
}
export async function inviteMember(org: string, form: FormData) {
  await requireMutationOrigin();
  const { client } = await requireOrganization(org, ["owner", "admin"]);
  const { data, error } = await client.rpc("kl_create_org_invite", {
    p_org: org,
    p_email: String(form.get("email") ?? ""),
    p_role: String(form.get("role") ?? ""),
  });
  if (error) return operationError(error);
  revalidatePath(`/workspace/${org}/members`);
  return { token: data as string };
}
export async function changeMember(org: string, form: FormData) {
  await requireMutationOrigin();
  const { client } = await requireOrganization(org, ["owner"]);
  const { error } = await client.rpc("kl_set_org_member", {
    p_org: org,
    p_user: String(form.get("user")),
    p_role: String(form.get("role")),
    p_active: form.get("active") === "on",
  });
  if (error) return operationError(error);
  revalidatePath(`/workspace/${org}/members`);
  return { ok: true };
}
export async function revokeInvite(org: string, form: FormData) {
  await requireMutationOrigin();
  const { client } = await requireOrganization(org, ["owner", "admin"]);
  const { error } = await client.rpc("kl_revoke_org_invite", {
    p_org: org,
    p_invite: String(form.get("invite")),
  });
  if (error) return operationError(error);
  revalidatePath(`/workspace/${org}/members`);
  return { ok: true };
}
export async function acceptInvite(form: FormData) {
  await requireMutationOrigin();
  const { client } = await requireMfa();
  const token = String(form.get("token") ?? "");
  if (!/^[a-f0-9]{64}$/.test(token))
    return { error: "Invalid invitation token" };
  const { data, error } = await client.rpc("kl_accept_org_invite", {
    p_token: token,
  });
  if (error) return operationError(error);
  redirect(`/workspace/${data}`);
}
export async function submitCompanyReport(org: string, form: FormData) {
  await requireMutationOrigin();
  const { client } = await requireOrganization(org, [
    "owner",
    "admin",
    "editor",
  ]);
  try {
    const file = form.get("report");
    if (!(file instanceof File) || file.size > 850000)
      return { error: "Choose an issued JSON record below 850 KB" };
    const { validateIssuedRecord } = await import("@/lib/reportStudio");
    const issued = await validateIssuedRecord(JSON.parse(await file.text()));
    const { error } = await client.rpc("kl_submit_org_report", {
      p_org: org,
      p_sealed: issued,
    });
    if (error) return operationError(error);
    revalidatePath(`/workspace/${org}/reports`);
    return { ok: true };
  } catch (e) {
    return operationError(e);
  }
}
export async function publishCompanyReport(org: string, form: FormData) {
  await requireMutationOrigin();
  const { client } = await requireOrganization(org, [
    "owner",
    "admin",
    "reviewer",
  ]);
  const id = String(form.get("report"));
  if (!isUuid(id)) return { error: "Invalid report" };
  const { error } = await client.rpc("kl_publish_org_report", {
    p_org: org,
    p_report: id,
  });
  if (error) return operationError(error);
  revalidatePath(`/workspace/${org}/reports`);
  return { ok: true };
}
