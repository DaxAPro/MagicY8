import { buildBrowserLocalPrompt, getLocalTrends } from "./localPromptEngine";
import { safeShortId } from "./id";

const DIRECT_GEMINI_MODEL = "gemini-3.7-flash";
const GEMINI_INTERACTIONS_URL = "https://generativelanguage.googleapis.com/v1beta/interactions";
const DIRECT_GROQ_MODEL = "openai/gpt-oss-20b";
const GROQ_CHAT_COMPLETIONS_URL = "https://api.groq.com/openai/v1/chat/completions";

function isGeminiKey(apiKey: string): boolean {
  return apiKey.startsWith("AIza") || apiKey.startsWith("AQ.");
}

function isGroqKey(apiKey: string): boolean {
  return apiKey.startsWith("gsk_");
}

export type ToolType = "nails_video" | "tattoo_video";

export interface TrendIdea {
  title: string;
  description: string;
  source?: { name?: string; uri?: string };
}

export interface TrendResult {
  ideas: TrendIdea[];
  fallback: boolean;
  updatedAt?: number;
  error?: string;
  model?: string;
}

export interface GenerateResult {
  prompt: string;
  model: string;
  fallbackUsed?: boolean;
  generationId?: string;
  sheetSaved?: boolean;
  sheetError?: string;
  syncToken?: string;
}

export interface RetrySheetResult {
  sheetSaved: boolean;
  sheetError?: string;
}

export interface HealthCheckResult {
  ok: boolean;
  model?: string;
  fallbackModels?: string[];
}

export class GeminiError extends Error {
  constructor(
    message: string,
    public status: number,
  public code?: string,
  ) {
    super(message);
    this.name = "GeminiError";
  }
}

type GeminiInteractionResponse = {
  output_text?: string;
  steps?: Array<{
    type?: string;
    content?: Array<{ type?: string; text?: string }> | string;
  }>;
  error?: { message?: string; status?: string; code?: number };
};

type GroqChatResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string; type?: string; code?: string };
};

export function shouldUseLocalPromptFallback(err: unknown): boolean {
  if (!(err instanceof GeminiError)) return true;
  return ["configuration", "network", "timeout", "model_unavailable", "empty"].includes(err.code ?? "");
}

function extractGeminiText(data: GeminiInteractionResponse): string {
  const directText = data.output_text?.trim();
  if (directText) return directText;

  const stepText = data.steps
    ?.filter((step) => step.type === "model_output")
    .flatMap((step) => {
      if (typeof step.content === "string") return [step.content];
      return step.content ?? [];
    })
    .map((part) => typeof part === "string" ? part : part.type === "text" ? part.text ?? "" : "")
    .join("")
    .trim();

  return stepText ?? "";
}

function buildDirectAiInstruction(
  toolType: ToolType,
  formData: Record<string, unknown>,
  previousPrompt?: string,
): string {
  const browserDraft = buildBrowserLocalPrompt(toolType, formData, previousPrompt);
  const coreIdea = String(formData.coreIdea ?? "").trim();
  const toolName = toolType === "tattoo_video" ? "tattoo video" : "nails video";

  return [
    `You are MagicY8's AI prompt analyst for ${toolName} generation.`,
    "Analyze the user's idea and selected settings, then create one polished English AI video prompt.",
    "Preserve every named subject, motif, color, placement, and style from the user's idea. Do not replace the idea with a generic prompt.",
    "The output must be 9:16 vertical, 10 seconds, cinematic, production-ready, and suitable for Google Flow, Veo, Sora, Runway, or Kling.",
    "Use the draft below only as a safety and structure reference. Improve it with better visual analysis, clearer pacing, stronger cause-and-effect, and cleaner final reveal.",
    "Output only the finished prompt text. No labels, no markdown, no explanation.",
    "",
    `User idea: ${coreIdea}`,
    `Selected settings JSON: ${JSON.stringify(formData)}`,
    previousPrompt ? `Previous prompt to avoid repeating: ${previousPrompt}` : "",
    "",
    `Safety/structure draft: ${browserDraft}`,
  ].filter(Boolean).join("\n");
}

async function callDirectGemini(input: string, apiKey: string): Promise<string> {
  let res: Response;
  try {
    res = await fetch(GEMINI_INTERACTIONS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        model: DIRECT_GEMINI_MODEL,
        store: false,
        input,
      }),
      signal: AbortSignal.timeout(45_000),
    });
  } catch {
    throw new GeminiError("Could not connect to Gemini from this browser.", 0, "network");
  }

  const data = await res.json().catch(() => null) as GeminiInteractionResponse | null;
  if (!data) throw new GeminiError(`Invalid Gemini response (${res.status}).`, res.status);
  if (!res.ok || data.error?.message) {
    let code: string | undefined;
    if (res.status === 401 || res.status === 403) code = "invalid_key";
    else if (res.status === 429) code = "rate_limit";
    else if (res.status === 503) code = "model_unavailable";
    else if (res.status === 504) code = "timeout";
    throw new GeminiError(data.error?.message ?? `Gemini request failed (${res.status}).`, res.status, code);
  }

  const text = extractGeminiText(data);
  if (!text) throw new GeminiError("Gemini returned an empty response.", 502, "empty");
  return text;
}

