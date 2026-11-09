import { Mark } from "./Mark";

export function Footer() {
  const email = process.env.NEXT_PUBLIC_CONTACT_EMAIL;
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer-grid">
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <Mark size={24} />
            <span className="serif" style={{ fontSize: 20 }}>TraceSworn</span>
            <span className="label" style={{ marginLeft: 8 }}>Crypto asset discovery</span>
          </div>
          <div className="mono" style={{ fontSize: 13 }}>
            {email ? <a href={`mailto:${email}`}>{email}</a> : null}
          </div>
        </div>
        <small>
          TraceSworn locates, values and documents digital assets for attorneys, fiduciaries, trustees and the parties
          they represent. We are not a law firm or accounting firm and do not give legal or tax advice. We are read-only:
          we never take custody of assets or keys. Where public data cannot show something, our reports say so.
        </small>
      </div>
    </footer>
  );
}
