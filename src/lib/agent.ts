import { availableSlots, createAppointment, SlotUnavailableError } from "./calendar";
import { businessConfig } from "./config";
import { upsertLead } from "./db";
import { generate, type Content, type FunctionDeclaration, type Part } from "./gemini";
import { formatLocalDate, humanLabel, localDateOf } from "./time";

const MAX_TOOL_ROUNDS = 5;

const tools: FunctionDeclaration[] = [
  {
    name: "check_availability",
    description:
      "Returns real open appointment times from the business calendar. Always call this before suggesting any time.",
    parameters: {
      type: "object",
      properties: {
        from_date: { type: "string", description: "First day to search, YYYY-MM-DD in the business timezone." },
        to_date: { type: "string", description: "Last day to search, YYYY-MM-DD. Defaults to 6 days after from_date." },
      },
    },
  },
  {
    name: "save_lead",
    description: "Saves the visitor's contact details and what they need, as soon as any of them are known.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string" },
        email: { type: "string" },
        phone: { type: "string" },
        need: { type: "string", description: "Short summary of what the visitor wants." },
      },
    },
  },
  {
    name: "book_appointment",
    description:
      "Books an appointment. Only call after the visitor explicitly confirmed one exact time returned by check_availability.",
    parameters: {
      type: "object",
      properties: {
        start: { type: "string", description: "The exact `start` value of the chosen slot from check_availability." },
        name: { type: "string" },
        email: { type: "string" },
        phone: { type: "string" },
        need: { type: "string" },
      },
      required: ["start", "name", "email"],
    },
  },
];

function systemPrompt(): string {
  const b = businessConfig();
  const now = new Date();
  return `You are the website assistant for ${b.name}. Your job: answer questions, capture the visitor as a lead, and book them an appointment.

Business information (the only facts you may state about the business):
${b.info}

Current time: ${humanLabel(now, b.timezone)} (today is ${formatLocalDate(localDateOf(now, b.timezone))}, timezone ${b.timezone}).
Appointments are ${b.appointmentMinutes} minutes and can be booked up to ${b.bookingWindowDays} days ahead.

Rules:
- Be brief and friendly: 1-3 short sentences per reply.
- If a question is not covered by the business information, say you'll have the team follow up; never guess prices, policies or medical/legal advice.
- Find out what they need, then ask for their name and email (phone optional). Call save_lead as soon as you learn any of these.
- Only offer times returned by check_availability. Offer 3-4 options, using the labels as given.
- Before booking, repeat the time, name and email and get a clear yes. Then call book_appointment with the exact start value.
- After booking, tell them a calendar invite was sent to their email.`;
}

function asString(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim().slice(0, 500) : undefined;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function runTool(name: string, args: Record<string, unknown>, conversationId: string) {
  switch (name) {
    case "check_availability": {
      const slots = await availableSlots(asString(args.from_date), asString(args.to_date));
      return slots.length
        ? { slots: slots.slice(0, 12), more_available: slots.length > 12 }
        : { slots: [], note: "No open times in that range. Try a later range." };
    }
    case "save_lead": {
      const email = asString(args.email);
      if (email && !EMAIL_RE.test(email)) return { error: "That email address looks invalid; ask the visitor to re-check it." };
      await upsertLead(conversationId, {
        name: asString(args.name),
        email,
        phone: asString(args.phone),
        need: asString(args.need),
      });
      return { saved: true };
    }
    case "book_appointment": {
      const start = asString(args.start);
      const leadName = asString(args.name);
      const email = asString(args.email);
      if (!start || !leadName || !email) return { error: "start, name and email are required." };
      if (!EMAIL_RE.test(email)) return { error: "That email address looks invalid; ask the visitor to re-check it." };
      const phone = asString(args.phone);
      const need = asString(args.need);
      try {
        const booked = await createAppointment({ start, name: leadName, email, phone, need });
        await upsertLead(conversationId, {
          name: leadName,
          email,
          phone,
          need,
          status: "booked",
          appointment_start: new Date(start).toISOString(),
          calendar_event_id: booked.eventId,
        });
        return { booked: true, time: booked.label };
      } catch (err) {
        if (err instanceof SlotUnavailableError) {
          return { error: "That time is not available. Call check_availability and offer other times." };
        }
        throw err;
      }
    }
    default:
      return { error: `Unknown tool ${name}` };
  }
}

/** Runs one visitor turn. Mutates and returns `contents` with the new turn appended. */
export async function respond(
  contents: Content[],
  message: string,
  conversationId: string,
): Promise<{ contents: Content[]; reply: string }> {
  contents.push({ role: "user", parts: [{ text: message }] });
  const system = systemPrompt();

  for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
    const modelTurn = await generate({ system, contents, tools });
    contents.push(modelTurn);

    const calls = modelTurn.parts.filter((p) => p.functionCall);
    if (calls.length === 0) {
      const reply = modelTurn.parts
        .filter((p) => p.text && !p.thought)
        .map((p) => p.text)
        .join("")
        .trim();
      return { contents, reply: reply || "Sorry, could you rephrase that?" };
    }

    const responses: Part[] = [];
    for (const call of calls) {
      const { name, args } = call.functionCall!;
      const result = await runTool(name, args ?? {}, conversationId);
      responses.push({ functionResponse: { name, response: result } });
    }
    contents.push({ role: "user", parts: responses });
  }

  return { contents, reply: "Sorry, I got stuck there. Could you say that again?" };
}
