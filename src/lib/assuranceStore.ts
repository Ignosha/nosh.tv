import { db } from "./db";
import { isUuid } from "./cases";
import { parseAssurance, type Assurance } from "./assurance";
export type SaveResult = { id?: string; revision?: number; error?: string };
export async function loadAssurance(id: string) {
  const client = db();
  if (!client || !isUuid(id)) return null;
  const { data, error } = await client
    .from("kl_assurance_programs")
    .select("id,workspace,revision,updated_at")
    .eq("id", id)
    .is("organization_id",null)
    .maybeSingle();
  if (error) throw new Error("Could not read assurance workspace");
  return data ? { ...data, workspace: parseAssurance(data.workspace) } : null;
}
export async function persistAssurance(
  id: string | null,
  revision: number,
  input: unknown,
  actor: string,
  reason: string,
): Promise<SaveResult> {
  try {
    const client = db();
    if (!client)
      return {
        error: "Configure the database before saving a hosted workspace",
      };
    if (
      (id && !isUuid(id)) ||
      !Number.isSafeInteger(revision) ||
      revision < 0 ||
      !actor.trim() ||
      actor.length > 120 ||
      !reason.trim() ||
      reason.length > 2000
    )
      throw new Error("Valid revision, actor and change reason required");
    const workspace: Assurance = parseAssurance(input);
    if (new TextEncoder().encode(JSON.stringify(workspace)).length > 700000)
      throw new Error("Keep workspace JSON below 700 KB");
    const { data, error } = await client.rpc("kl_save_assurance", {
      p_id: id,
      p_expected: revision,
      p_workspace: workspace,
      p_actor: actor.trim(),
      p_reason: reason.trim(),
    });
    if (error)
      return {
        error: error.message.includes("Revision conflict")
          ? "Another save changed this workspace. Export your draft, reload, and reconcile before saving."
          : "Could not save workspace. Apply the latest schema and retry.",
      };
    return { id: data[0].id, revision: data[0].revision };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Workspace validation failed",
    };
  }
}
