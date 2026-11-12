import { EnterpriseSignIn } from "@/components/EnterpriseSignIn";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Company sign in",
  robots: { index: false, follow: false },
};
export default function SignIn() {
  const configured = !!(
    process.env.SUPABASE_URL &&
    process.env.SUPABASE_ANON_KEY &&
    process.env.APP_ORIGIN
  );
  return (
    <div className="wrap assurance-page" style={{ padding: 40 }}>
      <h1>Company sign in</h1>
      {configured ? (
        <EnterpriseSignIn />
      ) : (
        <p role="status">
          Company authentication is not configured. Your deployment
          administrator must configure the identity service before company
          access is enabled.
        </p>
      )}
    </div>
  );
}
