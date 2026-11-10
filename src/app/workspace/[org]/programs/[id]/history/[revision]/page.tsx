import { requireOrganization } from "@/lib/enterprise/session";
import { parseAssurance } from "@/lib/assurance";
import { AssuranceWorkspace } from "@/components/AssuranceWorkspace";
import { notFound } from "next/navigation";
export default async function History({
  params,
}: {
  params: Promise<{ org: string; id: string; revision: string }>;
}) {
  const { org, id, revision } = await params;
  const { client, user } = await requireOrganization(org);
  const n = Number(revision);
  if (!Number.isSafeInteger(n) || n < 1) notFound();
  const { data, error } = await client
    .from("kl_assurance_history")
    .select("*")
    .eq("organization_id", org)
    .eq("program_id", id)
    .eq("revision", n)
    .maybeSingle();
  if (error) throw new Error("History unavailable");
  if (!data) notFound();
  return (
    <>
      <a href={`/workspace/${org}/programs/${id}`}>← Current program</a>
      <h1>Preserved revision {n}</h1>
      <p>
        {data.actor_id} · {data.reason} · {data.recorded_at}
      </p>
      <AssuranceWorkspace
        key={`${id}-${n}`}
        initial={parseAssurance(data.workspace)}
        initialRevision={n}
        evaluationDate={data.recorded_at.slice(0, 10)}
        verifiedActor={user.email}
        allowLocalCompletion={false}
        readOnly
      />
    </>
  );
}
