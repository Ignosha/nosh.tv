import { requireMfa } from "@/lib/enterprise/session";
import { CompanyForm } from "@/components/CompanyForms";
import { acceptInvite } from "./actions";
export default async function Workspace() {
  const { client } = await requireMfa();
  const { data, error } = await client
    .from("kl_organizations")
    .select("id,name,entitlement,access_until");
  if (error) throw new Error("Company access unavailable");
  return (
    <>
      <h1>Your organizations</h1>
      {data?.length ? (
        <>
          <p className="muted">Choose a company to open its programs, reports and memberships.</p>
          <ul className="company-org-list">
            {data.map((org) => (
              <li key={org.id}>
                <a href={`/workspace/${org.id}`} className="company-org-card">
                  <span className="company-org-name">{org.name}</span>
                  <span className="fine">
                    {org.entitlement === "trialing" ? "Trial" : org.entitlement} · access through{" "}
                    <time dateTime={org.access_until}>{org.access_until.slice(0, 10)}</time>
                  </span>
                  <span className="company-org-open">Open workspace <span aria-hidden="true">→</span></span>
                </a>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {!data?.length ? (
        <p>
          No active memberships. Ask your company administrator for an
          invitation.
        </p>
      ) : null}
      <details className="company-invitation" open={!data?.length}>
        <summary>{data?.length ? "Join another company" : "Have an invitation?"}</summary>
        <p className="fine">Enter a token only when a company administrator has invited you.</p>
        <CompanyForm action={acceptInvite} label="Accept invitation">
          <label>
            One-use invitation token
            <input name="token" required autoComplete="off" maxLength={64} />
          </label>
        </CompanyForm>
      </details>
    </>
  );
}
