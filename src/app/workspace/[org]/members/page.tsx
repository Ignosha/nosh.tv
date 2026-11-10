import { requireOrganization } from "@/lib/enterprise/session";
import { CompanyForm } from "@/components/CompanyForms";
import { inviteMember, changeMember, revokeInvite } from "../../actions";
export default async function Members({
  params,
}: {
  params: Promise<{ org: string }>;
}) {
  const { org } = await params;
  const { client, role } = await requireOrganization(org);
  const { data, error } = await client.rpc("kl_org_directory", { p_org: org });
  if (error) throw new Error("Member directory unavailable");
  const manager = ["owner", "admin"].includes(role);
  const invites = manager
    ? await client
        .from("kl_org_invites")
        .select("id,email,role,expires_at,revoked,accepted_by")
        .eq("organization_id", org)
        .is("accepted_by", null)
        .eq("revoked", false)
    : null;
  if (invites?.error) throw new Error("Invitations unavailable");
  return (
    <>
      <a href={`/workspace/${org}`}>← Company</a>
      <h1>Memberships</h1>
      {data.map(
        (member: {
          user_id: string;
          email: string;
          role: string;
          active: boolean;
        }) => (
          <section className="form-card" key={`${org}-${member.user_id}`}>
            <h2>{member.email}</h2>
            <p>
              {member.role} · {member.active ? "active" : "revoked"}
            </p>
            {role === "owner" && member.active ? (
              <CompanyForm
                action={changeMember.bind(null, org)}
                label="Update membership"
              >
                <input type="hidden" name="user" value={member.user_id} />
                <label>
                  Role
                  <select name="role" defaultValue={member.role}>
                    {["owner", "admin", "editor", "reviewer", "viewer"].map(
                      (r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ),
                    )}
                  </select>
                </label>
                <label>
                  <input type="checkbox" name="active" defaultChecked />
                  Active membership
                </label>
              </CompanyForm>
            ) : null}
          </section>
        ),
      )}
      {manager ? (
        <>
          <h2>Invite a colleague</h2>
          <CompanyForm
            key={`${org}-invite`}
            action={inviteMember.bind(null, org)}
            label="Create one-use invitation"
          >
            <label>
              Verified company email
              <input name="email" type="email" required maxLength={254} />
            </label>
            <label>
              Role
              <select name="role">
                {(role === "owner"
                  ? ["admin", "editor", "reviewer", "viewer"]
                  : ["editor", "reviewer", "viewer"]
                ).map((r) => (
                  <option value={r} key={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
          </CompanyForm>
          <h2>Pending invitations</h2>
          {invites?.data?.map((i) => (
            <CompanyForm
              action={revokeInvite.bind(null, org)}
              label="Revoke invitation"
              key={i.id}
            >
              <input type="hidden" name="invite" value={i.id} />
              <p>
                {i.email} · {i.role} · expires {i.expires_at}
              </p>
            </CompanyForm>
          ))}
        </>
      ) : null}
    </>
  );
}
