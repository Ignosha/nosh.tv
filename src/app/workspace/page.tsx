import { requireMfa } from "@/lib/enterprise/session";
import { CompanyForm } from "@/components/CompanyForms";
import { SampleProgramButton } from "@/components/SampleProgramButton";
import { acceptInvite, createSampleProgram } from "./actions";
export default async function Workspace({ searchParams }: {
  searchParams?: Promise<{ sample_error?: string; reference?: string }>;
} = {}) {
  const { client, user } = await requireMfa();
  const feedback = await searchParams;
  const failures: Record<string, string> = {
    quota: "The program limit has been reached. Open an existing workspace or contact your administrator.",
    read_only: "This company is read-only. Contact your administrator before creating a program.",
    unavailable: "Sample setup could not finish. Please try again or contact your administrator.",
  };
  const failure = feedback?.sample_error && Object.hasOwn(failures, feedback.sample_error)
    ? failures[feedback.sample_error] : undefined;
  const reference = feedback?.reference && /^[a-f0-9-]{36}$/.test(feedback.reference) ? feedback.reference : null;
  const [organizations, memberships] = await Promise.all([
    client.from("kl_organizations").select("id,name,entitlement,access_until"),
    client.from("kl_org_members").select("organization_id,role")
      .eq("user_id", user.id).eq("active", true),
  ]);
  if (organizations.error || memberships.error) throw new Error("Company access unavailable");
  const data = organizations.data;
  const editable = new Set(
    memberships.data?.filter((m) => ["owner", "admin", "editor"].includes(m.role))
      .map((m) => m.organization_id),
  );
  return (
    <>
      <h1>Your organizations</h1>
      {failure ? <p role="alert" className="notice err">{failure}{reference ? ` Reference ${reference}` : ""}</p> : null}
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
                {editable.has(org.id) && ["active", "trialing"].includes(org.entitlement)
                  && Date.parse(org.access_until) > Date.now() ? (
                  <form
                    action={createSampleProgram.bind(null, org.id)}
                    className="company-quickstart"
                  >
                    <p className="fine">Create an empty sample with your account as owner, or open the existing first test program.</p>
                    <SampleProgramButton />
                  </form>
                ) : null}
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
