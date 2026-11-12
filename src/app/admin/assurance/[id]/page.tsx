import { notFound } from "next/navigation";
import { loadAssurance } from "@/lib/assuranceStore";
import { db } from "@/lib/db";
import { AssuranceWorkspace } from "@/components/AssuranceWorkspace";
import { saveProgram } from "../actions";
export const dynamic = "force-dynamic";
export default async function Program({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const program = await loadAssurance(id);
  if (!program) notFound();
  const { data: history, error } = await db()!
    .from("kl_assurance_history")
    .select("revision,actor,reason,recorded_at")
    .eq("program_id", id)
    .order("revision", { ascending: false })
    .limit(50);
  if (error) throw new Error("Could not read audit history");
  return (
    <div className="wrap" style={{ padding: "40px 0" }}>
      <a href="/admin/assurance">← Programs</a>
      <h1>{program.workspace.name}</h1>
      <AssuranceWorkspace
        key={program.id}
        initial={program.workspace}
        initialRevision={program.revision}
        programId={id}
        persist={saveProgram}
      />
      <section className="no-print form-card">
        <h2>Preserved audit history</h2>
        {history?.map((h) => (
          <p key={h.revision}>
            <a href={`/admin/assurance/${id}/history/${h.revision}`}>
              Revision {h.revision}
            </a>{" "}
            · {h.actor} · {h.recorded_at.slice(0, 16)} · {h.reason}
          </p>
        ))}
        <p className="fine">
          Actor names are administrator declarations. History is append-only
          through the application; this is not external notarization.
        </p>
      </section>
    </div>
  );
}
