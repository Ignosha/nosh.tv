import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/enterprise/session";
import { validateIssuedRecord } from "@/lib/reportStudio";
import { isUuid } from "@/lib/cases";
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ org: string; id: string }> },
) {
  const { org, id } = await params;
  const { client } = await requireOrganization(org);
  if (!isUuid(id))
    return NextResponse.json({ error: "Invalid report" }, { status: 400 });
  const { data, error } = await client
    .from("kl_org_reports")
    .select("sealed,reviewed_by,published_at")
    .eq("organization_id", org)
    .eq("id", id)
    .maybeSingle();
  if (error)
    return NextResponse.json({ error: "Report unavailable" }, { status: 503 });
  if (!data)
    return NextResponse.json({ error: "Report unavailable" }, { status: 404 });
  const issued = await validateIssuedRecord(data.sealed);
  return NextResponse.json(issued, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="company-report-${id}.json"`,
      "X-Publication-State": data.published_at ? "published" : "pending",
      "X-Reviewed-By": data.reviewed_by ?? "none",
    },
  });
}
