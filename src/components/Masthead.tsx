import Link from "next/link";
import { Mark } from "./Mark";
import { ThemeToggle } from "./ThemeToggle";

export function Masthead() {
  return (
    <header className="masthead">
      <div className="wrap masthead-inner">
        <Link href="/" className="brand" aria-label="TraceSworn home">
          <Mark />
          <span className="brand-name">
            Trace<em>Sworn</em>
          </span>
        </Link>
        <nav className="nav" aria-label="Main">
          <Link href="/tools" className="nav-hide-sm">Free tools</Link>
          <Link href="/tools/trace" className="nav-hide">Tracing</Link>
          <Link href="/#services" className="nav-hide">Pricing</Link>
          <Link href="/#matters" className="nav-hide">Who we serve</Link>
          <Link href="/verify" className="nav-hide">Verify</Link>
          <ThemeToggle />
          <Link href="/#open-a-case" className="btn btn-small btn-primary">Open a matter</Link>
        </nav>
      </div>
    </header>
  );
}
