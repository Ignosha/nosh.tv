import { companyProposal } from "@/lib/softwarePlans";
import { seal } from "@/lib/fingerprint";
import { appOrigin } from "@/lib/enterprise/config";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  const error = (message: string, status: number) =>
    new Response(message, {
      status,
      headers: { "Cache-Control": "private, no-store" },
    });
  const expectedOrigin = process.env.APP_ORIGIN
    ? appOrigin()
    : new URL(request.url).origin;
  if (request.headers.get("origin") !== expectedOrigin)
    return error("Request origin denied", 403);
  if (
    !request.headers
      .get("content-type")
      ?.startsWith("application/x-www-form-urlencoded")
  )
    return error("Submit the company scope form", 415);
  const reader = request.body?.getReader(),
    chunks: Uint8Array[] = [];
  let length = 0;
  try {
    if (reader)
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        length += value.byteLength;
        if (length > 8192) {
          await reader.cancel();
          return error("Keep the scope request below 8 KB", 413);
        }
        chunks.push(value);
      }
    const raw = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
      raw.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const fields = new URLSearchParams(new TextDecoder().decode(raw));
    const input = {
      seats: Number(fields.get("seats")),
      programs: Number(fields.get("programs")),
      hoursPerProgram: Number(fields.get("hours") || 0),
      hourlyCost: Number(fields.get("cost") || 0),
      timeReductionPercent: Number(fields.get("reduction") || 0),
    };
    const record = companyProposal(
      fields.get("company") || "",
      input,
      ["hours", "cost", "reduction"].every((key) =>
        Boolean(fields.get(key)?.trim()),
      ),
    );
    return new Response(JSON.stringify(await seal(record), null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition":
          'attachment; filename="tracesworn-company-proposal.json"',
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return error(
      "Check the company name, capacity and planning assumptions, then return to the form.",
      400,
    );
  } finally {
    reader?.releaseLock();
  }
}
