# Company product and commercial model

TraceSworn now offers a more repeatable company workflow: start a program from a playbook, assign accountable owners, work through an exception inbox and export management evidence from saved revisions. These capabilities reduce setup and reporting effort. They do not remove the need for customer assessments, independent reviewers or a staffed support process.

## Proposed offers

| Offer | Proposed monthly USD | Active seats | Saved programs |
| --- | ---: | ---: | ---: |
| Company | $1,499 | 10 | 5 |
| Portfolio | $3,499 | 35 | 25 |
| Enterprise | $7,499 | 100 | 100 |

These are pricing hypotheses to validate with paying buyers. All tiers include the same evidence/review controls; larger tiers buy capacity. A signed contract and operations activation set the actual quotas. There is no new self-service subscription checkout, automatic charge or automatic entitlement upgrade in this release.

Each organization currently has a fixed 100-report monthly submission limit, 50 MB report storage and a default audit budget of 200 MB or 5,000 revisions. Specialist investigations, implementation services and support commitments require a separate scope. Avoid including unlimited human assistance in a software fee.

## What a buyer gets

- Five reusable playbooks: crypto matter screening, supplier oversight, financial review, quarterly access review and incident evidence response. New programs contain linked risks, staged tasks and a recurring review, with verified initial ownership and an audited creation reason. They start unassessed, without fabricated evidence or approvals. Applying a playbook preserves the stricter evidence freshness window.
- A portfolio command center with overdue, blocked, stale-evidence, assessment, review and owner exceptions. Search by program/task and filter by owner or issue type. Counts cover the displayed page of up to 20 saved programs, with an exact total and pagination.
- A management brief with source program IDs and saved revisions, a printable view, a fingerprinted JSON download and a streamed spreadsheet-safe evidence request CSV. JSON/print briefs include at most the highest-priority 500 exceptions per page and disclose the actual total.
- A capacity recommendation and buyer-assumption ROI model at `/plans`. Negative net savings are displayed when appropriate. Native server-validated proposal downloads also work without JavaScript; the server chooses prices from the catalog and ignores posted price or plan overrides. These discussion drafts do not activate access.

The portfolio and exports use the existing authenticated user client, MFA, organization membership and Postgres RLS. No new privileged credential or database migration is needed for these product features. Exports remain available to authorized members after contract expiry.

## Revenue arithmetic, not a forecast

| Hypothetical customer mix | Gross monthly revenue |
| --- | ---: |
| 3 Company accounts | $4,497 |
| 5 Portfolio accounts | $17,495 |
| 3 Enterprise accounts | $22,497 |
| 5 Company + 5 Portfolio + 2 Enterprise | $39,988 |

Profit depends on payment fees, support labor, infrastructure, acquisition, specialist work, other operating costs and taxes. No customers, conversion rate, savings percentage or profit margin is implied by these examples. The ROI builder uses the buyer's own assumptions rather than invented customer results.

## Validate before scaling

After completing the existing production launch gates, recruit three tightly scoped pilots from investigation firms or advisers that repeatedly collect and review evidence. Demonstrate one real program, one independent review and one management export. Measure onboarding time, weekly follow-up time, reviewer throughput and support time per account before expanding acquisition spend.

A useful buyer conversation starts with: “How much time does your team spend collecting sources, chasing overdue work and assembling management packs?” Show the workflow against that baseline. Quote capacity and support scope explicitly. If the proposed fee does not fit the buyer's measured value, change the scope or offer rather than presenting the calculator as proof of savings.

Keep sender identity, contact information and any required postal address accurate before using the existing outreach tooling. No campaign, new email or paid provider upgrade was launched by this feature release.

## Activation and remaining launch work

Operations can use the existing `scripts/activate-contract.mjs` only after a signed agreement and billing confirmation, with the selected plan's seat/program limits and the agreed expiry. That command records capacity and charges no payment. Store privileged credentials in the private operations environment.

Real-provider acceptance, managed database recovery, delivered/staffed alerts, permitted commercial hosting and customer terms remain prerequisites for production onboarding. The implementation and local/CI fixture tests do not replace those checks. See `RELEASE.md` and `ops/README.md`.

The product now includes saved-revision change reports, open-deadline calendar snapshots and workload/completion visuals across the proposed company capacities. `/product` lets buyers explore a clearly fictional example, while `/trust` provides a portable software-control overview for initial procurement review. These reduce explanation and reporting effort; they do not validate willingness to pay. Keep live recovery, staffing and customer-specific security questionnaires within an agreed scope.
