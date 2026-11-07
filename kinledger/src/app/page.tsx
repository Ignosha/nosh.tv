import Link from "next/link";
import { ledgerReading } from "@/lib/chains";
import { IntakeForm } from "@/components/IntakeForm";
import { EstateFigure } from "@/components/EstateFigure";
import { AddressInstrument } from "@/components/AddressInstrument";
import { Mark } from "@/components/Mark";

export const revalidate = 60;

const usd = (n: number | null) =>
  n === null ? "unavailable" : "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default async function Home() {
  const r = await ledgerReading();
  const readAt = new Date(r.readAt);

  return (
    <>
      <div className="wrap">
        <div className="desk-strip" aria-label="Live ledger status">
          <span className="title">
            <Mark size={18} /> The Estate Desk
          </span>
          <span>
            Bitcoin ledger / {r.height === null ? "UNAVAILABLE" : <b>LIVE · block #{r.height.toLocaleString("en-US")}</b>}
          </span>
          <span className="right">
            BTC {usd(r.btc)} · ETH {usd(r.eth)} · SOL {usd(r.sol)} · {readAt.toUTCString().slice(0, 16)}
          </span>
        </div>
      </div>

      <section className="hero">
        <div className="wrap hero-grid">
          <div>
            <span className="eyebrow">Crypto estate recovery for families &amp; attorneys</span>
            <h1>
              What they left is still on the ledger.
              <br />
              <em>Let&rsquo;s find it.</em>
            </h1>
            <p className="lede">
              Kinledger finds the crypto a loved one left behind, recovers what can honestly be recovered, and documents
              its value for the estate — working alongside your attorney, never around them.
            </p>
            <div className="hero-actions">
              <Link href="/scan" className="btn btn-solid">
                Run a free estate scan <span className="arrow">↗</span>
              </Link>
              <Link href="#open-a-case" className="btn">
                Open a case <span className="arrow">→</span>
              </Link>
            </div>
            <p className="fine" style={{ marginTop: 18 }}>
              No upfront recovery fee · We never hold your funds · We never ask for a recovery phrase
            </p>
          </div>
          <EstateFigure />
        </div>
      </section>

      <section className="section" id="instrument">
        <div className="wrap">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 24, flexWrap: "wrap", marginBottom: 32 }}>
            <div>
              <span className="label">01 / Try the instrument</span>
              <h2 className="serif" style={{ fontSize: "clamp(32px, 4.4vw, 52px)", lineHeight: 1.04, letterSpacing: "-0.02em", margin: "12px 0 0" }}>
                Start with one address.
                <br />
                <em style={{ color: "var(--accent)" }}>Keep the record.</em>
              </h2>
            </div>
            <p className="muted" style={{ maxWidth: 24 + "em", margin: 0 }}>
              Read what an address holds today and on the date of death, with every source named.
            </p>
          </div>
          <AddressInstrument />
        </div>
      </section>

      <section className="section" id="problem">
        <div className="wrap">
          <div className="section-head">
            <div className="docket-no">§ 02</div>
            <div>
              <h2>
                Crypto doesn&rsquo;t pass on <em>by itself.</em>
              </h2>
              <p className="section-intro">
                There is no bank to call and no statement in the mail. When someone dies holding crypto, the family runs
                into three walls.
              </p>
            </div>
          </div>
          <div className="columns">
            <div>
              <div className="fig">I. FINDING IT</div>
              <h3>Nobody knows where it is.</h3>
              <p>Which exchanges, which wallets, which coins? The clues are scattered across email, bank statements, devices and paper notes.</p>
            </div>
            <div>
              <div className="fig">II. GETTING IN</div>
              <h3>The doors are locked.</h3>
              <p>Exchange accounts freeze on death. Self-custody wallets need a password or recovery phrase that may be half-remembered or partly written down.</p>
            </div>
            <div>
              <div className="fig">III. PROVING IT</div>
              <h3>The estate needs numbers.</h3>
              <p>Probate, estate tax and a fair split all need the holdings valued on the date of death, with evidence an attorney can rely on.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="services">
        <div className="wrap">
          <div className="section-head">
            <div className="docket-no">§ 03</div>
            <div>
              <h2>
                Services and <em>fees.</em>
              </h2>
              <p className="section-intro" id="fees">
                Flat fees for documentation. Contingency for recovery, so you pay nothing if we find nothing. Every case
                starts with a written engagement letter.
              </p>
            </div>
          </div>
          <table className="schedule">
            <thead>
              <tr>
                <th scope="col">Service</th>
                <th scope="col">What we do</th>
                <th scope="col" style={{ textAlign: "right" }}>Fee</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Discovery search</td>
                <td>We search email, statements, devices and papers for exchanges, wallets and addresses, then read every address on the public ledger.</td>
                <td className="fee">$500 – 2,500<span className="when">flat, by scope</span></td>
              </tr>
              <tr>
                <td>Exchange claims</td>
                <td>We prepare and follow each exchange&rsquo;s deceased-account process with the executor: certificates, court letters, follow-ups.</td>
                <td className="fee">$500 – 1,500<span className="when">per exchange</span></td>
              </tr>
              <tr>
                <td>Wallet access</td>
                <td>Password and partial-phrase recovery on the estate&rsquo;s own devices, offline, using open-source tools. Funds stay in the estate&rsquo;s control.</td>
                <td className="fee">10 – 20%<span className="when">of value recovered</span></td>
              </tr>
              <tr>
                <td>Date-of-death valuation</td>
                <td>A sourced report of every holding, its balance and its price on the date of death, for the attorney and accountant.</td>
                <td className="fee">$300 – 1,000<span className="when">flat</span></td>
              </tr>
              <tr>
                <td>Legacy planning</td>
                <td>For the living: a documented, secure plan so your family can reach your crypto without ever exposing your keys today.</td>
                <td className="fee">from $500<span className="when">or yearly review</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="section" id="process">
        <div className="wrap">
          <div className="section-head">
            <div className="docket-no">§ 04</div>
            <div>
              <h2>
                How a case <em>runs.</em>
              </h2>
              <p className="section-intro">Every step is written down. You always know what we are doing and why.</p>
            </div>
          </div>
          <ol className="procedure">
            <li>
              <h3>Authority first</h3>
              <p>We confirm who may act for the estate: death certificate and letters testamentary or administration, or a letter from the estate&rsquo;s attorney.</p>
            </li>
            <li>
              <h3>Discovery</h3>
              <p>We gather clues from documents and devices and read every address we find on the public ledger.</p>
            </li>
            <li>
              <h3>Findings report</h3>
              <p>You receive a plain account of what exists, what can be reached, what cannot, and what it is worth.</p>
            </li>
            <li>
              <h3>Recovery</h3>
              <p>We run the exchange claims and wallet work. Recovered assets go straight to an account or wallet the estate controls.</p>
            </li>
            <li>
              <h3>Close-out</h3>
              <p>A final valuation and evidence file for the attorney and accountant, and secure disposal of anything we were given.</p>
            </li>
          </ol>
        </div>
      </section>

      <section className="section" id="attorneys">
        <div className="wrap">
          <div className="section-head">
            <div className="docket-no">§ 05</div>
            <div>
              <h2>
                For estate <em>attorneys.</em>
              </h2>
              <p className="section-intro">
                When a file mentions crypto, refer it to us. You stay counsel; we handle the technical work and hand you
                evidence you can file.
              </p>
            </div>
          </div>
          <div className="columns">
            <div>
              <div className="fig">NO COST TO REFER</div>
              <h3>Nothing found, nothing owed.</h3>
              <p>Recovery work is contingent. Your client is never billed for a search that turns up nothing recoverable.</p>
            </div>
            <div>
              <div className="fig">EVIDENCE YOU CAN USE</div>
              <h3>Sourced, dated, reproducible.</h3>
              <p>Every balance and price in our reports names its public source and the time it was read, so anyone can check it.</p>
            </div>
            <div>
              <div className="fig">YOUR LANE STAYS YOURS</div>
              <h3>No legal or tax advice.</h3>
              <p>We do not advise on law or tax and do not file returns. We work to your instructions and your client&rsquo;s authority.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="rules">
        <div className="wrap">
          <div className="section-head">
            <div className="docket-no">§ 06</div>
            <div>
              <h2>
                The rules we <em>keep.</em>
              </h2>
              <p className="section-intro">
                Recovery attracts scammers who prey on grieving families. These rules are how you can tell us apart.
              </p>
            </div>
          </div>
          <div className="pledges">
            <div><b>No upfront recovery fees.</b><span>We are paid from success, under a written agreement, never before.</span></div>
            <div><b>We never hold the assets.</b><span>Recovered funds go directly to the estate&rsquo;s own account or wallet.</span></div>
            <div><b>We never ask for a phrase online.</b><span>Recovery phrases are handled offline, in person or on the estate&rsquo;s device. Never by form, email or chat.</span></div>
            <div><b>Proof of authority, always.</b><span>We only act for someone legally entitled to act for the estate.</span></div>
            <div><b>Honest refusals.</b><span>A fully lost phrase or stolen funds usually cannot be recovered. We will say so and not take your money.</span></div>
            <div><b>Real data, named sources.</b><span>No estimates passed off as readings. If a figure is unavailable, the report says so.</span></div>
          </div>
        </div>
      </section>

      <section className="section" id="scan">
        <div className="wrap">
          <div className="section-head">
            <div className="docket-no">§ 07</div>
            <div>
              <h2>
                Start with a free <em>estate scan.</em>
              </h2>
              <p className="section-intro">
                Drop in exported emails, statements or notes. The scan runs in your browser — your documents never leave
                your computer — and finds exchanges, wallets and addresses. Addresses it finds are then read on the public
                ledger and valued on the date of death.
              </p>
            </div>
          </div>
          <Link href="/scan" className="btn btn-primary">Open the estate scan</Link>
        </div>
      </section>

      <section className="section faq" id="faq">
        <div className="wrap">
          <div className="section-head">
            <div className="docket-no">§ 08</div>
            <div>
              <h2>
                Questions <em>families ask.</em>
              </h2>
            </div>
          </div>
          <details>
            <summary>Can you recover crypto if the recovery phrase is completely lost?</summary>
            <p>Usually not. Without the phrase or a wallet file and its password, a self-custody wallet cannot be opened by anyone. If you have part of the phrase, a wallet file, or the device, the odds improve a great deal. Exchange accounts are different: the exchange holds the assets and has a process for estates.</p>
          </details>
          <details>
            <summary>What if the crypto was stolen?</summary>
            <p>Stolen funds are rarely recoverable, and anyone promising otherwise for an upfront fee is likely running a scam. We can document what happened for police and the exchanges involved, but we will not charge you a recovery fee for it.</p>
          </details>
          <details>
            <summary>Do I need an attorney?</summary>
            <p>Exchanges require proof that you are entitled to act for the estate, usually court-issued letters. Most families work with an estate attorney; we are happy to work with yours or explain what the exchanges ask for.</p>
          </details>
          <details>
            <summary>Will you ever hold the estate&rsquo;s crypto?</summary>
            <p>No. Recovered funds go to an account or wallet the estate controls. We never take custody.</p>
          </details>
          <details>
            <summary>How long does it take?</summary>
            <p>Discovery and valuation typically take one to three weeks. Exchange claims depend on the exchange and on court paperwork, and commonly take several weeks to a few months.</p>
          </details>
        </div>
      </section>

      <section className="section" id="open-a-case">
        <div className="wrap">
          <div className="section-head">
            <div className="docket-no">§ 09</div>
            <div>
              <h2>
                Open a <em>case.</em>
              </h2>
              <p className="section-intro">
                Tell us what you know. A person, not a bot, replies within one business day. Please do not include
                passwords or recovery phrases.
              </p>
            </div>
          </div>
          <IntakeForm />
        </div>
      </section>
    </>
  );
}
