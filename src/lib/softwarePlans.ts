/** Pilot pricing hypotheses. These do not create paid entitlements or subscription checkouts. */
export const SOFTWARE_PLANS = [
  {
    id: "individual",
    name: "Report Studio Individual",
    monthlyUsd: 199,
    features: [
      "Branded reports and reusable templates",
      "Source citations, file fingerprints and review checks",
      "Local exports and verified revision comparison",
    ],
  },
  {
    id: "practice",
    name: "Report Studio Practice",
    monthlyUsd: 499,
    features: [
      "Individual features",
      "Case-linked issued-version archives",
      "Preserved report snapshots and exact downloads",
    ],
  },
  {
    id: "company",
    name: "Company Assurance",
    monthlyUsd: 1499,
    features: [
      "Practice features",
      "Evidence-backed risk register and explainable control scoring",
      "Dependent remediation actions and reviewed closure",
      "Recurring obligations anchored to due dates",
      "Portfolio briefs, spreadsheet-safe CSV and portable sealed exports",
      "Hosted optimistic revisions with append-only audit snapshots",
    ],
  },
] as const;

/** Capacity-based company proposals; activation still requires an agreed contract. */
export const COMPANY_PLANS = [
  {
    id: "company",
    name: "Company",
    monthlyUsd: 1499,
    seats: 10,
    programs: 5,
    description: "One team establishing a repeatable evidence process.",
  },
  {
    id: "portfolio",
    name: "Portfolio",
    monthlyUsd: 3499,
    seats: 35,
    programs: 25,
    description: "Multiple teams or matters with a shared management view.",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    monthlyUsd: 7499,
    seats: 100,
    programs: 100,
    description: "A larger portfolio with named owners and independent review.",
  },
] as const;
export type CompanyPlanId = (typeof COMPANY_PLANS)[number]["id"];
export type ScopeInputs = {
  seats: number;
  programs: number;
  hoursPerProgram: number;
  hourlyCost: number;
  timeReductionPercent: number;
};
export function scopeCompanyPlan(input: ScopeInputs) {
  const { seats, programs, hoursPerProgram, hourlyCost, timeReductionPercent } =
    input;
  if (
    !Number.isInteger(seats) ||
    seats < 1 ||
    seats > 10000 ||
    !Number.isInteger(programs) ||
    programs < 1 ||
    programs > 1000 ||
    !Number.isFinite(hoursPerProgram) ||
    hoursPerProgram < 0 ||
    hoursPerProgram > 1000 ||
    !Number.isFinite(hourlyCost) ||
    hourlyCost < 0 ||
    hourlyCost > 10000 ||
    !Number.isFinite(timeReductionPercent) ||
    timeReductionPercent < 0 ||
    timeReductionPercent > 100
  )
    throw new Error("Enter valid scope and planning assumptions");
  const plan =
    COMPANY_PLANS.find(
      (plan) => plan.seats >= seats && plan.programs >= programs,
    ) ?? null;
  const estimatedHoursSaved =
    (programs * hoursPerProgram * timeReductionPercent) / 100;
  const estimatedLaborSavings =
    Math.round(estimatedHoursSaved * hourlyCost * 100) / 100;
  return {
    plan,
    estimatedHoursSaved,
    estimatedLaborSavings,
    estimatedNetBenefit: plan
      ? Math.round((estimatedLaborSavings - plan.monthlyUsd) * 100) / 100
      : null,
    breakEvenHours:
      plan && hourlyCost > 0 ? plan.monthlyUsd / hourlyCost : null,
  };
}
export function companyProposal(
  company: string,
  input: ScopeInputs,
  includeEstimate: boolean,
) {
  const scoped = scopeCompanyPlan(input);
  if (company.length > 160) throw new Error("Company name exceeds the limit");
  return {
    format: "TraceSworn Company Proposal v1",
    createdAt: new Date().toISOString(),
    company: company.trim() || "Company to be confirmed",
    currency: "USD",
    seatsRequested: input.seats,
    programsRequested: input.programs,
    proposedPlan: scoped.plan
      ? {
          id: scoped.plan.id,
          name: scoped.plan.name,
          monthlyUsd: scoped.plan.monthlyUsd,
          seats: scoped.plan.seats,
          programs: scoped.plan.programs,
        }
      : null,
    assumptions: includeEstimate
      ? {
          monthlyHoursPerProgram: input.hoursPerProgram,
          hourlyLaborCostUsd: input.hourlyCost,
          timeReductionPercent: input.timeReductionPercent,
        }
      : null,
    estimate: includeEstimate
      ? {
          monthlyHoursSaved: scoped.estimatedHoursSaved,
          monthlyLaborSavingsUsd: scoped.estimatedLaborSavings,
          monthlyNetBenefitUsd: scoped.estimatedNetBenefit,
        }
      : null,
    terms:
      "Discussion draft, subject to an agreed scope and signed contract. No payment or access activation occurs here. Prices exclude applicable taxes and separately scoped services. Time savings are buyer assumptions, not measured results or guarantees.",
  };
}
