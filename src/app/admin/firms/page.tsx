import { requireAdmin } from "@/lib/adminAuth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
export const dynamic = "force-dynamic";
async function create(form: FormData) {
  "use server";
  await requireAdmin();
  const name = String(form.get("name") ?? "").trim().slice(0,200);
  const email = String(form.get("email") ?? "").trim();
  const lead = String(form.get("lead") ?? "").trim().slice(0,200);
  if (!name || !lead || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Firm, email and named lead required");
  const { error } = await db()!.from("kl_firms").insert({name,email,case_lead:lead});
  if (error) throw new Error("Firm creation failed");
  revalidatePath("/admin/firms");
}
async function outcome(form: FormData) {
  "use server";
  await requireAdmin();
  const screening = String(form.get("screening"));
  const caseId = String(form.get("case"));
  const text = String(form.get("outcome") ?? "").trim().slice(0,4000);
  if (!text) throw new Error("Record a screening outcome");
  const client = db()!;
  const { error } = await client.from("kl_screening_matters").update({outcome:text}).eq("screening_id",screening).eq("case_id",caseId);
  if (error) throw new Error("Screening update failed");
  const { data, error: readError } = await client.from("kl_screening_matters").select("outcome").eq("screening_id",screening);
  if (readError) throw new Error("Could not verify completion");
  if (data?.length && data.every(m => m.outcome)) {
    const { error } = await client.from("kl_screenings").update({status:"complete",completed_at:new Date().toISOString()}).eq("id",screening);
    if (error) throw new Error("Could not complete screening");
  }
  revalidatePath("/admin/firms");
}
export default async function Firms() {
  const client = db();
  if (!client) return <main><h1>Configure Supabase to manage firms</h1></main>;
  const { data: firms, error } = await client.from("kl_firms").select("*").order("created_at",{ascending:false});
  const { data: screenings, error: screeningError } = await client.from("kl_screenings").select("*,kl_screening_matters(case_id,outcome)").eq("status","pending");
  if (error || screeningError) throw new Error("Apply the database schema before managing firms");
  return <main className="wrap" style={{padding:40}}><a href="/admin">Case desk</a><h1>Firm Premier</h1><p>Provision after an engagement is signed and billing is confirmed. Portal links grant access to all firm matters.</p><form action={create} className="form-card"><label>Firm name <input name="name" required/></label><label>Firm contact email <input type="email" name="email" required/></label><label>Named case lead <input name="lead" required/></label><button className="btn">Create firm</button></form>{firms?.map(f => <p key={f.id}><a href={`/firm/${f.token}`}>{f.name}</a> · {f.case_lead}</p>)}<h2>Pending monthly screenings</h2>{screenings?.map(s => <section key={s.id}><h3>{firms?.find(f => f.id === s.firm_id)?.name} · {s.month}</h3>{s.kl_screening_matters.map((m: {case_id:string;outcome:string|null}) => <form className="form-card" action={outcome} key={m.case_id}><input type="hidden" name="screening" value={s.id}/><input type="hidden" name="case" value={m.case_id}/><a href={`/admin/cases/${m.case_id}`}>Review matter</a><label>Screening outcome<textarea name="outcome" required defaultValue={m.outcome ?? ""}/></label><button className="btn">Save screening outcome</button></form>)}</section>)}</main>;
}
