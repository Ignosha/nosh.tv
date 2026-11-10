import { loadAssurance } from "@/lib/assuranceStore";
import { db } from "@/lib/db";
import { isUuid } from "@/lib/cases";
import { parseAssurance } from "@/lib/assurance";
import { AssuranceWorkspace } from "@/components/AssuranceWorkspace";
import { notFound } from "next/navigation";
export const dynamic = "force-dynamic";
export default async function History({
  params,
}: {
  params: Promise<{ id: string; revision: string }>;
}) {
  const { id, revision } = await params;
  const n = Number(revision);
  const client = db();
  if (!client || !isUuid(id) || !Number.isSafeInteger(n) || n < 1) notFound();
  if(!await loadAssurance(id)) notFound();
  const { data, error } = await client
    .from("kl_assurance_history")
    .select("*")
    .eq("program_id", id)
    .eq("revision", n)
    .maybeSingle();
  if (error) throw new Error("Could not read snapshot");
  if (!data) notFound();
  return (
    <div className="wrap" style={{ padding: "40px 0" }}>
      <a href={`/admin/assurance/${id}`}>← Current workspace</a>
      <h1>Preserved revision {n}</h1>
      <p>
        {data.actor} · {data.recorded_at} · {data.reason}
      </p>
      <AssuranceWorkspace
        key={`${id}-${n}`}
        initial={parseAssurance(data.workspace)}
        initialRevision={n}
        evaluationDate={data.recorded_at.slice(0, 10)}
        readOnly
      />
    </div>
  );
}
