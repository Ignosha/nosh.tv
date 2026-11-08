export function ToolHeader({ kicker, title, accent, intro }: { kicker: string; title: string; accent: string; intro: string }) {
  return (
    <section className="no-print" style={{ padding: "40px 0 32px" }}>
      <div className="wrap">
        <span className="kicker">{kicker}</span>
        <h1 className="serif" style={{ fontSize: "clamp(38px, 5.4vw, 64px)", lineHeight: 1.04, letterSpacing: "-0.03em", margin: "0 0 14px" }}>
          {title} <em style={{ color: "var(--accent)" }}>{accent}</em>
        </h1>
        <p className="muted" style={{ maxWidth: "40em", margin: 0, fontSize: 18 }}>{intro}</p>
      </div>
    </section>
  );
}
