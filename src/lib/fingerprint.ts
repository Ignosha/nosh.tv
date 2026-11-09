// Evidence fingerprints. A record is serialised canonically (keys sorted, no whitespace) and hashed
// with SHA-256. Anyone can recompute the hash from the record and confirm nothing was changed.
// Works in the browser and in Node (both expose crypto.subtle).

export function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  const obj = value as Record<string, unknown>;
  return (
    "{" +
    Object.keys(obj)
      .filter((k) => obj[k] !== undefined)
      .sort()
      .map((k) => JSON.stringify(k) + ":" + canonical(obj[k]))
      .join(",") +
    "}"
  );
}

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export type SealedRecord<T> = { record: T; fingerprint: { algorithm: "SHA-256"; canonicalization: "sorted-keys-json"; value: string } };

/** Wraps a record with its fingerprint. Verify by hashing canonical(record) and comparing. */
export async function seal<T>(record: T): Promise<SealedRecord<T>> {
  return { record, fingerprint: { algorithm: "SHA-256", canonicalization: "sorted-keys-json", value: await sha256Hex(canonical(record)) } };
}

export async function verifySealed(input: unknown): Promise<{ ok: boolean; expected?: string; actual?: string; reason?: string }> {
  if (!input || typeof input !== "object") return { ok: false, reason: "Not a TraceSworn record." };
  const s = input as Partial<SealedRecord<unknown>>;
  if (!s.fingerprint?.value || s.record === undefined) return { ok: false, reason: "This file has no TraceSworn fingerprint." };
  const actual = await sha256Hex(canonical(s.record));
  return { ok: actual === s.fingerprint.value, expected: s.fingerprint.value, actual };
}
