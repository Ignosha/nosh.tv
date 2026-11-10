import { getCase } from "@/lib/cases";
import { db } from "@/lib/db";
import { validateIssuedRecord } from "@/lib/reportStudio";
import { notFound, redirect } from "next/navigation";
export const dynamic = "force-dynamic";
async function archive(form: FormData) {
  "use server";
  const id = String(form.get("id"));
  const c = await getCase(id);
  if (!c) notFound();
  const file = form.get("record");
  if (!(file instanceof File) || file.size > 900000)
    throw new Error("Choose an issued JSON record smaller than 900 KB");
  const issued = await validateIssuedRecord(JSON.parse(await file.text()));
  const { data: version, error } = await db()!.rpc("kl_archive_report", {
    p_case: id,
    p_sealed: issued,
  });
  if (error)
    throw new Error(
      "Could not archive this report; apply the latest schema and retry",
    );
  redirect(`/admin/cases/${id}/reports/${version}`);
}
export default async function Reports({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const c = await getCase(id);
  if (!c) notFound();
  const { data, error } = await db()!
    .from("kl_report_versions")
    .select("version,issued_at,archived_at,author,reviewer,fingerprint")
    .eq("case_id", id)
    .order("version", { ascending: false });
  return (
    <div className="wrap" style={{ padding: 40 }}>
      <a href={`/admin/cases/${id}`}>← Matter</a>
      <h1>Issued reports · {c.name}</h1>
      <p>
        Archive reviewed records from{" "}
        <a href="/report-builder">Report Studio</a>. Each archived version
        preserves its original content and fingerprint. Author and reviewer
        names are declared, not authenticated signatures.
      </p>
      {error ? (
        <p className="notice warn">
          Apply the latest database schema to enable report archives.
        </p>
      ) : (
        <>
          <form action={archive} className="form-card">
            <input type="hidden" name="id" value={id} />
            <label>
              Issued JSON record (up to 900 KB)
              <input
                type="file"
                name="record"
                accept=".json,application/json"
                required
              />
            </label>
            <p className="fine">
              Confirm the document belongs to this matter before archiving.
              Imported reports are not automatically sent to the client.
            </p>
            <button className="btn">Verify &amp; archive</button>
          </form>
          {data?.map((v) => (
            <article className="form-card" key={v.version}>
              <h2>
                <a href={`/admin/cases/${id}/reports/${v.version}`}>
                  Archive version {v.version}
                </a>
              </h2>
              <p>
                Issued {v.issued_at.slice(0, 10)} · {v.author} · Reviewer:{" "}
                {v.reviewer}
              </p>
              <p className="mono" style={{ overflowWrap: "anywhere" }}>
                {v.fingerprint}
              </p>
            </article>
          ))}
        </>
      )}
    </div>
  );
}
