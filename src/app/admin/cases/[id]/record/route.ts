import { NextResponse } from "next/server";
import { getCase, isUuid } from "@/lib/cases";
import { matterRecord } from "@/lib/record";

export const dynamic = "force-dynamic";

// The exact sealed record the exhibit pack cites, for filing or serving. Verify at /verify.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = isUuid(id) ? await getCase(id) : null;
  if (!c?.report) return NextResponse.json({ error: "No report for this matter yet." }, { status: 404 });
  const sealed = await matterRecord(c);
  return new NextResponse(JSON.stringify(sealed, null, 2), {
    headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="tracesworn-evidence-${c.id.slice(0, 8)}.json"` },
  });
}
