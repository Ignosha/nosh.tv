import { NextResponse } from "next/server";
import { respond } from "@/lib/agent";
import { createConversation, loadConversation, saveConversation } from "@/lib/db";
import { GeminiRateLimitError, type Content } from "@/lib/gemini";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_MESSAGE_CHARS = 2000;
// Roughly 30 visitor messages including tool rounds; stops runaway or abusive chats.
const MAX_CONTENTS = 150;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: Request) {
  let body: { conversationId?: unknown; message?: unknown; pageUrl?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message || message.length > MAX_MESSAGE_CHARS) {
    return NextResponse.json({ error: `Message must be 1-${MAX_MESSAGE_CHARS} characters` }, { status: 400 });
  }

  let conversationId = typeof body.conversationId === "string" && UUID_RE.test(body.conversationId) ? body.conversationId : null;
  try {
    let contents = conversationId ? ((await loadConversation(conversationId)) as Content[] | null) : null;
    if (!conversationId || !contents) {
      const pageUrl = typeof body.pageUrl === "string" ? body.pageUrl.slice(0, 500) : null;
      conversationId = await createConversation(pageUrl);
      contents = [];
    }

    if (contents.length >= MAX_CONTENTS) {
      return NextResponse.json({
        conversationId,
        reply: "This chat has gotten long. Please contact us directly and the team will help you.",
      });
    }

    const result = await respond(contents, message, conversationId);
    await saveConversation(conversationId, result.contents);
    return NextResponse.json({ conversationId, reply: result.reply });
  } catch (err) {
    console.error("chat error", err);
    const reply =
      err instanceof GeminiRateLimitError
        ? "We're getting a lot of messages right now. Please try again in a minute."
        : "Sorry, something went wrong on our side. Please try again shortly.";
    return NextResponse.json({ conversationId, reply }, { status: err instanceof GeminiRateLimitError ? 429 : 500 });
  }
}
