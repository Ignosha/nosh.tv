import { requireMfa } from "@/lib/enterprise/session";
import { signOut } from "@/app/auth/actions";
export const dynamic = "force-dynamic";
export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await requireMfa();
  return (
    <div className="wrap assurance-page" style={{ padding: "40px 0" }}>
      <nav className="no-print studio-toolbar">
        <a href="/workspace">Organizations</a>
        <span>Signed in: {user.email}</span>
        <form action={signOut}>
          <button className="btn btn-small">Sign out</button>
        </form>
      </nav>
      {children}
    </div>
  );
}
