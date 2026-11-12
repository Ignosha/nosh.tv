import { requireOrganization } from "@/lib/enterprise/session";
import { WorkspaceNavigation } from "@/components/WorkspaceNavigation";
export default async function OrganizationLayout({
  params,
  children,
}: {
  params: Promise<{ org: string }>;
  children: React.ReactNode;
}) {
  const { org } = await params,
    { role } = await requireOrganization(org);
  return (
    <div className="workspace-shell">
      <WorkspaceNavigation org={org} role={role} />
      <div className="workspace-content">{children}</div>
    </div>
  );
}
