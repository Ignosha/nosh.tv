function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

function intEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) throw new Error(`${name} must be a positive integer`);
  return n;
}

export function businessConfig() {
  return {
    name: required("BUSINESS_NAME"),
    info: required("BUSINESS_INFO"),
    timezone: required("BUSINESS_TIMEZONE"),
    hours: required("BUSINESS_HOURS"),
    appointmentMinutes: intEnv("APPOINTMENT_MINUTES", 30),
    bookingWindowDays: intEnv("BOOKING_WINDOW_DAYS", 14),
    minNoticeHours: intEnv("MIN_NOTICE_HOURS", 2),
  };
}

export function geminiConfig() {
  return {
    apiKey: required("GEMINI_API_KEY"),
    model: process.env.GEMINI_MODEL || "gemini-flash-lite-latest",
  };
}

export function googleConfig() {
  return {
    clientId: required("GOOGLE_CLIENT_ID"),
    clientSecret: required("GOOGLE_CLIENT_SECRET"),
    refreshToken: required("GOOGLE_REFRESH_TOKEN"),
    calendarId: process.env.GOOGLE_CALENDAR_ID || "primary",
  };
}

export function supabaseConfig() {
  return {
    url: required("SUPABASE_URL"),
    serviceRoleKey: required("SUPABASE_SERVICE_ROLE_KEY"),
  };
}

export type BusinessConfig = ReturnType<typeof businessConfig>;
