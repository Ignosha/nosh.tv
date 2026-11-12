import { NextResponse } from "next/server";
import { sessionClient } from "@/lib/enterprise/session";
import { appOrigin, safeNext } from "@/lib/enterprise/config";
export async function GET(req: Request) {
  const url = new URL(req.url),
    code = url.searchParams.get("code");
  if (code) {
    const client = await sessionClient();
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (!error)
      return NextResponse.redirect(
        new URL(safeNext(url.searchParams.get("next")), appOrigin()),
      );
  }
  return NextResponse.redirect(
    new URL("/auth/sign-in?error=callback", appOrigin()),
  );
}
