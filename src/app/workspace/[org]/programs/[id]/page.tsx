import { requireOrganization } from "@/lib/enterprise/session";
import { parseAssurance } from "@/lib/assurance";
import { AssuranceWorkspace } from "@/components/AssuranceWorkspace";
import { CompanyForm } from "@/components/CompanyForms";
import { saveCompany, approveCompanyAction } from "../../../actions";
import { notFound } from "next/navigation";
export default async function Program({
  params,
}: {
  params: Promise<{ org: string; id: string }>;
}) {
  const { org, id } = await params;
  const { client, user, role } = await requireOrganization(org);
  const [result, directory, history, reviews, organization] = await Promise.all(
    [
      client
        .from("kl_assurance_programs")
        .select("*")
        .eq("organization_id", org)
        .eq("id", id)
        .maybeSingle(),
      client.rpc("kl_org_directory", { p_org: org }),
      client
        .from("kl_assurance_history")
        .select("revision,actor_id,reason,recorded_at")
        .eq("organization_id", org)
        .eq("program_id", id)
        .order("revision", { ascending: false })
        .limit(100),
      client
        .from("kl_action_reviews")
        .select("*")
        .eq("organization_id", org)
        .eq("program_id", id)
        .eq("state", "pending"),
      client
        .from("kl_organizations")
        .select("entitlement,access_until")
        .eq("id", org)
        .single(),
    ],
  );
  if (
    result.error ||
    directory.error ||
    history.error ||
    reviews.error ||
    organization.error
  )
    throw new Error("Workspace unavailable");
  if (!result.data) notFound();
  const program = result.data,
    w = parseAssurance(program.workspace),
    members = directory.data as {
      user_id: string;
      email: string;
      active: boolean;
    }[];
  const writable =
    ["active", "trialing"].includes(organization.data.entitlement) &&
    Date.parse(organization.data.access_until) > Date.now();
  return (
    <>
      <a href={`/workspace/${org}`}>← Company</a>
      <h1>{w.name}</h1>
      <div className="studio-toolbar no-print">
        <a className="btn" href={`/workspace/${org}/programs/${id}/changes`}>
          Compare saved revisions
        </a>
        <a className="btn" href={`/workspace/${org}/portfolio`}>
          Portfolio command center
        </a>
      </div>
      <AssuranceWorkspace
        key={id}
        initial={w}
        initialRevision={program.revision}
        programId={id}
        identities={members.map((m) => ({
          id: m.user_id,
          label: m.email,
          active: m.active,
        }))}
        verifiedActor={user.email}
        allowLocalCompletion={false}
        readOnly={!writable || !["owner", "admin", "editor"].includes(role)}
        workspaceBase={`/workspace/${org}/programs`}
        persist={saveCompany.bind(null, org)}
      />
      <section className="form-card no-print">
        <h2>Authenticated review queue</h2>
        {reviews.data.map((review) => {
          const action = w.actions.find((a) => a.id === review.action_id);
          return (
            <article key={review.action_id}>
              <h3>{action?.title ?? review.action_id}</h3>
              <p>
                Submitted by{" "}
                {members.find((m) => m.user_id === review.submitted_by)
                  ?.email ?? review.submitted_by}{" "}
                · revision {review.revision}
              </p>
              {writable &&
              ["owner", "admin", "reviewer"].includes(role) &&
              review.submitted_by !== user.id &&
              action?.owner !== user.id ? (
                <CompanyForm
                  action={approveCompanyAction.bind(null, org)}
                  label="Approve action with my identity"
                >
                  <input type="hidden" name="program" value={id} />
                  <input
                    type="hidden"
                    name="revision"
                    value={program.revision}
                  />
                  <input type="hidden" name="action" value={review.action_id} />
                  <label>
                    Review resolution
                    <textarea name="resolution" required maxLength={4000} />
                  </label>
                </CompanyForm>
              ) : (
                <p>A different authorized reviewer must approve.</p>
              )}
            </article>
          );
        })}
        {!reviews.data.length ? <p>No current review requests.</p> : null}
      </section>
      <section className="form-card no-print">
        <h2>Audit history</h2>
        {history.data.map((h) => (
          <p key={h.revision}>
            <a href={`/workspace/${org}/programs/${id}/history/${h.revision}`}>
              Revision {h.revision}
            </a>{" "}
            · {h.actor_id} · {h.reason} · {h.recorded_at}
          </p>
        ))}
      </section>
    </>
  );
}
