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
      {data?.map((org) => (
        <p key={org.id}>
          <a href={`/workspace/${org.id}`}>{org.name}</a> · {org.entitlement} ·
          access through {org.access_until.slice(0, 10)}
        </p>
      ))}
      {!data?.length ? (
        <p>
          No active memberships. Ask your company administrator for an
          invitation.
        </p>
      ) : null}
      <CompanyForm action={acceptInvite} label="Accept invitation">
        <label>
          One-use invitation token
          <input name="token" required autoComplete="off" maxLength={64} />
        </label>
      </CompanyForm>
    </>
  );
}
