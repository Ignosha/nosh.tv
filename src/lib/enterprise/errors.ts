import { randomUUID } from "node:crypto";
export function operationError(
  error: { message?: string; code?: string } | unknown,
) {
  const e = error as { message?: string; code?: string };
  const message = e?.message ?? "";
  const allowed = [
    "Revision conflict",
    "read-only",
    "quota",
    "Seat limit",
    "last owner",
    "different authenticated reviewer",
    "owner cannot approve",
    "Complete dependencies",
    "Fresh evidence",
    "Current review request",
    "active organization member",
    "Invalid action transition",
    "start open",
    "authenticated review",
    "Role assignment denied",
    "Invitation unavailable",
    "Already a member",
    "Rate limit",
    "Invalid workspace",
    "capacity exceeded",
  ];
  const known = allowed.find((s) =>
    message.toLowerCase().includes(s.toLowerCase()),
  );
  if (known) return { error: message.split("\n")[0].slice(0, 240) };
  const reference = randomUUID();
  console.warn(
    JSON.stringify({
      event: "enterprise.operation_failed",
      code: e?.code ?? "unknown",
      reference,
    }),
  );
  return { error: `Operation unavailable. Reference ${reference}` };
}
