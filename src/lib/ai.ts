// Optional AI through Google Gemini (free tier available). Without GEMINI_API_KEY, AI features are off
// and everything falls back to the built-in templates.
// Note: Google may use free-tier data to improve its products. Only structured, minimal case data is sent,
// never documents, and never recovery phrases. Use a paid key for stronger privacy.
const MODEL = process.env.GEMINI_MODEL || "gemini-flash-lite-latest";

export function aiEnabled(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

export type ChatTurn = { role: "user" | "model"; text: string };

export async function generate(system: string, turns: ChatTurn[], maxTokens = 700): Promise<string | null> {
  if (!aiEnabled()) return null;
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY! },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: turns.map((t) => ({ role: t.role, parts: [{ text: t.text }] })),
        generationConfig: { temperature: 0.4, maxOutputTokens: maxTokens },
      }),
      signal: AbortSignal.timeout(25000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim();
    return text || null;
  } catch {
    return null;
  }
}
