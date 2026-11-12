import { notFound } from "next/navigation";
import { loadCompanyPortfolio } from "@/lib/enterprise/portfolio";
import {
  evidenceRequestCsvLines,
  PORTFOLIO_PAGE_SIZE,
  portfolioPage,
} from "@/lib/companyPortfolio";
import { seal } from "@/lib/fingerprint";
import { deadlineCalendar } from "@/lib/deadlineCalendar";
import { appOrigin } from "@/lib/enterprise/config";

export const dynamic = "force-dynamic";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ org: string }> },
) {
  const { org } = await params;
  const url = new URL(request.url),
    page = portfolioPage(url.searchParams.get("page"));
  const format = url.searchParams.get("format");
  if (format !== "csv" && format !== "json" && format !== "ics")
    return new Response("Choose csv, json or ics", { status: 400 });
  const { organization, result, totalPrograms } = await loadCompanyPortfolio(
    org,
    page,
  );
  if (page > Math.max(1, Math.ceil(totalPrograms / PORTFOLIO_PAGE_SIZE)))
    notFound();
  const record = {
    format: "TraceSworn Management Brief v1",
    generatedAt: new Date().toISOString(),
    organization: { id: organization.id, name: organization.name },
    evaluatedOn: result.evaluatedOn,
    scope: {
      page,
      pageSize: PORTFOLIO_PAGE_SIZE,
      includedPrograms: result.programs.length,
      totalPrograms,
      includedExceptions: result.exceptions.length,
      totalExceptionsOnPage: result.exceptionCount,
    },
    totals: result.totals,
    programs: result.programs,
    exceptions: result.exceptions,
    note: "Snapshot of saved program revisions. Scores reflect supplied judgments; a fingerprint establishes integrity, not approval, factual accuracy or compliance.",
  };
  const lines =
      format === "ics"
        ? deadlineCalendar(
            result.requests,
            org,
            appOrigin(),
            new Date().toISOString(),
          )
        : evidenceRequestCsvLines(result.requests),
    encoder = new TextEncoder();
  const content =
    format === "csv" || format === "ics"
      ? new ReadableStream<Uint8Array>({
          pull(controller) {
            const next = lines.next();
            if (next.done) controller.close();
            else controller.enqueue(encoder.encode(next.value));
          },
          cancel() {
            lines.return(undefined);
          },
        })
      : JSON.stringify(await seal(record), null, 2);
  return new Response(content, {
    headers: {
      "Content-Type":
        format === "ics"
          ? "text/calendar; charset=utf-8"
          : format === "csv"
            ? "text/csv; charset=utf-8"
            : "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="tracesworn-portfolio-page-${page}.${format}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
