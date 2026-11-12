import { NextResponse } from "next/server";
import { db } from "@/lib/db";
export const dynamic = "force-dynamic";
export const maxDuration = 300;
export async function GET(req: Request) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({error:"Unauthorized"},{status:401});
  const client = db();
  if (!client) return NextResponse.json({error:"Database not configured"},{status:503});
  const { data: firms, error } = await client.from("kl_firms").select("id,created_at").eq("active",true);
  if (error) return NextResponse.json({error:"Firm lookup failed"},{status:500});
  const now = new Date();
  const end = new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),1));
  let queued = 0;
  // Catch up every closed calendar month since enrollment; safe to rerun after failure.
  for (const firm of firms ?? []) {
    const start = new Date(firm.created_at); start.setUTCDate(1); start.setUTCHours(0,0,0,0);
    for (let from = start; from < end; from = new Date(Date.UTC(from.getUTCFullYear(),from.getUTCMonth()+1,1))) {
      const until = new Date(Date.UTC(from.getUTCFullYear(),from.getUTCMonth()+1,1));
      const { data: screening, error: se } = await client.from("kl_screenings").upsert({firm_id:firm.id,month:from.toISOString().slice(0,10)},{onConflict:"firm_id,month",ignoreDuplicates:true});
      void screening;
      if (se) throw new Error("Screening creation failed");
      const {data:s,error:lookupError} = await client.from("kl_screenings").select("id,status").eq("firm_id",firm.id).eq("month",from.toISOString().slice(0,10)).single();
      if (lookupError) throw new Error("Screening lookup failed");
      if (s.status === "complete") continue;
      const {data:matters,error:me} = await client.from("kl_cases").select("id").eq("firm_id",firm.id).gte("created_at",from.toISOString()).lt("created_at",until.toISOString());
      if (me) throw new Error("Matter lookup failed");
      if (matters?.length) {
        const {error:ie} = await client.from("kl_screening_matters").upsert(matters.map(m=>({screening_id:s.id,case_id:m.id})),{onConflict:"screening_id,case_id",ignoreDuplicates:true});
        if (ie) throw new Error("Screening enrollment failed");
      } else {
        const {error:ce} = await client.from("kl_screenings").update({status:"complete",completed_at:new Date().toISOString()}).eq("id",s.id);
        if (ce) throw new Error("Empty screening completion failed");
      }
      queued++;
    }
  }
  return NextResponse.json({queued});
}
