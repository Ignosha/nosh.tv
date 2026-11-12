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
        <nav
          className={enterprise ? "nav product-navigation" : "nav"}
          aria-label="Main"
        >
          {enterprise ? (
            <>
              <Link href="/product" className="product-desktop-link">
                Product
              </Link>
              <Link href="/plans" className="product-desktop-link">
                Plans
              </Link>
              <Link href="/trust" className="product-desktop-link">
                Security
              </Link>
              <Link href="/tools" className="product-desktop-link">
                Free tools
              </Link>
            </>
          ) : (
            <>
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
                <Link href="/#matters" className="nav-hide">
                  Who we serve
                </Link>
              ) : null}
              <Link href="/verify" className="nav-hide">
                Verify
              </Link>
            </>
          )}
          <ThemeToggle />
          <Link
            href={enterprise ? "/workspace" : "/#open-a-case"}
            className="btn btn-small btn-primary"
          >
            {enterprise ? "Workspace" : "Open a matter"}
          </Link>
          {enterprise ? (
            <details className="product-mobile-menu">
              <summary aria-label="Open navigation">
                <span />
                <span />
                <span />
              </summary>
              <div>
                <Link href="/product">Product overview</Link>
                <Link href="/plans">Company plans</Link>
                <Link href="/trust">Security overview</Link>
                <Link href="/tools">Free tools</Link>
                <Link href="/verify">Verify a record</Link>
              </div>
            </details>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
