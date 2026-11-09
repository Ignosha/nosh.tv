"use client";
import { seal } from "./fingerprint";

/** Seals a record with its SHA-256 fingerprint and downloads it as JSON. Returns the fingerprint. */
export async function downloadSealed(record: unknown, filename: string): Promise<string> {
  const sealed = await seal(record);
  const blob = new Blob([JSON.stringify(sealed, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
  return sealed.fingerprint.value;
}
