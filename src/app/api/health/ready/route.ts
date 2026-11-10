import { NextResponse } from "next/server";
import {
  configurationProblems,
  databaseReady,
} from "@/lib/enterprise/readiness";
export const dynamic = "force-dynamic";
export async function GET() {
  let ready = false;
  try {
    ready = configurationProblems().length === 0 && (await databaseReady());
  } catch {}
  return NextResponse.json(
    { status: ready ? "ready" : "not_ready" },
    { status: ready ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
