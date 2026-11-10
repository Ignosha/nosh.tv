import { db } from "@/lib/db";
import { AssuranceWorkspace } from "@/components/AssuranceWorkspace";
import { saveProgram } from "./actions";
export const dynamic = "force-dynamic";
export default async function Programs() {
  const client = db();
  if (!client)
    return (
      <div className="wrap" style={{ padding: 40 }}>
        <h1>Assurance setup</h1>
        <p>
          Configure Supabase and apply the schema for persistent workspaces and
          audit history.
        </p>
        <a href="/assurance">Try the local workspace</a>
      </div>
    );
  const { data, error } = await client
    .from("kl_assurance_programs")
    .select("id,name,revision,updated_at")
    .order("updated_at", { ascending: false })
    .limit(100);
  if (error) throw new Error("Apply the latest assurance schema");
  return (
    <div className="wrap" style={{ padding: "40px 0" }}>
      <a href="/admin">← Case desk</a>
      <h1>Company assurance programs</h1>
      <p>
        Operator-managed workspaces. Accountable owners and reviewers are
        declared identities; these are not separate authenticated company
        accounts.
      </p>
      {data?.map((p) => (
        <p key={p.id}>
          <a href={`/admin/assurance/${p.id}`}>{p.name}</a> · revision{" "}
          {p.revision} · {p.updated_at.slice(0, 10)}
        </p>
      ))}
      <h2>Create a program</h2>
      <AssuranceWorkspace persist={saveProgram} />
    </div>
  );
}
