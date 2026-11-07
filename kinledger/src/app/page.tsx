import Link from "next/link";
import { ledgerReading } from "@/lib/chains";
import { IntakeForm } from "@/components/IntakeForm";
import { CaseFolders } from "@/components/CaseFolders";
import { AddressInstrument } from "@/components/AddressInstrument";

export const revalidate = 60;

const usd = (n: number | null) =>
  n === null ? "unavailable" : "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default async function Home() {
  const r = await ledgerReading();
  const readAt = new Date(r.readAt);

  return (
    <>
      <section className="hero">
        <div className="wrap hero-grid">
          <div>
            <span className="live-pill" aria-label="Live ledger reading">
              <span className={`dot${r.height === null ? " off" : ""}`} />
              {r.height === null ? (
                "Live ledger reading unavailable"
              ) : (
                <>
                  <b>Live</b> Bitcoin block {r.height.toLocaleString("en-US")} · BTC {usd(r.btc)} · ETH {usd(r.eth)}
                </>
              )}
            </span>
            <h1>
              What they left behind <em>can still be found.</em>
            </h1>
            <p className="lede">
              Kinledger helps families and executors find the crypto a loved one left, recover what can honestly be
              recovered, and document its value for the estate.
            </p>
            <div className="hero-actions">
              <Link href="/scan" className="btn btn-primary">
                Run a free estate scan <span className="arrow">→</span>
              </Link>
              <Link href="#open-a-case" className="btn">
                Talk to us
              </Link>
            </div>
            <ul className="promise-list">
              <li>No upfront recovery fee</li>
              <li>We never hold your funds</li>
              <li>We never ask for a recovery phrase</li>
            </ul>
          </div>
          <CaseFolders />
        </div>
      </section>

      <section className="section tinted" id="check">
        <div className="wrap">
          <div className="section-head">
            <span className="kicker">Free address check</span>
            <h2>
              Found an address? <em>Check it now.</em>
            </h2>
            <p className="section-intro">
              See what it holds today and on the date of death, read live from the public ledger with every source named.
            </p>
          </div>
          <AddressInstrument />
        </div>
      </section>

      <section className="section" id="problem">
        <div className="wrap">
          <div className="section-head">
            <span className="kicker">The problem</span>
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
              <div className="fig">01</div>
              <h3>Nobody knows where it is.</h3>
              <p>Which exchanges, which wallets, which coins? The clues are scattered across email, bank statements, devices and paper notes.</p>
            </div>
            <div>
              <div className="fig">02</div>
              <h3>The doors are locked.</h3>
              <p>Exchange accounts freeze on death. Self-custody wallets need a password or recovery phrase that may be half-remembered or partly written down.</p>
            </div>
            <div>
              <div className="fig">03</div>
              <h3>The estate needs numbers.</h3>
              <p>Probate, estate tax and a fair split all need the holdings valued on the date of death, with evidence an attorney can rely on.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section tinted" id="services">
        <div className="wrap">
          <div className="section-head">
            <span className="kicker">Services &amp; fees</span>
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
            <span className="kicker">How it works</span>
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

      <section className="section tinted" id="attorneys">
        <div className="wrap">
          <div className="section-head">
            <span className="kicker">For attorneys</span>
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
              <span className="stamp stamp-found" style={{ marginBottom: 14 }}>No cost to refer</span>
              <h3>Nothing found, nothing owed.</h3>
              <p>Recovery work is contingent. Your client is never billed for a search that turns up nothing recoverable.</p>
            </div>
            <div>
              <span className="stamp stamp-found" style={{ marginBottom: 14 }}>Evidence you can use</span>
              <h3>Sourced, dated, reproducible.</h3>
              <p>Every balance and price in our reports names its public source and the time it was read, so anyone can check it.</p>
            </div>
            <div>
              <span className="stamp stamp-found" style={{ marginBottom: 14 }}>Your lane stays yours</span>
              <h3>No legal or tax advice.</h3>
              <p>We do not advise on law or tax and do not file returns. We work to your instructions and your client&rsquo;s authority.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="rules">
        <div className="wrap">
          <div className="section-head">
            <span className="kicker">Our promises</span>
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

      <section className="section" id="scan" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="banner">
            <div>
              <h2 style={{ marginBottom: 12 }}>
                Start with a free <em>estate scan.</em>
              </h2>
              <p>
                Drop in exported emails, statements or notes. They are read in your browser and never uploaded. The scan
                finds exchanges, wallets and addresses, then reads each address live and values it on the date of death.
              </p>
            </div>
            <Link href="/scan" className="btn">
              Open the estate scan <span className="arrow">→</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="section tinted faq" id="faq">
        <div className="wrap">
          <div className="section-head">
            <span className="kicker">Questions</span>
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
            <span className="kicker">Get started</span>
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
          <div className="form-card">
            <IntakeForm />
          </div>
        </div>
      </section>
    </>
  );
}
