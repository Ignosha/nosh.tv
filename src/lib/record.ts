// The sealed evidence record for a matter: the report plus any add-on schedules, fingerprinted with SHA-256.
import { seal } from "./fingerprint";
import type { Case } from "./cases";
import type { Trace } from "./trace";
import type { CostBasis, Dissipation } from "./schedules";

export type Extras = { trace?: Trace; costBasis?: CostBasis; dissipation?: Dissipation; alerts?: unknown[] };

export const extrasOf = (c: Case) => (c.extras ?? {}) as Extras;

export function btcAddresses(c: Case): string[] {
  const s = new Set<string>();
  for (const r of c.report?.rows ?? []) if (r.chain === "bitcoin") s.add(r.address);
  for (const a of c.findings?.addresses ?? []) if (a.chain === "bitcoin") s.add(a.address);
  return [...s];
}

export async function matterRecord(c: Case) {
  const x = extrasOf(c);
  return seal({
    generatedBy: "TraceSworn evidence record",
    matter: c.id,
    matterType: c.matter_type ?? "estate",
    valuationDate: c.date_of_death,
    report: c.report,
    tracing: x.trace ?? null,
    costBasis: x.costBasis ?? null,
    dissipation: x.dissipation ?? null,
    alerts: x.alerts ?? [],
  });
}
