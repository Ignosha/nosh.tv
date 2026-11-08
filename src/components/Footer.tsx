import { Mark } from "./Mark";

export function Footer() {
  const email = process.env.NEXT_PUBLIC_CONTACT_EMAIL;
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer-grid">
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <Mark size={24} />
            <span className="serif" style={{ fontSize: 20 }}>Kinledger</span>
            <span className="label" style={{ marginLeft: 8 }}>Crypto estate recovery</span>
          </div>
          <div className="mono" style={{ fontSize: 13 }}>
            {email ? <a href={`mailto:${email}`}>{email}</a> : null}
          </div>
        </div>
        <small>
          Kinledger locates and documents digital assets and assists authorized estate representatives with exchange
          and wallet access. We are not a law firm or accounting firm and do not give legal or tax advice. We never take
          custody of estate assets. Recovery is not always possible; we will tell you plainly when it is not.
        </small>
      </div>
    </footer>
  );
}
