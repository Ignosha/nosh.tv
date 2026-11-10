"use client";
import { useState } from "react";
import { signIn, startSso } from "@/app/auth/actions";
export function EnterpriseSignIn() {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <div style={{ maxWidth: 520 }}>
      <form
        className="form-card"
        action={async (form) => {
          setBusy(true);
          setError("");
          try {
            const r = await signIn(form);
            if (r?.error) setError(r.error);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Email
          <input
            name="email"
            type="email"
            autoComplete="username"
            required
            maxLength={254}
          />
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            maxLength={1024}
          />
        </label>
        <button className="btn btn-primary" disabled={busy}>
          Sign in
        </button>
      </form>
      <form
        className="form-card"
        action={async (form) => {
          setBusy(true);
          try {
            const r = await startSso(form);
            if (r?.error) setError(r.error);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Company SSO domain
          <input
            name="domain"
            placeholder="company.example"
            required
            maxLength={253}
          />
        </label>
        <button className="btn" disabled={busy}>
          Continue with company SSO
        </button>
      </form>
      {error ? (
        <p role="alert" className="notice err">
          {error}
        </p>
      ) : null}
      <p>
        Accounts are provisioned by your company administrator. Multi-factor
        authentication is required. SSO requires a configured identity provider.
      </p>
    </div>
  );
}
