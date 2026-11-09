"use client";

import { useEffect, useRef, useState } from "react";

type Msg = { role: "user" | "model"; text: string };
const OPENER: Msg = {
  role: "model",
  text: "Hi, I'm here to help. Tell me a little about the situation (for example, which exchanges or devices you know about) and I'll explain what's possible. Please never type a recovery phrase or password here.",
};

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([OPENER]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => end.current?.scrollIntoView({ behavior: "smooth" }), [msgs, open]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const q = text.trim();
    if (!q || busy) return;
    const next = [...msgs, { role: "user" as const, text: q }];
    setMsgs(next);
    setText("");
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.filter((m) => m !== OPENER) }),
      });
      const data = await res.json();
      setMsgs((m) => [...m, { role: "model", text: data.reply ?? data.error ?? "Sorry, something went wrong." }]);
    } catch {
      setMsgs((m) => [...m, { role: "model", text: "Sorry, I couldn't reach the assistant. Please use the form below." }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="chat no-print">
      {open ? (
        <div className="chat-panel" role="dialog" aria-label="Ask TraceSworn">
          <div className="chat-head">
            <b>Ask TraceSworn</b>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close chat">✕</button>
          </div>
          <div className="chat-body">
            {msgs.map((m, i) => (
              <div key={i} className={`chat-msg ${m.role}`}>{m.text}</div>
            ))}
            {busy ? <div className="chat-msg model faint">Thinking…</div> : null}
            <div ref={end} />
          </div>
          <form className="chat-form" onSubmit={send}>
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type your question…" maxLength={1500} aria-label="Your question" />
            <button className="btn btn-small btn-primary" type="submit" disabled={busy || !text.trim()}>Send</button>
          </form>
          <p className="chat-fine">AI assistant. It can make mistakes; a person reviews every case. Don&rsquo;t share personal or secret details.</p>
        </div>
      ) : null}
      <button type="button" className="chat-toggle" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        {open ? "Close" : "Questions? Ask us"}
      </button>
    </div>
  );
}
