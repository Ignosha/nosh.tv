import Link from "next/link";
import { Mark } from "./Mark";
import { ThemeToggle } from "./ThemeToggle";

export function Masthead() {
  return (
    <header className="masthead">
      <div className="wrap masthead-inner">
        <Link href="/" className="brand" aria-label="Kinledger home">
          <Mark />
          <span className="brand-name">
            Kin<em>ledger</em>
          </span>
        </Link>
        <nav className="nav" aria-label="Main">
          <Link href="/#services" className="nav-hide">Services</Link>
          <Link href="/#attorneys" className="nav-hide">For attorneys</Link>
          <Link href="/#fees" className="nav-hide">Fees</Link>
          <Link href="/scan" className="nav-hide-sm">Estate scan</Link>
          <ThemeToggle />
          <Link href="/#open-a-case" className="btn btn-small btn-primary">Open a case</Link>
        </nav>
      </div>
    </header>
  );
}
