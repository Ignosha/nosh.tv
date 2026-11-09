import { db } from "./db";
import { isUuid } from "./cases";

export async function unsubscribe(token: string): Promise<boolean> {
  if (!isUuid(token)) return false;
  const client = db();
  if (!client) return false;
  const { data } = await client.from("kl_leads").update({ status: "unsubscribed", next_send_at: null }).eq("unsub_token", token).select("id");
  const row = (data as { id: string }[] | null)?.[0];
  if (row) await client.from("kl_lead_events").insert({ lead_id: row.id, kind: "unsubscribed", body: "Unsubscribed via link." });
  return !!row;
}
