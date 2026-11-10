import { requireSession } from "@/lib/enterprise/session";
import { EnterpriseMfa } from "@/components/EnterpriseMfa";
import { redirect } from "next/navigation";
export const dynamic = "force-dynamic";
export default async function Mfa() {
  const { client, aal } = await requireSession();
  if (aal === "aal2") redirect("/workspace");
  const { data, error } = await client.auth.mfa.listFactors();
  if (error) throw new Error("Authenticator service unavailable");
  return (
    <div className="wrap assurance-page" style={{ padding: 40 }}>
      <h1>Verify your identity</h1>
      <EnterpriseMfa
        factorId={data.totp.find((f) => f.status === "verified")?.id}
      />
    </div>
  );
}
