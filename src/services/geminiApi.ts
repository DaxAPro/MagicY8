import { buildBrowserLocalPrompt, getLocalTrends } from "./localPromptEngine";
import { safeShortId } from "./id";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/gemini`;

function apiProviderForKey(apiKey: string): "groq" | "gemini" {
  return apiKey.startsWith("gsk_") ? "groq" : "gemini";
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

export function shouldUseLocalPromptFallback(err: unknown): boolean {
  if (!(err instanceof GeminiError)) return true;
  return ["configuration", "network", "timeout", "model_unavailable", "empty"].includes(err.code ?? "");
}

async function postJson<T>(body: unknown, apiKey?: string): Promise<T> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || SUPABASE_URL === "undefined") {
    throw new GeminiError(
      "Server connector is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local, then restart the app.",
      0,
      "configuration",
    );
  }

  let res: Response;
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      apikey: SUPABASE_ANON_KEY,
    };
    if (apiKey) {
      const provider = apiProviderForKey(apiKey);
      headers["X-User-AI-Provider"] = provider;
      headers[provider === "groq" ? "X-User-Groq-Key" : "X-User-Gemini-Key"] = apiKey;
    }

    res = await fetch(FUNCTION_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(45_000),
    });
  } catch {
    throw new GeminiError("Could not connect to the prompt server.", 0, "network");
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    throw new GeminiError(`Invalid response (${res.status}).`, res.status);
  }

  if (!res.ok) {
    const obj = data as { error?: unknown } | null;
    const msg =
      obj && typeof obj === "object" && "error" in obj
        ? String(obj.error)
        : `Request failed (${res.status}).`;
    let code: string | undefined;
    if (res.status === 401 || res.status === 403) code = "invalid_key";
    else if (res.status === 429) code = "rate_limit";
    else if (res.status === 503) code = "model_unavailable";
    else if (res.status === 504) code = "timeout";
    else if (res.status === 502) code = "network";
    throw new GeminiError(msg, res.status, code);
  }

  return data as T;
}

function hasSupabaseSetup(): boolean {
  return !!SUPABASE_URL && !!SUPABASE_ANON_KEY && SUPABASE_URL !== "undefined";
}

export function hasPromptServerConnector(): boolean {
  return hasSupabaseSetup();
}

export async function generatePrompt(
  toolType: ToolType,
  formData: Record<string, unknown>,
  apiKey: string,
  previousPrompt?: string,
): Promise<GenerateResult> {
  if (!hasSupabaseSetup()) {
    return generateLocalPrompt(toolType, formData, previousPrompt);
  }
  const result = await postJson<GenerateResult>({
    action: "generate_prompt",
    toolType,
    formData,
    previousPrompt,
  }, apiKey);
  if (!result.prompt || typeof result.prompt !== "string") {
    throw new GeminiError("The AI provider returned an empty response.", 502, "empty");
  }
  return result;
}

export async function generateLocalPrompt(
  toolType: ToolType,
  formData: Record<string, unknown>,
  previousPrompt?: string,
): Promise<GenerateResult> {
  if (!hasSupabaseSetup()) {
    return {
      prompt: buildBrowserLocalPrompt(toolType, formData, previousPrompt),
      model: "Browser free prompt engine",
      fallbackUsed: true,
      generationId: `local_${Date.now()}_${safeShortId("run")}`,
      sheetSaved: false,
    };
  }
  const result = await postJson<GenerateResult>({
    action: "generate_local_prompt",
    toolType,
    formData,
    previousPrompt,
  }).catch(() => ({
    prompt: buildBrowserLocalPrompt(toolType, formData, previousPrompt),
    model: "Browser free prompt engine",
    fallbackUsed: true,
    generationId: `local_${Date.now()}_${safeShortId("run")}`,
    sheetSaved: false,
  }));
  if (!result.prompt || typeof result.prompt !== "string") {
    throw new GeminiError("Free prompt engine returned an empty response.", 502, "empty");
  }
  return result;
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
  return postJson<RetrySheetResult>({
    action: "retry_sheet_save",
    generationId,
    toolType,
    formData,
    finalPrompt,
    modelUsed,
    fallbackUsed,
    syncToken,
  }, apiKey);
}

export async function getTrends(toolType: ToolType, apiKey?: string): Promise<TrendResult> {
  if (!hasSupabaseSetup()) {
    return { ideas: getLocalTrends(toolType), fallback: true, updatedAt: Date.now(), model: "Browser trend pool" };
  }
  return postJson<TrendResult>({ action: "get_trends", toolType }, apiKey).catch(() => ({
    ideas: getLocalTrends(toolType),
    fallback: true,
    updatedAt: Date.now(),
    model: "Browser trend pool",
  }));
}

export async function testGeminiConnection(apiKey: string): Promise<HealthCheckResult> {
  void apiKey;
  if (!hasSupabaseSetup()) {
    throw new GeminiError(
      "AI server connector is missing. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to the GitHub Pages build, then redeploy.",
      0,
      "configuration",
    );
  }
  return postJson<HealthCheckResult>({ action: "health_check" }, apiKey);
}
