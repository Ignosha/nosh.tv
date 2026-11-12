import { SECURITY_OVERVIEW } from "@/lib/securityOverview";
import { seal } from "@/lib/fingerprint";
export const dynamic = "force-dynamic";
export async function GET() {
  return new Response(
    JSON.stringify(
      await seal({
        ...SECURITY_OVERVIEW,
        generatedAt: new Date().toISOString(),
      }),
      null,
      2,
    ),
    {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition":
          'attachment; filename="tracesworn-security-overview.json"',
        "Cache-Control": "no-store",
      },
    },
  );
}
