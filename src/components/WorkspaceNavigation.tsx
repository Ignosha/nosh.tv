"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ProductIcon } from "./ProductIcon";
export function WorkspaceNavigation({
  org,
  role,
}: {
  org: string;
  role: string;
}) {
  const path = usePathname(),
    base = `/workspace/${org}`;
  const links = [
    { href: base, label: "Programs", icon: "grid" },
    { href: `${base}/portfolio`, label: "Command center", icon: "clock" },
    { href: `${base}/reports`, label: "Report publication", icon: "proof" },
    ...(["owner", "admin"].includes(role)
      ? [{ href: `${base}/members`, label: "Team & access", icon: "team" }]
      : []),
  ] as const;
  return (
    <aside className="workspace-sidebar no-print">
      <p className="product-eyebrow">Company workspace</p>
      <nav aria-label="Company navigation">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            aria-current={
              path === link.href ||
              (link.href !== base && path.startsWith(link.href + "/"))
                ? "page"
                : undefined
            }
          >
            <ProductIcon
              name={link.icon as "grid" | "clock" | "proof" | "team"}
            />
            <span>{link.label}</span>
          </Link>
        ))}
      </nav>
      <div className="workspace-sidebar-note">
        <ProductIcon name="shield" />
        <p>
          Individual identity.
          <br />
          Independent review.
          <br />A preserved record.
        </p>
      </div>
    </aside>
  );
}
