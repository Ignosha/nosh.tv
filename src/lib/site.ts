// Site-wide settings from environment variables.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://noshtv.vercel.app").replace(/\/$/, "");
export const OPERATOR_NAME = process.env.OPERATOR_NAME || "The Kin Ledger team";
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "";
