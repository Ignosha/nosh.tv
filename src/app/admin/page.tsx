import Link from "next/link";
import { db } from "@/lib/db";
import { STAGES, stage } from "@/lib/playbook";
import { packageById, priceLabel } from "@/lib/pricing";
import type { Case } from "@/lib/cases";

export const dynamic = "force-dynamic";

const usd = (cents: number) => "$" + (cents / 100).toLocaleString("en-US", { maximumFractionDigits: 0 });

export default async function Admin() {
  const client = db();
  if (!client) {
    return (
      <div className="wrap" style={{ padding: "48px 0" }}>
        <div className="notice err">Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, then run supabase/schema.sql, to see cases.</div>
      </div>
    );
  }
  const { data, error } = await client.from("kl_cases").select("*").order("created_at", { ascending: false }).limit(300);
  const cases = (data ?? []) as Case[];
  const now = Date.now();
  const open = cases.filter((c) => !["closed", "declined"].includes(String(c.status)));
  const due = open.filter((c) => c.next_followup_at && Date.parse(c.next_followup_at) <= now);
  const paidMonth = cases
    .filter((c) => c.paid_at && new Date(c.paid_at).getMonth() === new Date().getMonth() && new Date(c.paid_at).getFullYear() === new Date().getFullYear())
    .reduce((s, c) => s + (c.amount_paid ?? 0), 0);

  const Row = ({ c }: { c: Case }) => {
    const p = packageById(c.package);
    return (
      <tr>
        <td>
          <Link href={`/admin/cases/${c.id}`} style={{ fontWeight: 600 }}>{c.name}</Link>
          <div className="snippet">{c.email} · {c.role}</div>
        </td>
        <td><span className="stamp stamp-pending">{stage(c.status).name}</span></td>
        <td>{p ? `${p.name} · ${priceLabel(p)}` : <span className="faint">—</span>}</td>
        <td>{c.paid_at ? <span className="stamp stamp-found">Paid {usd(c.amount_paid ?? 0)}</span> : <span className="faint">Not paid</span>}</td>
        <td className="mono" style={{ fontSize: 12.5, whiteSpace: "nowrap" }}>{c.next_followup_at ? c.next_followup_at.slice(0, 10) : "—"}</td>
      </tr>
    );
  };
  const Table = ({ list }: { list: Case[] }) => (
    <div className="table-scroll">
      <table className="clue-table">
        <thead><tr><th>Case</th><th>Stage</th><th>Package</th><th>Payment</th><th>Follow up</th></tr></thead>
        <tbody>{list.map((c) => <Row key={c.id} c={c} />)}</tbody>
      </table>
    </div>
  );

  return (
    <div className="wrap" style={{ padding: "36px 0 96px", display: "grid", gap: 22 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
        <div>
          <span className="kicker">Case desk</span>
          <h1 className="serif" style={{ fontSize: 44, margin: 0 }}>Good to see you.</h1>
        </div>
        <Link className="btn btn-small" href="/admin/playbook">Open the playbook</Link>
      </div>
      {error ? <div className="notice err">{error.message}. Did you run the latest supabase/schema.sql?</div> : null}

      <div className="totals">
        <div><div className="label">Due today</div><div className="big">{due.length}</div></div>
        <div><div className="label">Open cases</div><div className="big">{open.length}</div></div>
        <div><div className="label">Paid this month</div><div className="big">{usd(paidMonth)}</div></div>
      </div>

      <div className="form-card">
        <h3>Due now</h3>
        {due.length ? <Table list={due} /> : <p className="muted">Nothing due. Nice.</p>}
      </div>

      <div className="form-card">
        <h3>All cases</h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
          {STAGES.map((s) => {
            const n = cases.filter((c) => stage(c.status).id === s.id).length;
            return n ? <span key={s.id} className="addon">{s.name}: {n}</span> : null;
          })}
        </div>
        {cases.length ? <Table list={cases} /> : <p className="muted">No cases yet. They appear here when someone uses the form or pays.</p>}
      </div>
    </div>
  );
}
