/** Scope and economics are operational planning assumptions, never promises of profit. */
export const PREMIER_SCOPE = {
  monthlyMatters: 4,
  monthlyScreenings: 50,
  includedHours: 25,
  revisionRounds: 1,
  monthlyPrice: 10000,
  targetMargin: 0.5,
} as const;
export function laborRate(): number {
  const rate = Number(process.env.INTERNAL_HOURLY_COST);
  return Number.isFinite(rate) && rate > 0 ? rate : 125;
}
export function contribution(
  revenueCents: number,
  minutes: number,
  otherCents = 0,
) {
  const labor = Math.round((minutes / 60) * laborRate() * 100);
  return {
    laborCents: labor,
    contributionCents: revenueCents - labor - otherCents,
    margin:
      revenueCents > 0
        ? (revenueCents - labor - otherCents) / revenueCents
        : null,
  };
}
