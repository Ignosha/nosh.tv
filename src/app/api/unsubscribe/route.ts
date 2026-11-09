import { NextResponse } from "next/server";
import { unsubscribe } from "@/lib/unsubscribe";

export const dynamic = "force-dynamic";

// One-click unsubscribe (RFC 8058) from the List-Unsubscribe header.
export async function POST(req: Request) {
  const t = new URL(req.url).searchParams.get("t") ?? "";
  await unsubscribe(t);
  return NextResponse.json({ ok: true });
}
export async function GET(req: Request) {
  const t = new URL(req.url).searchParams.get("t") ?? "";
  return NextResponse.redirect(new URL(`/u/${encodeURIComponent(t)}`, req.url));
}
