import { createHash } from "node:crypto";
import { validDate } from "./assurance";
import type { EvidenceRequest } from "./companyPortfolio";

const text = (value: string) =>
  value
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");

/** RFC 5545 folds are limited by UTF-8 octets, not JavaScript character count. */
export function foldCalendarLine(value: string): string {
  let line = "",
    bytes = 0,
    result = "";
  const encoder = new TextEncoder();
  for (const character of value) {
    const length = encoder.encode(character).length;
    if (bytes + length > 75) {
      result += line + "\r\n";
      line = " ";
      bytes = 1;
    }
    line += character;
    bytes += length;
  }
  return result + line + "\r\n";
}

export function* deadlineCalendar(
  requests: EvidenceRequest[],
  organizationId: string,
  origin: string,
  generatedAt: string,
): Generator<string> {
  const base = new URL(origin);
  if (
    base.username ||
    base.password ||
    base.pathname !== "/" ||
    base.search ||
    base.hash ||
    !["http:", "https:"].includes(base.protocol) ||
    !/^[a-f0-9-]{36}$/i.test(organizationId) ||
    !Number.isFinite(Date.parse(generatedAt))
  )
    throw new Error("Invalid calendar context");
  const stamp = new Date(generatedAt)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
  for (const line of [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//TraceSworn//Deadline Snapshot//EN",
    "CALSCALE:GREGORIAN",
    "X-WR-CALNAME:TraceSworn deadlines",
  ])
    yield foldCalendarLine(line);
  for (const request of requests) {
    if (
      !validDate(request.dueDate) ||
      !/^[a-f0-9-]{36}$/i.test(request.programId) ||
      !Number.isSafeInteger(request.revision) ||
      request.revision < 1
    )
      throw new Error("Invalid saved calendar item");
    const uid = createHash("sha256")
      .update(`${organizationId}:${request.programId}:${request.actionId}`)
      .digest("hex");
    const lines = [
      "BEGIN:VEVENT",
      `UID:${uid}@tracesworn`,
      `DTSTAMP:${stamp}`,
      `SEQUENCE:${request.revision}`,
      `DTSTART;VALUE=DATE:${request.dueDate.replace(/-/g, "")}`,
      `SUMMARY:${text("Due: " + request.action)}`,
      `DESCRIPTION:${text(`${request.program}\nOwner: ${request.owner}\nSaved status: ${request.status}\nRevision: ${request.revision}\nDeadline snapshot; check the program for current work and approvals.`)}`,
      `URL:${base.origin}/workspace/${organizationId}/programs/${request.programId}`,
      "TRANSP:TRANSPARENT",
      "END:VEVENT",
    ];
    for (const line of lines) yield foldCalendarLine(line);
  }
  yield foldCalendarLine("END:VCALENDAR");
}
