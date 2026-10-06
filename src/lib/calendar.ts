import { businessConfig, googleConfig } from "./config";
import {
  addDays,
  compareDates,
  formatLocalDate,
  humanLabel,
  localDateOf,
  parseHours,
  parseLocalDate,
  weekdayOf,
  zonedToUtc,
} from "./time";

let cachedToken: { value: string; expiresAt: number } | null = null;

async function accessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;
  const g = googleConfig();
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: g.clientId,
      client_secret: g.clientSecret,
      refresh_token: g.refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`Google token refresh failed: ${res.status} ${await res.text()}`);
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
  return json.access_token;
}

async function calendarFetch(path: string, init: RequestInit): Promise<unknown> {
  const res = await fetch(`https://www.googleapis.com/calendar/v3${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${await accessToken()}`, "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`Google Calendar ${path} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

export type Slot = { start: string; label: string };

/** Open slots between two local dates (inclusive), from business hours minus real calendar busy times. */
export async function availableSlots(fromDate?: string, toDate?: string): Promise<Slot[]> {
  const b = businessConfig();
  const tz = b.timezone;
  const now = new Date();
  const today = localDateOf(now, tz);
  const lastAllowed = addDays(today, b.bookingWindowDays);

  let from = (fromDate && parseLocalDate(fromDate)) || today;
  let to = (toDate && parseLocalDate(toDate)) || addDays(from, 6);
  if (compareDates(from, today) < 0) from = today;
  if (compareDates(to, lastAllowed) > 0) to = lastAllowed;
  if (compareDates(from, to) > 0) return [];

  const blocks = parseHours(b.hours);
  const earliest = now.getTime() + b.minNoticeHours * 3_600_000;
  const stepMs = b.appointmentMinutes * 60_000;

  const candidates: { start: Date; end: Date }[] = [];
  for (let d = from; compareDates(d, to) <= 0; d = addDays(d, 1)) {
    const weekday = weekdayOf(d);
    for (const block of blocks) {
      if (!block.days.has(weekday)) continue;
      for (let m = block.startMin; m + b.appointmentMinutes <= block.endMin; m += b.appointmentMinutes) {
        const start = zonedToUtc(d, Math.floor(m / 60), m % 60, tz);
        if (start.getTime() < earliest) continue;
        candidates.push({ start, end: new Date(start.getTime() + stepMs) });
      }
    }
  }
  if (candidates.length === 0) return [];

  const g = googleConfig();
  const fb = (await calendarFetch("/freeBusy", {
    method: "POST",
    body: JSON.stringify({
      timeMin: candidates[0].start.toISOString(),
      timeMax: candidates[candidates.length - 1].end.toISOString(),
      items: [{ id: g.calendarId }],
    }),
  })) as { calendars: Record<string, { busy?: { start: string; end: string }[]; errors?: unknown[] }> };

  const cal = fb.calendars[g.calendarId];
  if (!cal || cal.errors?.length) throw new Error(`Calendar ${g.calendarId} is not readable: ${JSON.stringify(cal?.errors)}`);
  const busy = (cal.busy ?? []).map((x) => ({ start: Date.parse(x.start), end: Date.parse(x.end) }));

  return candidates
    .filter((c) => !busy.some((x) => c.start.getTime() < x.end && x.start < c.end.getTime()))
    .map((c) => ({ start: c.start.toISOString(), label: humanLabel(c.start, tz) }));
}

export async function createAppointment(input: {
  start: string;
  name: string;
  email: string;
  phone?: string;
  need?: string;
}): Promise<{ eventId: string; label: string }> {
  const b = businessConfig();
  const g = googleConfig();

  // Re-check against live availability so a stale or invented time can never be booked.
  const day = formatLocalDate(localDateOf(new Date(input.start), b.timezone));
  const open = await availableSlots(day, day);
  const slot = open.find((s) => Date.parse(s.start) === Date.parse(input.start));
  if (!slot) throw new SlotUnavailableError();

  const start = new Date(slot.start);
  const end = new Date(start.getTime() + b.appointmentMinutes * 60_000);
  const description = [
    `Booked by the ${b.name} website assistant.`,
    `Name: ${input.name}`,
    `Email: ${input.email}`,
    input.phone ? `Phone: ${input.phone}` : null,
    input.need ? `Request: ${input.need}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const event = (await calendarFetch(`/calendars/${encodeURIComponent(g.calendarId)}/events?sendUpdates=all`, {
    method: "POST",
    body: JSON.stringify({
      summary: `${b.name}: ${input.name}`,
      description,
      start: { dateTime: start.toISOString(), timeZone: b.timezone },
      end: { dateTime: end.toISOString(), timeZone: b.timezone },
      attendees: [{ email: input.email, displayName: input.name }],
    }),
  })) as { id: string };

  return { eventId: event.id, label: slot.label };
}

export class SlotUnavailableError extends Error {
  constructor() {
    super("That time is no longer available.");
  }
}
