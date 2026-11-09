// Site-wide settings from environment variables.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://tracesworn.com").replace(/\/$/, "");
export const OPERATOR_NAME = process.env.OPERATOR_NAME || "The TraceSworn team";
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "";