async function callDirectGroq(input: string, apiKey: string): Promise<string> {
  let res: Response;
  try {
    res = await fetch(GROQ_CHAT_COMPLETIONS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: DIRECT_GROQ_MODEL,
        messages: [{ role: "user", content: input }],
        temperature: 0.85,
        max_tokens: 1024,
      }),
      signal: AbortSignal.timeout(45_000),
    });
  } catch {
    throw new GeminiError("Could not connect to Groq from this browser.", 0, "network");
  }

  const data = await res.json().catch(() => null) as GroqChatResponse | null;
  if (!data) throw new GeminiError(`Invalid Groq response (${res.status}).`, res.status);
  if (!res.ok || data.error?.message) {
    let code: string | undefined;
    if (res.status === 401 || res.status === 403) code = "invalid_key";
    else if (res.status === 429) code = "rate_limit";
    else if (res.status === 503) code = "model_unavailable";
    else if (res.status === 504) code = "timeout";
    throw new GeminiError(data.error?.message ?? `Groq request failed (${res.status}).`, res.status, code);
  }

  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new GeminiError("Groq returned an empty response.", 502, "empty");
  return text;
}

async function generateDirectGeminiPrompt(
  toolType: ToolType,
  formData: Record<string, unknown>,
  apiKey: string,
  previousPrompt?: string,
): Promise<GenerateResult> {
  const prompt = await callDirectGemini(
    buildDirectAiInstruction(toolType, formData, previousPrompt),
    apiKey,
  );
  return {
    prompt,
    model: `${DIRECT_GEMINI_MODEL} direct browser API`,
    fallbackUsed: false,
    generationId: `direct_${Date.now()}_${safeShortId("run")}`,
    sheetSaved: false,
  };
}

async function generateDirectGroqPrompt(
  toolType: ToolType,
  formData: Record<string, unknown>,
  apiKey: string,
  previousPrompt?: string,
): Promise<GenerateResult> {
  const prompt = await callDirectGroq(
    buildDirectAiInstruction(toolType, formData, previousPrompt),
    apiKey,
  );
  return {
    prompt,
    model: `${DIRECT_GROQ_MODEL} direct browser API`,
    fallbackUsed: false,
    generationId: `direct_${Date.now()}_${safeShortId("run")}`,
    sheetSaved: false,
  };
}

export async function generatePrompt(
  toolType: ToolType,
  formData: Record<string, unknown>,
  apiKey: string,
  previousPrompt?: string,
): Promise<GenerateResult> {
  if (isGeminiKey(apiKey)) {
    return generateDirectGeminiPrompt(toolType, formData, apiKey, previousPrompt);
  }
  if (isGroqKey(apiKey)) {
    return generateDirectGroqPrompt(toolType, formData, apiKey, previousPrompt);
  }
  return generateLocalPrompt(toolType, formData, previousPrompt);
}

export async function generateLocalPrompt(
  toolType: ToolType,
  formData: Record<string, unknown>,
  previousPrompt?: string,
): Promise<GenerateResult> {
  return {
    prompt: buildBrowserLocalPrompt(toolType, formData, previousPrompt),
    model: "Browser free prompt engine",
    fallbackUsed: true,
    generationId: `local_${Date.now()}_${safeShortId("run")}`,
    sheetSaved: false,
  };
}

export async function retrySheetSave(
  generationId: string,
  toolType: ToolType,
  formData: Record<string, unknown>,
  finalPrompt: string,
  modelUsed: string,
  fallbackUsed: boolean,
  syncToken: string,
  apiKey: string,
): Promise<RetrySheetResult> {
  void generationId;
  void toolType;
  void formData;
  void finalPrompt;
  void modelUsed;
  void fallbackUsed;
  void syncToken;
  void apiKey;
  return { sheetSaved: false, sheetError: "Google Sheet retry is not available in browser-only mode." };
}

export async function getTrends(toolType: ToolType, apiKey?: string): Promise<TrendResult> {
  void apiKey;
  return { ideas: getLocalTrends(toolType), fallback: true, updatedAt: Date.now(), model: "Browser trend pool" };
}

export async function testGeminiConnection(apiKey: string): Promise<HealthCheckResult> {
  if (!isGeminiKey(apiKey)) {
    if (isGroqKey(apiKey)) {
      const text = await callDirectGroq("Reply with exactly: ok", apiKey);
      if (!/\bok\b/i.test(text)) throw new GeminiError("Groq returned an unexpected response.", 502);
      return { ok: true, model: `${DIRECT_GROQ_MODEL} direct browser API` };
    }
    throw new GeminiError("Use a Groq key starting with gsk_ or a Gemini key starting with AIza or AQ.", 0, "configuration");
  }
  const text = await callDirectGemini("Reply with exactly: ok", apiKey);
  if (!/\bok\b/i.test(text)) throw new GeminiError("Gemini returned an unexpected response.", 502);
  return { ok: true, model: `${DIRECT_GEMINI_MODEL} direct browser API` };
}
