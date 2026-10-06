"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

type Msg = { from: "user" | "agent"; text: string };

const STORAGE_KEY = "lead-agent-conversation";

function readStored(): { id: string | null; messages: Msg[] } {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { id: null, messages: [] };
}

export default function ChatWidget({ businessName }: { businessName: string }) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = readStored();
    setConversationId(stored.id);
    setMessages(stored.messages);
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ id: conversationId, messages }));
    } catch {}
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [conversationId, messages, busy]);

  async function send(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    setMessages((m) => [...m, { from: "user", text }]);
    setBusy(true);
    try {
      const pageUrl = new URLSearchParams(window.location.search).get("page");
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, message: text, pageUrl }),
      });
      const data = await res.json();
      if (data.conversationId) setConversationId(data.conversationId);
      setMessages((m) => [...m, { from: "agent", text: data.reply ?? data.error ?? "Something went wrong." }]);
    } catch {
      setMessages((m) => [...m, { from: "agent", text: "Connection problem. Please try again." }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="chat">
      <header>{businessName}</header>
      <div className="log" ref={logRef}>
        <div className="msg agent">Hi! How can we help you today? I can answer questions or book you an appointment.</div>
        {messages.map((m, i) => (
          <div key={i} className={`msg ${m.from}`}>
            {m.text}
          </div>
        ))}
        {busy && <div className="msg agent typing">Typing…</div>}
      </div>
      <form onSubmit={send}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message…"
          maxLength={2000}
          aria-label="Message"
        />
        <button type="submit" disabled={busy || !input.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}
