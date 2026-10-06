import { geminiConfig } from "./config";

export type Part = {
  text?: string;
  thought?: boolean;
  functionCall?: { name: string; args?: Record<string, unknown> };
  functionResponse?: { name: string; response: Record<string, unknown> };
  [key: string]: unknown; // keep thoughtSignature and other fields Gemini returns
};
export type Content = { role: "user" | "model"; parts: Part[] };

export type FunctionDeclaration = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
};

export class GeminiRateLimitError extends Error {}

export async function generate(input: {
  system: string;
  contents: Content[];
  tools: FunctionDeclaration[];
}): Promise<Content> {
  const { apiKey, model } = geminiConfig();
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: input.system }] },
        contents: input.contents,
        tools: [{ functionDeclarations: input.tools }],
        generationConfig: { temperature: 0.3 },
      }),
    },
  );
  if (res.status === 429) throw new GeminiRateLimitError(await res.text());
  if (!res.ok) throw new Error(`Gemini request failed: ${res.status} ${await res.text()}`);
  const json = (await res.json()) as { candidates?: { content?: Content }[] };
  const content = json.candidates?.[0]?.content;
  if (!content?.parts?.length) throw new Error(`Gemini returned no content: ${JSON.stringify(json)}`);
  return { role: "model", parts: content.parts };
}
