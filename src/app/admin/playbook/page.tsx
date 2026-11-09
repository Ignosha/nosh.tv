import { STAGES, OBJECTIONS } from "@/lib/playbook";

export const metadata = { title: "Playbook — TraceSworn" };

export default function Playbook() {
  return (
    <div className="wrap" style={{ padding: "36px 0 96px", display: "grid", gap: 18 }}>
      <div>
        <span className="kicker">Playbook</span>
        <h1 className="serif" style={{ fontSize: 44, margin: "0 0 8px" }}>How to run every matter.</h1>
        <p className="muted" style={{ margin: 0, maxWidth: "44em" }}>
          Each stage: the goal, what to check, exactly what to say, and what never to do. The same guidance appears on
          every matter page with the client&rsquo;s details filled in.
        </p>
      </div>

      <div className="form-card">
        <h3>Five rules that protect you and your client</h3>
        <ol style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 6 }}>
          <li>Never ask for, accept or store a recovery phrase, password or private key online.</li>
          <li>Never receive estate funds. Recovered assets go to the estate&rsquo;s own account.</li>
          <li>Confirm legal authority (court letters or attorney letter) before acting for an estate.</li>
          <li>Never guarantee recovery. Tell the truth early, including bad news.</li>
          <li>No legal or tax advice: &ldquo;That&rsquo;s a question for your attorney.&rdquo;</li>
        </ol>
      </div>

      {STAGES.map((s, i) => (
        <details key={s.id} className="form-card" open={i === 0}>
          <summary style={{ cursor: "pointer" }}>
            <span className="kicker" style={{ marginBottom: 6 }}>{String(i + 1).padStart(2, "0")}</span>
            <h3 style={{ display: "inline", marginLeft: 10 }}>{s.name}</h3>
          </summary>
          <p className="muted"><b>Goal:</b> {s.goal}</p>
          <ul>{s.checklist.map((x) => <li key={x}>{x}</li>)}</ul>
          {s.avoid.length ? <div className="notice warn"><b>Avoid:</b> {s.avoid.join(" · ")}</div> : null}
          <div className="label" style={{ margin: "14px 0 6px" }}>What to say</div>
          <pre className="letter" style={{ fontSize: 14 }}>{s.say}</pre>
          <div className="label" style={{ margin: "14px 0 6px" }}>Email: {s.email.subject}</div>
          <pre className="letter" style={{ fontSize: 14 }}>{s.email.body}</pre>
          <p className="fine">Automatic reminder: {s.followupDays ? `every ${s.followupDays} day(s) while in this stage` : "none"}</p>
        </details>
      ))}

      <div className="form-card">
        <h3>Hard questions, honest answers</h3>
        {OBJECTIONS.map((o) => (
          <div key={o.q} style={{ padding: "12px 0", borderBottom: "1px solid var(--line)" }}>
            <b>&ldquo;{o.q}&rdquo;</b>
            <p className="muted" style={{ margin: "4px 0 0" }}>{o.a}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
