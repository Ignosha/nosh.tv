import { requireOrganization } from "@/lib/enterprise/session";
import { AssuranceWorkspace } from "@/components/AssuranceWorkspace";
import { newAssurance } from "@/lib/assurance";
import { saveCompany } from "../actions";
import { CompanyPlaybooks } from "@/components/CompanyPlaybooks";
export default async function Company({
  params,
  searchParams,
}: {
  params: Promise<{ org: string }>;
  searchParams: Promise<{ playbook_error?: string }>;
}) {
  const { org } = await params;
  const { playbook_error } = await searchParams;
  const { client, user, role } = await requireOrganization(org);
  const [organization, programs, directory] = await Promise.all([
    client.from("kl_organizations").select("*").eq("id", org).single(),
    client
      .from("kl_assurance_programs")
      .select("id,name,revision")
      .eq("organization_id", org)
      .order("updated_at", { ascending: false }),
    client.rpc("kl_org_directory", { p_org: org }),
  ]);
  if (organization.error || programs.error || directory.error)
    throw new Error("Company data unavailable");
  const current = organization.data;
  const writable =
    ["active", "trialing"].includes(current.entitlement) &&
    Date.parse(current.access_until) > Date.now();
  const identities = directory.data.map(
    (m: { user_id: string; email: string; active: boolean }) => ({
      id: m.user_id,
      label: m.email,
      active: m.active,
    }),
  );
  return (
    <>
      <h1>{current.name}</h1>
      <p>
        Role: {role} ·{" "}
        {writable
          ? "Writing enabled"
          : "Read-only: exports and history remain available"}
      </p>
      <p>
        <a href={`/workspace/${org}/portfolio`}>Portfolio command center</a> ·{" "}
        <a href={`/workspace/${org}/members`}>Memberships</a> ·{" "}
        <a href={`/workspace/${org}/reports`}>Report publication</a>
      </p>
      <h2>Programs</h2>
      {programs.data.map((p) => (
        <p key={p.id}>
          <a href={`/workspace/${org}/programs/${p.id}`}>{p.name}</a> · revision{" "}
          {p.revision}
        </p>
      ))}
      {writable && ["owner", "admin", "editor"].includes(role) ? (
        <>
          <CompanyPlaybooks org={org} error={playbook_error} />
          <h2>Create a program</h2>
          <AssuranceWorkspace
            key={org}
            initial={{ ...newAssurance(), owner: user.id }}
            identities={identities}
            verifiedActor={user.email}
            workspaceBase={`/workspace/${org}/programs`}
            allowLocalCompletion={false}
            persist={saveCompany.bind(null, org)}
          />
        </>
      ) : null}
    </>
  );
}
