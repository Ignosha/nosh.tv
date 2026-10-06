import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabaseConfig } from "./config";

let client: SupabaseClient | null = null;

function db(): SupabaseClient {
  if (!client) {
    const c = supabaseConfig();
    client = createClient(c.url, c.serviceRoleKey, { auth: { persistSession: false } });
  }
  return client;
}

export async function loadConversation(id: string): Promise<unknown[] | null> {
  const { data, error } = await db().from("conversations").select("contents").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? (data.contents as unknown[]) : null;
}

export async function createConversation(pageUrl: string | null): Promise<string> {
  const { data, error } = await db().from("conversations").insert({ page_url: pageUrl }).select("id").single();
  if (error) throw error;
  return data.id as string;
}

export async function saveConversation(id: string, contents: unknown[]): Promise<void> {
  const { error } = await db()
    .from("conversations")
    .update({ contents, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export type LeadFields = {
  name?: string;
  email?: string;
  phone?: string;
  need?: string;
  status?: "new" | "booked";
  appointment_start?: string;
  calendar_event_id?: string;
};

export async function upsertLead(conversationId: string, fields: LeadFields): Promise<void> {
  const clean = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined && v !== ""));
  const { error } = await db()
    .from("leads")
    .upsert(
      { conversation_id: conversationId, ...clean, updated_at: new Date().toISOString() },
      { onConflict: "conversation_id" },
    );
  if (error) throw error;
}

export type Lead = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  need: string | null;
  status: "new" | "booked";
  appointment_start: string | null;
  created_at: string;
};

export async function listLeads(limit = 200): Promise<Lead[]> {
  const { data, error } = await db()
    .from("leads")
    .select("id,name,email,phone,need,status,appointment_start,created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as Lead[];
}
