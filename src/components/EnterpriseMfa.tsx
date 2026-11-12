"use client";
import { useState } from "react";
import { enrollMfa, verifyMfa } from "@/app/auth/actions";
export function EnterpriseMfa({ factorId: existing }: { factorId?: string }) {
  const [setup, setSetup] = useState<{
      factorId: string;
      qr: string;
      secret: string;
    } | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const id = existing ?? setup?.factorId;
  return (
    <div className="form-card" style={{ maxWidth: 520 }}>
      {!id ? (
        <button
          className="btn"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              const r = await enrollMfa();
              if ("error" in r) setError(r.error!);
              else setSetup(r);
            } finally {
              setBusy(false);
            }
          }}
        >
          Set up authenticator
        </button>
      ) : null}
      {setup ? (
        <>
          <img
            src={setup.qr}
            alt="Authenticator enrollment QR code"
            width={220}
            height={220}
          />
          <p>
            Manual setup key: <code>{setup.secret}</code>
          </p>
          <p>Keep this enrollment key private.</p>
        </>
      ) : null}
      {id ? (
        <form
          action={async (form) => {
            setBusy(true);
            setError("");
            try {
              const r = await verifyMfa(form);
              if (r?.error) setError(r.error);
            } finally {
              setBusy(false);
            }
          }}
        >
          <input type="hidden" name="factorId" value={id} />
          <label>
            Authenticator code
            <input
              name="code"
              inputMode="numeric"
              pattern="[0-9]{6}"
              autoComplete="one-time-code"
              required
            />
          </label>
          <button className="btn btn-primary" disabled={busy}>
            Verify and continue
          </button>
        </form>
      ) : null}
      {error ? (
        <p role="alert" className="notice err">
          {error}
        </p>
      ) : null}
    </div>
  );
}
