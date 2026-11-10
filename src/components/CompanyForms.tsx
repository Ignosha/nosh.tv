"use client";
import { useState } from "react";
export function CompanyForm({
  action,
  children,
  label,
  className = "form-card",
}: {
  action: (
    form: FormData,
  ) => Promise<{ error?: string; token?: string; ok?: boolean }>;
  children: React.ReactNode;
  label: string;
  className?: string;
}) {
  const [message, setMessage] = useState(""),
    [token, setToken] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <form
      className={className}
      action={async (form) => {
        setBusy(true);
        setMessage("");
        setToken("");
        try {
          const result = await action(form);
          if (result.error) setMessage(result.error);
          else {
            setMessage("Saved");
            if (result.token) setToken(result.token);
          }
        } finally {
          setBusy(false);
        }
      }}
    >
      {children}
      <button className="btn" disabled={busy}>
        {busy ? "Working…" : label}
      </button>
      {message ? <p role="status">{message}</p> : null}
      {token ? (
        <p>
          Share this one-use token securely with the intended recipient. It
          expires in 48 hours and is bound to their verified email.
          <br />
          <code style={{ overflowWrap: "anywhere" }}>{token}</code>
        </p>
      ) : null}
    </form>
  );
}
