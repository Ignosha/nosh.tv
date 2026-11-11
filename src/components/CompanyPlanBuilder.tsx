"use client";
import { useState } from "react";
import Link from "next/link";
import { COMPANY_PLANS, scopeCompanyPlan } from "@/lib/softwarePlans";

const usd = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
export function CompanyPlanBuilder({
  contactEmail = "",
}: {
  contactEmail?: string;
}) {
  const [inputs, setInputs] = useState({
    company: "",
    seats: "10",
    programs: "5",
    hours: "",
    cost: "",
    reduction: "",
  });
  let scoped: ReturnType<typeof scopeCompanyPlan> | null = null;
  try {
    scoped = scopeCompanyPlan({
      seats: Number(inputs.seats),
      programs: Number(inputs.programs),
      hoursPerProgram: Number(inputs.hours),
      hourlyCost: Number(inputs.cost),
      timeReductionPercent: Number(inputs.reduction),
    });
  } catch {
    /* Native inputs and the visible scope error guide correction. */
  }
  const hasAssumptions = [inputs.hours, inputs.cost, inputs.reduction].every(
    (value) => value.trim() !== "",
  );
  const change = (field: keyof typeof inputs, value: string) =>
    setInputs((previous) => ({ ...previous, [field]: value }));
  const emailBody = `Company: ${inputs.company.trim() || "To be confirmed"}\nSeats: ${inputs.seats}\nPrograms: ${inputs.programs}\nProposed plan: ${scoped?.plan?.name ?? "Custom scope"}\nPlease confirm fit, support scope and onboarding before any purchase.`;
  return (
    <div className="company-plan-builder">
      <div className="company-plan-grid">
        {COMPANY_PLANS.map((plan) => (
          <article className="form-card" key={plan.id}>
            <p className="kicker">{plan.name}</p>
            <h2>
              {usd(plan.monthlyUsd)}
              <small>/month</small>
            </h2>
            <p>{plan.description}</p>
            <ul>
              <li>Up to {plan.seats} active seats</li>
              <li>Up to {plan.programs} saved programs</li>
              <li>Playbooks, portfolio inbox and management briefs</li>
              <li>MFA, independent review and revision history</li>
            </ul>
          </article>
        ))}
      </div>
      <form
        className="form-card company-scope-builder"
        id="scope"
        action="/plans/proposal"
        method="post"
      >
        <p className="kicker">Scope your rollout</p>
        <h2>Find the capacity your company needs</h2>
        <p>
          All company plans include the evidence and review controls. Choose
          capacity around the work you actually manage.
        </p>
        <div className="company-filter-grid">
          <label>
            Company name
            <input
              name="company"
              value={inputs.company}
              onChange={(event) => change("company", event.target.value)}
              maxLength={160}
              autoComplete="organization"
            />
          </label>
          <label>
            Active team seats
            <input
              name="seats"
              type="number"
              min={1}
              max={10000}
              step={1}
              value={inputs.seats}
              onChange={(event) => change("seats", event.target.value)}
              required
            />
          </label>
          <label>
            Saved programs or matters
            <input
              name="programs"
              type="number"
              min={1}
              max={1000}
              step={1}
              value={inputs.programs}
              onChange={(event) => change("programs", event.target.value)}
              required
            />
          </label>
        </div>
        <div
          className="company-plan-recommendation company-live-estimate"
          aria-live="polite"
        >
          {!scoped ? (
            <p role="alert">
              Enter whole seats and programs within the supported ranges, and
              valid cost assumptions.
            </p>
          ) : scoped.plan ? (
            <p>
              <strong>
                Suggested scope: {scoped.plan.name} ·{" "}
                {usd(scoped.plan.monthlyUsd)}/month.
              </strong>{" "}
              Includes {scoped.plan.seats} seats and {scoped.plan.programs}{" "}
              programs.
            </p>
          ) : (
            <p>
              <strong>Custom scope needed.</strong> Your requested capacity
              exceeds the listed plans; discuss a separate contract.
            </p>
          )}
        </div>
        <details className="company-roi">
          <summary>Estimate the value using your own assumptions</summary>
          <p>
            Enter monthly administration time per program, your labor cost and
            the reduction you want to test. This is a planning scenario.
          </p>
          <div className="company-filter-grid">
            <label>
              Hours per program per month
              <input
                name="hours"
                type="number"
                min={0}
                max={1000}
                step="0.5"
                value={inputs.hours}
                onChange={(event) => change("hours", event.target.value)}
              />
            </label>
            <label>
              Labor cost per hour (USD)
              <input
                name="cost"
                type="number"
                min={0}
                max={10000}
                step={1}
                value={inputs.cost}
                onChange={(event) => change("cost", event.target.value)}
              />
            </label>
            <label>
              Assumed time reduction (%)
              <input
                name="reduction"
                type="number"
                min={0}
                max={100}
                step={1}
                value={inputs.reduction}
                onChange={(event) => change("reduction", event.target.value)}
              />
            </label>
          </div>
          {scoped && hasAssumptions ? (
            <div className="company-plan-recommendation" aria-live="polite">
              <p>
                Estimated monthly time saved:{" "}
                <strong>
                  {scoped.estimatedHoursSaved.toLocaleString("en-US", {
                    maximumFractionDigits: 1,
                  })}{" "}
                  hours
                </strong>
                .
              </p>
              <p>
                Estimated labor savings:{" "}
                <strong>{usd(scoped.estimatedLaborSavings)}</strong>.
              </p>
              {scoped.estimatedNetBenefit !== null ? (
                <p>
                  Estimated savings after the proposed software fee:{" "}
                  <strong>{usd(scoped.estimatedNetBenefit)}/month</strong>.
                </p>
              ) : null}
              {scoped.breakEvenHours !== null ? (
                <p>
                  At your hourly cost, the fee requires about{" "}
                  {scoped.breakEvenHours.toFixed(1)} hours saved per month to
                  break even.
                </p>
              ) : null}
              <p className="fine">
                These are your assumptions, not observed customer savings. This
                model excludes implementation, taxes and other operating costs.
              </p>
            </div>
          ) : (
            <p className="fine">
              Enter all three assumptions to calculate a scenario.
            </p>
          )}
        </details>
        <div className="studio-toolbar">
          <button className="btn btn-primary" type="submit" disabled={!scoped}>
            Download scoped proposal
          </button>
          {contactEmail && scoped ? (
            <a
              className="btn"
              href={`mailto:${encodeURIComponent(contactEmail)}?subject=${encodeURIComponent("TraceSworn company scope request")}&body=${encodeURIComponent(emailBody)}`}
            >
              Email a scope request
            </a>
          ) : null}
          <Link className="btn" href="/auth/sign-in">
            Company sign in
          </Link>
        </div>
        <noscript>
          <style>{".company-live-estimate{display:none!important}"}</style>
          <p>
            The download still works without JavaScript; the server calculates
            the requested capacity and estimate in the downloaded proposal.
          </p>
        </noscript>
        <p className="fine">
          Proposed monthly prices in USD, excluding applicable taxes and
          separately scoped services. A signed scope sets access, support and
          retention. No purchase occurs on this page.
        </p>
      </form>
      <section className="form-card">
        <h2>Know the operating limits</h2>
        <p>
          Company plans include 100 report submissions per organization per
          calendar month, 50 MB of report storage, and an audit budget of 200 MB
          or 5,000 saved revisions. Contract capacity is confirmed before
          activation. Evidence is recorded as source references and file
          fingerprints.
        </p>
        <p>
          Implementation help, specialist investigations and service commitments
          require a separate agreed scope.
        </p>
      </section>
    </div>
  );
}
