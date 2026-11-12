"use server";
import { requireAdmin } from "@/lib/adminAuth";
import { persistAssurance } from "@/lib/assuranceStore";
import { revalidatePath } from "next/cache";
export async function saveProgram(
  id: string | null,
  revision: number,
  workspace: unknown,
  actor: string,
  reason: string,
) {
  await requireAdmin();
  const result = await persistAssurance(id, revision, workspace, actor, reason);
  if (result.id) {
    revalidatePath("/admin/assurance");
    revalidatePath(`/admin/assurance/${result.id}`);
  }
  return result;
}
