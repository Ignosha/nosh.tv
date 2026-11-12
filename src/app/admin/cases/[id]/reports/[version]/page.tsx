import { db } from "@/lib/db";
import { isUuid } from "@/lib/cases";
import { validateIssuedRecord } from "@/lib/reportStudio";
import { ReportPreview } from "@/components/ReportPreview";
import { PrintButton } from "@/components/PrintButton";
import { notFound } from "next/navigation";
export const dynamic = "force-dynamic";
export default async function Version({
  params,
}: {
  params: Promise<{ id: string; version: string }>;
}) {
  const { id, version } = await params;
  const n = Number(version);
  const client = db();
  if (!client || !isUuid(id) || !Number.isSafeInteger(n) || n < 1) notFound();
  const { data, error } = await client
    .from("kl_report_versions")
    .select("sealed")
    .eq("case_id", id)
    .eq("version", n)
    .maybeSingle();
  if (error) throw new Error("Report archive could not be read");
  if (!data) notFound();
  const issued = await validateIssuedRecord(data.sealed);
  return (
    <div className="wrap studio" style={{ display: "block", padding: 30 }}>
      <nav className="no-print studio-toolbar">
        <a href={`/admin/cases/${id}/reports`}>← Version archive</a>
        <a className="btn" href={`/admin/cases/${id}/reports/${n}/record`}>
          Download sealed record
        </a>
        <PrintButton />
      </nav>
      <ReportPreview
        document={issued.record.document}
        revision={issued.record.revision}
        fingerprint={issued.fingerprint.value}
      />
    </div>
  );
}
