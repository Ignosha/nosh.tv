import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { PACKAGES } from "@/lib/pricing";

const STATUSES = ["new", "contacted", "engaged", "discovery", "claims filed", "recovered", "closed", "declined"];

async function setStatus(form: FormData) {
  "use server";
  // /admin is behind basic auth in middleware, and server actions post to this same route.
  const client = db();
  const id = String(form.get("id") ?? "");
  const status = String(form.get("status") ?? "");
  if (!client || !id || !STATUSES.includes(status)) return;
  await client.from("kl_cases").update({ status }).eq("id", id);
  revalidatePath("/admin");
}

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
  package: string | null;
};

export default async function Admin() {
  const client = db();
  if (!client) return <div className="wrap" style={{ padding: "48px 0" }}><div className="notice err">Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to see cases.</div></div>;
  const { data, error } = await client.from("kl_cases").select("*").order("created_at", { ascending: false }).limit(200);
  const cases = (data ?? []) as Case[];
  return (
    <div className="wrap" style={{ padding: "40px 0 80px" }}>
      <span className="kicker">Case docket</span>
      <h1 className="serif" style={{ fontSize: 44, margin: "6px 0 12px" }}>{cases.length} case{cases.length === 1 ? "" : "s"}</h1>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
        {STATUSES.map((st) => {
          const n = cases.filter((c) => c.status === st).length;
          return n ? <span key={st} className="stamp stamp-pending">{st}: {n}</span> : null;
        })}
      </div>
      {error ? <div className="notice err">{error.message}</div> : null}
      <div className="table-scroll">
        <table className="clue-table">
          <thead>
            <tr><th>Opened</th><th>Contact</th><th>Estate</th><th>What they know</th></tr>
          </thead>
          <tbody>
            {cases.map((c) => (
              <tr key={c.id}>
                <td className="mono" style={{ whiteSpace: "nowrap" }}>
                  {c.created_at.slice(0, 16).replace("T", " ")}
                  <form action={setStatus} style={{ display: "flex", gap: 6, marginTop: 8 }}>
                    <input type="hidden" name="id" value={c.id} />
                    <select name="status" defaultValue={c.status} className="boxed-input" style={{ padding: "6px 8px", fontSize: 12.5 }}>
                      {STATUSES.map((s) => <option key={s}>{s}</option>)}
                    </select>
                    <button className="btn btn-small" type="submit">Save</button>
                  </form>
                </td>
                <td>
                  <b style={{ fontWeight: 600 }}>{c.name}</b> <span className="faint">({c.role})</span>
                  {c.package ? <div><span className="stamp stamp-found" style={{ marginTop: 6 }}>{PACKAGES.find((p) => p.id === c.package)?.name ?? c.package}</span></div> : null}
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
