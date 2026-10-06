// Timezone math with Intl only, so no date library is needed.

export type LocalDate = { year: number; month: number; day: number };

const DAY_NAMES = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

function partsIn(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)!.value);
  return { year: get("year"), month: get("month"), day: get("day"), hour: get("hour"), minute: get("minute"), second: get("second") };
}

function offsetMs(date: Date, timeZone: string): number {
  const p = partsIn(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** The UTC instant for a wall-clock time in `timeZone`. */
export function zonedToUtc(d: LocalDate, hour: number, minute: number, timeZone: string): Date {
  const guess = Date.UTC(d.year, d.month - 1, d.day, hour, minute);
  const first = offsetMs(new Date(guess), timeZone);
  const second = offsetMs(new Date(guess - first), timeZone);
  return new Date(guess - second);
}

export function localDateOf(date: Date, timeZone: string): LocalDate {
  const p = partsIn(date, timeZone);
  return { year: p.year, month: p.month, day: p.day };
}

export function addDays(d: LocalDate, days: number): LocalDate {
  const t = new Date(Date.UTC(d.year, d.month - 1, d.day + days));
  return { year: t.getUTCFullYear(), month: t.getUTCMonth() + 1, day: t.getUTCDate() };
}

export function weekdayOf(d: LocalDate): (typeof DAY_NAMES)[number] {
  return DAY_NAMES[new Date(Date.UTC(d.year, d.month - 1, d.day)).getUTCDay()];
}

export function compareDates(a: LocalDate, b: LocalDate): number {
  return Date.UTC(a.year, a.month - 1, a.day) - Date.UTC(b.year, b.month - 1, b.day);
}

export function parseLocalDate(s: string): LocalDate | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const d = { year: +m[1], month: +m[2], day: +m[3] };
  const check = addDays(d, 0);
  return check.year === d.year && check.month === d.month && check.day === d.day ? d : null;
}

export function formatLocalDate(d: LocalDate): string {
  return `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`;
}

export function humanLabel(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}

export type HoursBlock = { days: Set<string>; startMin: number; endMin: number };

/** Parses e.g. "mon-fri 09:00-17:00; sat 10:00-14:00". */
export function parseHours(spec: string): HoursBlock[] {
  return spec
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((block) => {
      const m = /^([a-z,\-]+)\s+(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/i.exec(block);
      if (!m) throw new Error(`Invalid BUSINESS_HOURS block: "${block}"`);
      const days = new Set<string>();
      for (const part of m[1].toLowerCase().split(",")) {
        const [from, to] = part.split("-");
        const a = DAY_NAMES.indexOf(from as never);
        const b = to ? DAY_NAMES.indexOf(to as never) : a;
        if (a < 0 || b < 0) throw new Error(`Invalid day in BUSINESS_HOURS: "${part}"`);
        for (let i = a; ; i = (i + 1) % 7) {
          days.add(DAY_NAMES[i]);
          if (i === b) break;
        }
      }
      const startMin = +m[2] * 60 + +m[3];
      const endMin = +m[4] * 60 + +m[5];
      if (endMin <= startMin) throw new Error(`BUSINESS_HOURS block ends before it starts: "${block}"`);
      return { days, startMin, endMin };
    });
}
