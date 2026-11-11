import Link from "next/link";
import { Mark } from "./Mark";
import { ThemeToggle } from "./ThemeToggle";

export function Masthead() {
  const enterprise = process.env.ENTERPRISE_MODE === "1";
  return (
    <header className={enterprise ? "masthead company-masthead" : "masthead"}>
      <div className="wrap masthead-inner">
        <Link href="/" className="brand" aria-label="TraceSworn home">
          <Mark />
          <span className="brand-name">
            Trace<em>Sworn</em>
          </span>
        </Link>
        <nav className="nav" aria-label="Main">
          <Link href="/tools" className="nav-hide-sm">
            Free tools
          </Link>
          <Link href="/report-builder" className="nav-hide">
            Report Studio
          </Link>
          <Link href="/assurance" className="nav-hide">
            Assurance
          </Link>
          <Link href="/tools/trace" className="nav-hide">
            Tracing
          </Link>
          <Link
            href={enterprise ? "/plans" : "/#services"}
            className="nav-hide"
          >
            Pricing
          </Link>
          {!enterprise ? (
            <Link href="/#matters" className="nav-hide">Who we serve</Link>
          ) : null}
          <Link href="/verify" className="nav-hide">
            Verify
          </Link>
          <ThemeToggle />
          <Link
            href={enterprise ? "/workspace" : "/#open-a-case"}
            className="btn btn-small btn-primary"
          >
            {enterprise ? "Workspace" : "Open a matter"}
          </Link>
        </nav>
      </div>
    </header>
  );
}
