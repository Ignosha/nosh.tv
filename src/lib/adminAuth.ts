import { headers } from "next/headers";
import { timingSafeEqual } from "node:crypto";
/** Server actions must authenticate independently of their page's middleware matcher. */
export function adminAuthorized(
  header: string | null,
  password: string | undefined,
): boolean {
  if (!password || !header?.startsWith("Basic ")) return false;
  const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
  const separator = decoded.indexOf(":");
  if (separator < 0 || decoded.slice(0, separator) !== "admin") return false;
  const supplied = Buffer.from(decoded.slice(separator + 1)),
    expected = Buffer.from(password);
  return (
    supplied.length === expected.length && timingSafeEqual(supplied, expected)
  );
}
export async function requireAdmin(): Promise<void> {
  if (
    !adminAuthorized(
      (await headers()).get("authorization"),
      process.env.ADMIN_PASSWORD,
    )
  )
    throw new Error("Administrator authentication required");
}
