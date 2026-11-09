import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCaseByToken } from "@/lib/cases";
import { STAGES, stage } from "@/lib/playbook";
import { packageById, priceLabel, payLink, casePayLink } from "@/lib/pricing";
import { PortalFindings } from "@/components/PortalFindings";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your case — TraceSworn", robots: { index: false, follow: false } };

const FAMILY_STEPS = ["new", "contacted", "engaged", "authority", "discovery", "findings", "claims", "recovered", "closed"];
const usd = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default async function CasePortal({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const c = await getCaseByToken(token);
  if (!c) notFound();
  const st = stage(c.status);
  const idx = FAMILY_STEPS.indexOf(st.id);
  const p = packageById(c.package);
  const link = p ? payLink(p.id) : null;
  const pay = link ? casePayLink(link, c.id, c.email) : null;
  const r = c.report_approved ? c.report : null;

  return (
    <section className="wrap" style={{ padding: "40px 0 96px", display: "grid", gap: 22 }}>
      <div>
        <span className="kicker">Your private case page</span>
        <h1 className="serif" style={{ fontSize: "clamp(34px, 5vw, 56px)", lineHeight: 1.05, letterSpacing: "-0.03em", margin: "0 0 10px" }}>
          Hello, {c.name.split(" ")[0]}.
        </h1>
        <p className="muted" style={{ margin: 0, maxWidth: "40em" }}>
          This page is only for you. Bookmark it. We&rsquo;ll update it as your case moves forward. Never share passwords or
          recovery phrases here, by email, or with anyone who contacts you.
        </p>
      </div>

      <div className="form-card">
        <h3>Where things stand</h3>
        {st.id === "declined" ? (
          <p className="muted">We&rsquo;ve looked carefully and don&rsquo;t believe we can recover these assets. We&rsquo;ve explained why by email.</p>
        ) : (
          <div className="steps4" style={{ marginTop: 6 }}>
            {FAMILY_STEPS.map((id, i) => (
              <div key={id} className={i <= idx ? "done" : ""}>
                <span>{String(i + 1).padStart(2, "0")}</span>
                {STAGES.find((s) => s.id === id)!.name}
              </div>
            ))}
          </div>
        )}
      </div>

      {p ? (
        <div className="form-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div>
            <span className="label">Your package</span>
            <h3 style={{ margin: "4px 0 0" }}>
              {p.name} · {priceLabel(p)}
              {p.cadence === "once" ? " flat" : ""}
            </h3>
            <p className="fine" style={{ margin: "4px 0 0" }}>Fixed price, agreed in writing. Never a percentage of the estate.</p>
          </div>
          {c.paid_at ? (
            <span className="stamp stamp-found">Paid {new Date(c.paid_at).toLocaleDateString("en-US")}</span>
          ) : pay ? (
            <a className="btn btn-primary" href={pay} rel="noreferrer">Pay securely with Stripe <span className="arrow">→</span></a>
          ) : null}
        </div>
      ) : null}

      {r ? (
        <div className="form-card">
          <h3>Your findings report</h3>
          <p className="fine" style={{ marginTop: 0 }}>Read {r.readAt.slice(0, 16).replace("T", " ")} UTC from public sources.</p>
          <div className="totals">
            <div><div className="label">Value today</div><div className="big">{usd(r.totalNow)}</div></div>
            <div><div className="label">On the date of death</div><div className="big">{r.totalAtDate !== null ? usd(r.totalAtDate) : "—"}</div>{r.totalAtDate !== null && !r.atDateComplete ? <div className="fine">Partial</div> : null}</div>
            <div><div className="label">Holdings</div><div className="big">{r.rows.filter((x) => x.balanceNow > 0 || (x.balanceAtDate ?? 0) > 0).length}</div></div>
          </div>
          {c.drafts?.summary ? <p style={{ whiteSpace: "pre-wrap" }}>{c.drafts.summary}</p> : null}
          <div className="table-scroll">
            <table className="clue-table">
              <thead><tr><th>Holding</th><th style={{ textAlign: "right" }}>Today</th><th style={{ textAlign: "right" }}>Date of death</th></tr></thead>
              <tbody>
                {r.rows.filter((x) => x.balanceNow > 0 || (x.balanceAtDate ?? 0) > 0).map((x, i) => (
                  <tr key={i}>
                    <td><b>{x.asset}</b> on {x.network}<div className="snippet"><a href={x.explorer} target="_blank" rel="noreferrer">{x.address}</a></div></td>
                    <td className="num">{x.valueNow === null ? "—" : usd(x.valueNow)}</td>
                    <td className="num">{x.valueAtDate === null ? "—" : usd(x.valueAtDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="fine">{r.sources.join(" · ")}</p>
        </div>
      ) : null}

      {!["closed", "declined", "recovered"].includes(st.id) ? <PortalFindings token={c.token} /> : null}
    </section>
  );
}
