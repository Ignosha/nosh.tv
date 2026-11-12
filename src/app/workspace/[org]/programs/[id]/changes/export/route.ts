import { loadProgramChanges } from "@/lib/enterprise/changes";
import { seal } from "@/lib/fingerprint";
export const dynamic = "force-dynamic";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ org: string; id: string }> },
) {
  const { org, id } = await params,
    search = new URL(request.url).searchParams;
  const report = await loadProgramChanges(
    org,
    id,
    search.get("from"),
    search.get("to"),
  );
  const record = {
    format: "TraceSworn Change Report v1",
    generatedAt: new Date().toISOString(),
    organizationId: org,
    programId: id,
    programName: report.program.name,
    sources: { before: report.before, after: report.after },
    comparison: report.comparison,
    note: "Comparison of preserved program revisions, evaluated on the same UTC date. This does not create an approval; a fingerprint establishes integrity, not factual accuracy.",
  };
  return new Response(JSON.stringify(await seal(record), null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="tracesworn-changes-${report.from}-${report.to}.json"`,
      "Cache-Control": "private, no-store",
    },
  });
}
