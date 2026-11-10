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
