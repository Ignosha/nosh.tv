import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";
import { getCase, updateCase, logEvent, isUuid } from "@/lib/cases";

export const dynamic = "force-dynamic";

// Verifies Stripe's signature (header "Stripe-Signature: t=…,v1=…") without the Stripe SDK.
function verify(raw: string, header: string | null, secret: string): boolean {
  if (!header) return false;
  const parts = Object.fromEntries(header.split(",").map((kv) => kv.split("=") as [string, string]));
  const t = Number(parts.t);
  if (!t || Math.abs(Date.now() / 1000 - t) > 300) return false;
  const expected = createHmac("sha256", secret).update(`${t}.${raw}`).digest("hex");
  return header
    .split(",")
    .filter((kv) => kv.startsWith("v1="))
    .some((kv) => {
      const sig = kv.slice(3);
      return sig.length === expected.length && timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
    });
}

type Session = {
  id: string;
  client_reference_id: string | null;
  amount_total: number | null;
  payment_status: string;
  metadata: Record<string, string> | null;
  customer_details: { email: string | null; name: string | null; phone: string | null } | null;
};

const EARLY = ["new", "contacted"];

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Webhook not configured." }, { status: 503 });
  const raw = await req.text();
  if (!verify(raw, req.headers.get("stripe-signature"), secret)) return NextResponse.json({ error: "Bad signature." }, { status: 400 });

  const event = JSON.parse(raw) as { type: string; data: { object: Session } };
  if (event.type !== "checkout.session.completed" && event.type !== "checkout.session.async_payment_succeeded") {
    return NextResponse.json({ received: true });
  }
  const s = event.data.object;
  if (s.payment_status !== "paid" && s.payment_status !== "no_payment_required") return NextResponse.json({ received: true });
  const amount = s.amount_total ?? 0;
  const pkg = s.metadata?.kinledger_package ?? null;

  const ref = s.client_reference_id;
  const existing = ref && isUuid(ref) ? await getCase(ref) : null;
  if (existing) {
    if (existing.stripe_session === s.id) return NextResponse.json({ received: true }); // already handled
    await updateCase(existing.id, {
      paid_at: new Date().toISOString(),
      amount_paid: (existing.amount_paid ?? 0) + amount,
      stripe_session: s.id,
      ...(pkg && pkg !== "addons" ? { package: pkg === "plan_couple" ? "plan" : pkg } : {}),
      ...(EARLY.includes(String(existing.status)) ? { status: "engaged", next_followup_at: new Date().toISOString() } : {}),
    });
    await logEvent(existing.id, "payment", `Paid $${(amount / 100).toFixed(2)} via Stripe (${pkg ?? "payment link"}).`);
    return NextResponse.json({ received: true });
  }

  // Paid straight from the pricing page: open a case from the checkout details.
  const client = db();
  if (!client) return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  const email = s.customer_details?.email;
  if (!email) return NextResponse.json({ received: true });
  const { data } = await client
    .from("kl_cases")
    .insert({
      role: pkg === "partner" ? "attorney" : "family",
      name: s.customer_details?.name || email,
      email,
      phone: s.customer_details?.phone ?? null,
      package: pkg === "plan_couple" ? "plan" : pkg && pkg !== "addons" ? pkg : null,
      status: "engaged",
      paid_at: new Date().toISOString(),
      amount_paid: amount,
      stripe_session: s.id,
      next_followup_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (data) await logEvent(data.id, "payment", `Paid $${(amount / 100).toFixed(2)} via Stripe (${pkg ?? "payment link"}); case opened from checkout.`);
  return NextResponse.json({ received: true });
}
