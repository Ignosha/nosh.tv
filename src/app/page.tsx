import { headers } from "next/headers";
import Script from "next/script";

export const dynamic = "force-dynamic";

export default async function Home() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "your-deployment.vercel.app";
  const proto = h.get("x-forwarded-proto") ?? "https";
  const origin = `${proto}://${host}`;

  return (
    <main className="page">
      <h1>Lead Booking Agent</h1>
      <p>
        An AI assistant that answers website visitors, captures them as leads and books appointments straight into the
        business&apos;s Google Calendar. The chat bubble in the corner of this page is the live agent.
      </p>
      <h2>Add it to a website</h2>
      <p>Paste this before the closing body tag of any site:</p>
      <pre>{`<script src="${origin}/embed.js" async></script>`}</pre>
      <p>
        Leads and bookings show up in <a href="/admin">/admin</a>.
      </p>
      <Script src="/embed.js" strategy="afterInteractive" />
    </main>
  );
}
