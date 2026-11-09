import type { Metadata } from "next";
import { unsubscribe } from "@/lib/unsubscribe";

export const metadata: Metadata = { title: "Unsubscribe — TraceSworn", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Unsubscribe({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ done?: string }> }) {
  const { token } = await params;
  const { done } = await searchParams;
  async function confirm() {
    "use server";
    await unsubscribe(token);
    const { redirect } = await import("next/navigation");
    redirect(`/u/${token}?done=1`);
  }
  return (
    <section className="wrap" style={{ padding: "72px 0 120px", maxWidth: 640 }}>
      <span className="kicker">Email preferences</span>
      {done ? (
        <>
          <h1 className="serif" style={{ fontSize: 44, margin: "0 0 12px" }}>You&rsquo;re unsubscribed.</h1>
          <p className="muted">You won&rsquo;t receive any more emails from TraceSworn. Sorry for the interruption.</p>
        </>
      ) : (
        <>
          <h1 className="serif" style={{ fontSize: 44, margin: "0 0 12px" }}>Stop these emails?</h1>
          <form action={confirm}>
            <button className="btn btn-primary" type="submit">Unsubscribe</button>
          </form>
        </>
      )}
    </section>
  );
}
