import type { Metadata } from "next";
import { CompanyPlanBuilder } from "@/components/CompanyPlanBuilder";
import { CONTACT_EMAIL } from "@/lib/site";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Company plans and rollout scope · TraceSworn",
  description:
    "Plan team capacity, compare company proposals and estimate the value of repeatable evidence operations using your own assumptions.",
};
export default function CompanyPlans() {
  return (
    <div className="wrap company-plans-page experience-page">
      <p className="kicker">Company plans</p>
      <h1>Plans for company teams.</h1>
      <p className="lede">
        Each plan includes the company workspace, evidence records, independent
        review and exports. Choose limits for team seats and saved programs.
      </p>
      <CompanyPlanBuilder contactEmail={CONTACT_EMAIL} />
    </div>
  );
}
