import { addDays, type Assurance } from "./assurance";
import { companyPortfolio } from "./companyPortfolio";

export function productExample(today: string) {
  const owner = "00000000-0000-4000-8000-000000000001";
  const workspace = (name: string, index: number): Assurance => ({
    format: "TraceSworn Assurance v1",
    name,
    owner,
    freshnessDays: 30,
    evidence: [
      {
        id: "source-1",
        title: index === 1 ? "Supplier control statement" : "Source record",
        reference: "https://example.invalid/source",
        sha256: "",
        observedAt: addDays(today, index === 1 ? -45 : -2),
      },
    ],
    risks: [
      {
        id: "risk-1",
        title: "Unresolved source exceptions",
        owner,
        likelihood: index === 1 ? 5 : 3,
        impact: 5,
        controlEffectiveness: 60,
        control: "Independent source review",
        assessed: true,
        evidenceIds: ["source-1"],
      },
    ],
    actions: [
      {
        id: "action-1",
        riskId: "risk-1",
        title: [
          "Review source exceptions",
          "Refresh supplier evidence",
          "Approve the review outcome",
        ][index],
        owner,
        dueDate: addDays(today, index === 0 ? -2 : index + 1),
        status: index === 2 ? "review" : "in_progress",
        dependsOn: [],
        evidenceIds: ["source-1"],
        reviewer: "",
        resolution: "",
        completedAt: null,
        recurrenceDays: 30,
        series: "",
        cycle: 0,
      },
    ],
  });
  return companyPortfolio(
    [
      "Matter 014 · source review",
      "Supplier assurance",
      "Quarterly access review",
    ].map((name, index) => ({
      id: `00000000-0000-4000-8000-00000000010${index}`,
      revision: index + 2,
      updated_at: `${today}T00:00:00Z`,
      workspace: workspace(name, index),
    })),
    [{ id: owner, label: "Example team owner", active: true }],
    today,
  );
}
