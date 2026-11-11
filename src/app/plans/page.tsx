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
    <div className="wrap company-plans-page">
      <p className="kicker">Company plans</p>
      <h1>A repeatable evidence process, priced around your portfolio.</h1>
      <p className="lede">
        Give teams a clear place to collect sources, resolve exceptions, obtain
        independent review and report to management.
      </p>
      <CompanyPlanBuilder contactEmail={CONTACT_EMAIL} />
    </div>
  );
}
