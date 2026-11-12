import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { firmByToken, sameWeekDue } from "@/lib/firms";
export const dynamic = "force-dynamic";
export const metadata = { title: "Firm Premier portal", robots: { index: false, follow: false } };
async function submit(form: FormData) {
  "use server";
  const token = String(form.get("token"));
  const firm = await firmByToken(token);
  if (!firm) notFound();
  const name = String(form.get("name") ?? "").trim().slice(0,200);
  const matter = String(form.get("matter_type"));
  if (!name || !["estate","divorce","bankruptcy","other"].includes(matter)) throw new Error("Enter a matter name and type");
  const kind = String(form.get("service_kind"));
  const { data, error } = await db()!.rpc("kl_open_firm_matter", {p_token:token,p_name:name,p_type:matter,p_kind:kind,p_due:sameWeekDue()});
  if (error) throw new Error("Matter could not be opened. Monthly capacity may be reached; contact your lead for a separate quote.");
  revalidatePath(`/firm/${token}`);
  redirect(`/case/${data}`);
}
export default async function Portal({ params }: { params: Promise<{ token: string }> }) {
  if (!db()) return <main className="wrap"><h1>Firm portal unavailable</h1><p>Database configuration is required.</p></main>;
  const { token } = await params;
  const firm = await firmByToken(token);
  if (!firm) notFound();
  const client = db()!;
  const [matters, screenings] = await Promise.all([
    client.from("kl_cases").select("id,token,name,status,case_lead,due_at,report_approved").eq("firm_id",firm.id).order("created_at",{ ascending:false }),
    client.from("kl_screenings").select("id,month,status,completed_at").eq("firm_id",firm.id).order("month",{ascending:false}),
  ]);
  if (matters.error || screenings.error) throw new Error("Portal could not load; please retry");
  return <main className="wrap" style={{ padding: "60px 20px" }}><p className="label">Firm Premier · $10,000/month</p><h1>{firm.name}</h1><p>Your named case lead: <strong>{firm.case_lead}</strong>. Initial findings or a documented limitations report by Friday UTC after complete intake and scope confirmation; weekend submissions enter the following week.</p><p>Keep this private portal link confidential. Includes up to 4 investigations and 50 screening matters per calendar month, 25 specialist hours total, and one revision per investigation. Additional work needs a separate written quote. Daily alert enrollment has no per-address fee.</p><h2>New matter</h2><p>Add every new matter here for monthly screening. Use its private case page to submit scan findings.</p><form action={submit} className="form-card"><input type="hidden" name="token" value={token}/><label>Matter reference <input name="name" required maxLength={200}/></label><label>Service <select name="service_kind"><option value="investigation">Investigation (4/month)</option><option value="screening">Screening only (50/month)</option></select></label><label>Matter type <select name="matter_type"><option value="estate">Estate</option><option value="divorce">Divorce</option><option value="bankruptcy">Bankruptcy</option><option value="other">Other</option></select></label><button className="btn btn-primary">Open matter</button></form><h2>Matters</h2>{matters.data?.length ? matters.data.map(m => <article className="form-card" key={m.id}><h3><a href={`/case/${m.token}`}>{m.name}</a></h3><p>{m.status} · Lead: {m.case_lead} · Due: {m.due_at?.slice(0,10)} · {m.report_approved ? "Report published" : "Under review"}</p></article>) : <p>No matters submitted yet.</p>}<h2>Monthly screening</h2><p>Each cycle covers matters submitted in that calendar month. Completion requires a recorded outcome for every matter.</p>{screenings.data?.map(s => <p key={s.id}>{s.month.slice(0,7)} · {s.status}{s.completed_at ? ` · completed ${s.completed_at.slice(0,10)}` : " · case lead review pending"}</p>)}</main>;
}
