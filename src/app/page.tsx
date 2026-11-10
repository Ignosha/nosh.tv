import { CompanyLanding } from "@/components/CompanyLanding";
import Link from "next/link";
import { Suspense } from "react";
import { ledgerReading } from "@/lib/chains";
import { IntakeForm } from "@/components/IntakeForm";
import { HeroFigure } from "@/components/HeroFigure";
import { DeskBand } from "@/components/DeskBand";
import { Pricing } from "@/components/Pricing";
import { AddressInstrument } from "@/components/AddressInstrument";

export const revalidate = 60;

const usd = (n: number | null) =>
  n === null ? "unavailable" : "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default async function Home() {
  if(process.env.ENTERPRISE_MODE === "1") return <CompanyLanding/>;
  const r = await ledgerReading();

  return (
    <>
      <DeskBand height={r.height} btc={r.btc} />
      <section className="hero">
        <div className="wrap hero-grid">
          <div>
            <span className="kicker">Crypto discovery for estates, divorce &amp; bankruptcy</span>
            <h1>
              Crypto leaves a trail. <em>Document the next step.</em>
            </h1>
            <p className="lede">
              TraceSworn finds the crypto in an estate, a divorce or a bankruptcy, values it on the date that matters, and
              seals every figure in a record that opposing counsel can verify for themselves.
            </p>
            <div className="hero-actions">
              <Link href="#open-a-case" className="btn btn-primary">
                Scope a fixed-fee matter <span className="arrow">↗</span>
              </Link>
              <Link href="/for-firms" className="btn">
                For law firms
              </Link>
            </div>
            <p className="fine" style={{ margin: "18px 0 0" }}>
              {r.height === null ? "Live prices unavailable" : <>Read live · BTC {usd(r.btc)} · ETH {usd(r.eth)}</>}
            </p>
            <ul className="promise-list">
              <li>Fixed fees, never a percentage</li>
              <li>Every figure sealed and verifiable</li>
              <li>We never hold assets or keys</li>
            </ul>
          </div>
          <HeroFigure />
        </div>
      </section>

      <section className="section tinted" id="check">
        <div className="wrap">
          <div className="section-head">
            <span className="kicker">Free address check</span>
            <h2>
              Have an address? <em>Read it now.</em>
            </h2>
            <p className="section-intro">
              Its balance today and on any valuation date, read live from the public ledger, with every source named and the
              record sealed.
            </p>
          </div>
          <AddressInstrument />
        </div>
      </section>

      <section className="section" id="matters">
        <div className="wrap">
          <div className="section-head">
            <span className="kicker">Who we work for</span>
            <h2>
              Two kinds of matter. <em>One method.</em>
            </h2>
            <p className="section-intro">
              Whether the crypto was forgotten or hidden, the work is the same: trace it, value it on the right date, and prove
              it.
            </p>
          </div>
          <div className="columns two">
            <div>
              <div className="fig">Estates</div>
              <h3>Probate attorneys, executors and fiduciaries.</h3>
              <p>
                Find what the deceased held, value it on the date of death for the inventory and the estate tax return, and get
                exchange accounts released to the estate. The report holds up when a beneficiary or the IRS asks how the number
                was reached.
              </p>
            </div>
            <div>
              <div className="fig">Divorce &amp; bankruptcy</div>
              <h3>Family law attorneys and trustees.</h3>
              <p>
                Bank statements show money going to exchanges. We follow it, read the wallets, and value everything on the date
                of separation or the petition date, so hidden crypto is disclosed on evidence, not suspicion.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section tinted" id="method">
        <div className="wrap">
          <div className="section-head">
            <span className="kicker">What makes it different</span>
            <h2>
              Not an estimate. <em>A reproducible reading.</em>
            </h2>
            <p className="section-intro">
              Forensic accountants charge tens of thousands and take weeks. TraceSworn does the tracing in software, at a fixed
              price, and shows its work.
            </p>
          </div>
          <div className="columns">
            <div>
              <div className="fig">01</div>
              <h3>Statements first.</h3>
              <p>Money reaches crypto through a bank. We scan statements for 24 exchanges, apps and ATM operators, including the legal names they bill under.</p>
            </div>
            <div>
              <div className="fig">02</div>
              <h3>Whole wallets, not guesses.</h3>
              <p>From one hardware-wallet public key we read every address it used, across seven networks, then follow the money hop by hop to where it landed.</p>
            </div>
            <div>
              <div className="fig">03</div>
              <h3>Sealed and checkable.</h3>
              <p>Every record carries a SHA-256 fingerprint and ships as numbered court exhibits. Anyone can confirm at /verify, or with any standard tool, that no figure was changed.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="services">
        <div className="wrap">
          <div className="section-head">
            <span className="kicker">Services &amp; fees</span>
            <h2>
              One fixed fee. <em>No percentages.</em>
            </h2>
            <p className="section-intro" id="fees">
              Agreed in writing before work starts. The fee never depends on how much we find, so nobody can say we had a stake
              in the number.
            </p>
          </div>
          <Pricing />
        </div>
      </section>

      <section className="section tinted" id="process">
        <div className="wrap">
          <div className="section-head">
            <span className="kicker">How a matter runs</span>
            <h2>
              From suspicion <em>to sealed evidence.</em>
            </h2>
          </div>
          <ol className="procedure">
            <li>
              <h3>Engagement</h3>
              <p>Fixed fee, scope and valuation date agreed in writing. We confirm who we act for and the authority to act.</p>
            </li>
            <li>
              <h3>Trace</h3>
              <p>Statements, documents and devices are scanned. Exchange names, addresses and wallet keys are collected.</p>
            </li>
            <li>
              <h3>Read &amp; value</h3>
              <p>Every address is read on the public ledger and valued on each agreed date, with sources named.</p>
            </li>
            <li>
              <h3>Seal</h3>
              <p>The findings report and its evidence record are sealed with a SHA-256 fingerprint and delivered.</p>
            </li>
            <li>
              <h3>Recover</h3>
              <p>Exchange records or claim requests are drafted for counsel to send, and followed up until resolved.</p>
            </li>
          </ol>
        </div>
      </section>

      <section className="section" id="rules">
        <div className="wrap">
          <div className="section-head">
            <span className="kicker">Our standards</span>
            <h2>
              Evidence you can <em>stand behind.</em>
            </h2>
          </div>
          <div className="pledges">
            <div><b>Read-only, always.</b><span>We never ask for private keys or recovery phrases and never move or hold assets.</span></div>
            <div><b>Fixed fees.</b><span>Agreed before work starts and never tied to the amount found or recovered.</span></div>
            <div><b>Named sources.</b><span>Every balance and price says where and when it was read. Nothing is estimated.</span></div>
            <div><b>Verifiable records.</b><span>Each record is sealed with a SHA-256 fingerprint anyone can recompute.</span></div>
            <div><b>Counsel stays counsel.</b><span>We don&rsquo;t give legal or tax advice; we work to the instructions of the attorney or fiduciary.</span></div>
            <div><b>Honest limits.</b><span>Where public data can&rsquo;t show something, such as an exchange balance or a historical Ethereum balance, the report says so.</span></div>
          </div>
        </div>
      </section>

      <section className="section" id="scan" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="banner">
            <div>
              <h2 style={{ marginBottom: 12 }}>
                Start with the <em>bank statements.</em>
              </h2>
              <p>
                Drop in statement exports. They are read in your browser and never uploaded, and every payment to or from a
                crypto exchange is flagged with its date and amount.
              </p>
            </div>
            <Link href="/tools/statements" className="btn">
              Open the statement scan <span className="arrow">→</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="section tinted faq" id="faq">
        <div className="wrap">
          <div className="section-head">
            <span className="kicker">Questions</span>
            <h2>
              What counsel <em>asks us.</em>
            </h2>
          </div>
          <details>
            <summary>Can you see what&rsquo;s inside an exchange account?</summary>
            <p>Not from public data. Exchange balances are private. We find which exchanges were used, from statements, emails and transfers, and draft the records request, subpoena support or deceased-account claim so the exchange produces them.</p>
          </details>
          <details>
            <summary>How do I prove the report wasn&rsquo;t altered?</summary>
            <p>Every record carries a SHA-256 fingerprint of its exact contents. Anyone can upload it at /verify, or recompute the hash with any standard tool. If a single figure changed, the fingerprint won&rsquo;t match.</p>
          </details>
          <details>
            <summary>What valuation date do you use?</summary>
            <p>Whatever the matter requires: date of death, date of separation, trial date or petition date. Additional dates are a fixed add-on. Prices are daily closing prices from named public sources.</p>
          </details>
          <details>
            <summary>Why a fixed fee instead of a percentage?</summary>
            <p>So no one can argue we had a stake in the number. The fee is the same whether we find $5,000 or $5 million.</p>
          </details>
          <details>
            <summary>Can you show where hidden crypto went?</summary>
            <p>Yes, on Bitcoin. The tracing map follows funds transaction by transaction, groups wallets that were spent together, and marks where funds reached an exchange, which tells counsel whom to subpoena. Try one hop free at <Link href="/tools/trace">/tools/trace</Link>.</p>
          </details>
          <details>
            <summary>Can you tell us if assets move while the matter is open?</summary>
            <p>Asset-movement alerts watch every address in the matter daily. If anything moves, you get a sealed alert record the same day, ready to bring to the court. $750 a month per matter, cancel any month.</p>
          </details>
          <details>
            <summary>Do you need private keys or recovery phrases?</summary>
            <p>Never online. Public addresses and hardware-wallet public keys (xpub/zpub) are enough to trace and value. Any device or phrase work is done offline, on the owner&rsquo;s own device, with authority.</p>
          </details>
          <details>
            <summary>Do you testify?</summary>
            <p>We provide a written methodology appendix with the Evidence Package. Testimony arrangements are agreed separately, case by case.</p>
          </details>
        </div>
      </section>

      <section className="section" id="open-a-case">
        <div className="wrap">
          <div className="section-head">
            <span className="kicker">Get started</span>
            <h2>
              Open a <em>matter.</em>
            </h2>
            <p className="section-intro">
              Tell us about the matter. A person replies within one business day. Please don&rsquo;t include passwords, keys or
              recovery phrases.
            </p>
          </div>
          <div className="form-card">
            <Suspense fallback={null}>
              <IntakeForm />
            </Suspense>
          </div>
        </div>
      </section>
    </>
  );
}
