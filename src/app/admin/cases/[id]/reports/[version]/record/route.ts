import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isUuid } from "@/lib/cases";
import { validateIssuedRecord } from "@/lib/reportStudio";
export const dynamic = "force-dynamic";
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; version: string }> },
) {
  const { id, version } = await params;
  const n = Number(version);
  const client = db();
  if (!client)
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 503 },
    );
  if (!isUuid(id) || !Number.isSafeInteger(n) || n < 1)
    return NextResponse.json(
      { error: "Invalid archive reference" },
      { status: 400 },
    );
  const { data, error } = await client
    .from("kl_report_versions")
    .select("sealed")
    .eq("case_id", id)
    .eq("version", n)
    .maybeSingle();
  if (error)
    return NextResponse.json(
      { error: "Could not read archive" },
      { status: 503 },
    );
  if (!data)
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  const issued = await validateIssuedRecord(data.sealed);
  return NextResponse.json(issued, {
    headers: {
      "Content-Disposition": `attachment; filename="report-${id.slice(0, 8)}-archive-${n}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
