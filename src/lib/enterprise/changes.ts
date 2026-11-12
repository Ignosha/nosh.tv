import { notFound } from "next/navigation";
import { requireOrganization } from "./session";
import { comparePrograms, revisionNumber } from "../programChanges";

export async function loadProgramChanges(
  org: string,
  id: string,
  requestedFrom?: unknown,
  requestedTo?: unknown,
) {
  const { client } = await requireOrganization(org);
  const program = await client
    .from("kl_assurance_programs")
    .select("id,name,revision")
    .eq("organization_id", org)
    .eq("id", id)
    .maybeSingle();
  if (program.error) throw new Error("Program unavailable");
  if (!program.data) notFound();
  let from: number, to: number;
  try {
    to = revisionNumber(requestedTo, program.data.revision);
    from = revisionNumber(requestedFrom, Math.max(1, to - 1));
    if (from > to || to > program.data.revision) notFound();
  } catch {
    notFound();
  }
  const get = (revision: number) =>
    client
      .from("kl_assurance_history")
      .select("revision,workspace,actor_id,reason,recorded_at")
      .eq("organization_id", org)
      .eq("program_id", id)
      .eq("revision", revision)
      .maybeSingle();
  const [before, after] = await Promise.all([get(from), get(to)]);
  if (before.error || after.error)
    throw new Error("Revision history unavailable");
  if (!before.data || !after.data) notFound();
  const source = (row: NonNullable<typeof before.data>) => ({
    revision: row.revision as number,
    actorId: row.actor_id as string,
    reason: row.reason as string,
    recordedAt: row.recorded_at as string,
  });
  return {
    program: program.data,
    from,
    to,
    before: source(before.data),
    after: source(after.data),
    comparison: comparePrograms(
      before.data.workspace,
      after.data.workspace,
      new Date().toISOString().slice(0, 10),
    ),
  };
}
