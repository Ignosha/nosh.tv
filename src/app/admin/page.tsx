import { businessConfig } from "@/lib/config";
import { listLeads } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Admin() {
  const b = businessConfig();
  const leads = await listLeads();
  const fmt = (iso: string) =>
    new Intl.DateTimeFormat("en-US", { timeZone: b.timezone, dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
  const booked = leads.filter((l) => l.status === "booked").length;

  return (
    <main className="page" style={{ maxWidth: 1100 }}>
      <h1>{b.name}: leads</h1>
      <p>
        {leads.length} leads · {booked} booked
      </p>
      {leads.length === 0 ? (
        <p>No leads yet. They appear here as soon as a visitor shares their details.</p>
      ) : (
        <div className="wide">
          <table>
            <thead>
              <tr>
                <th>Received</th>
                <th>Name</th>
                <th>Contact</th>
                <th>Need</th>
                <th>Status</th>
                <th>Appointment</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr key={l.id}>
                  <td>{fmt(l.created_at)}</td>
                  <td>{l.name ?? "—"}</td>
                  <td>
                    {l.email && <a href={`mailto:${l.email}`}>{l.email}</a>}
                    {l.phone && <div>{l.phone}</div>}
                  </td>
                  <td>{l.need ?? "—"}</td>
                  <td>
                    <span className={`badge ${l.status}`}>{l.status}</span>
                  </td>
                  <td>{l.appointment_start ? fmt(l.appointment_start) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
