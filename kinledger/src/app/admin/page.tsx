import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type Case = {
  id: string;
  created_at: string;
  role: string;
  name: string;
  email: string;
  phone: string | null;
  region: string | null;
  date_of_death: string | null;
  known_holdings: string | null;
  devices: string | null;
  has_authority: string | null;
  message: string | null;
  status: string;
};

export default async function Admin() {
  const client = db();
  if (!client) return <div className="wrap" style={{ padding: "48px 0" }}><div className="notice err">Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to see cases.</div></div>;
  const { data, error } = await client.from("kl_cases").select("*").order("created_at", { ascending: false }).limit(200);
  const cases = (data ?? []) as Case[];
  return (
    <div className="wrap" style={{ padding: "40px 0 80px" }}>
      <span className="label">Case docket</span>
      <h1 className="serif" style={{ fontSize: 44, margin: "6px 0 24px" }}>{cases.length} case{cases.length === 1 ? "" : "s"}</h1>
      {error ? <div className="notice err">{error.message}</div> : null}
      <div className="table-scroll">
        <table className="clue-table">
          <thead>
            <tr><th>Opened</th><th>Contact</th><th>Estate</th><th>What they know</th></tr>
          </thead>
          <tbody>
            {cases.map((c) => (
              <tr key={c.id}>
                <td className="mono" style={{ whiteSpace: "nowrap" }}>{c.created_at.slice(0, 16).replace("T", " ")}<div className="snippet">{c.status}</div></td>
                <td>
                  <b style={{ fontWeight: 500 }}>{c.name}</b> <span className="faint">({c.role})</span>
                  <div className="snippet"><a href={`mailto:${c.email}`}>{c.email}</a>{c.phone ? ` · ${c.phone}` : ""}</div>
                </td>
                <td className="mono" style={{ fontSize: 13 }}>
                  {c.date_of_death ?? "date unknown"}<div className="snippet">{c.region ?? ""} · letters: {c.has_authority ?? "?"}</div>
                </td>
                <td style={{ fontSize: 14 }}>
                  {c.known_holdings}<div className="snippet">{c.devices}</div><div className="snippet">{c.message}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
