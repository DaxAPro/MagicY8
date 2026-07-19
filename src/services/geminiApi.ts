const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/gemini`;
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "qwen/qwen3.6-27b";

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

async function postJson<T>(body: unknown, apiKey: string): Promise<T> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || SUPABASE_URL === "undefined") {
    throw new GeminiError(
      "API key saved. Direct Groq mode is ready, but server sync is not configured.",
      0,
      "configuration",
    );
  }

  let res: Response;
  try {
    res = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        apikey: SUPABASE_ANON_KEY,
        "X-User-Groq-Key": apiKey,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(45_000),
    });
  } catch {
    throw new GeminiError("Could not connect to Groq.", 0, "network");
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

function directSystemPrompt(toolType: ToolType): string {
  if (toolType === "tattoo_video") {
    return [
      "You write premium 9:16 tattoo process video prompts.",
      "Output only one prompt, 120-190 words, no labels.",
      "The prompt must be exactly 10 seconds, curiosity-driven, safe, adult subject age 21+, no nudity, no gore.",
      "Include macro hook, coherent tattoo action, unexpected reveal path, and a clean final full-design hero reveal for the final two seconds.",
      "Avoid cropped artwork, covered final tattoo, wrong body part, inconsistent tattoo design, floating tools, underage wording, captions, logos, watermarks, and generic 8K/masterpiece stuffing.",
    ].join("\n");
  }
  return [
    "You write premium 9:16 girls nail style video prompts for AI video generators.",
    "Output only one prompt, 110-180 words, no labels.",
    "The video must feel curiosity-driven: mysterious opening macro detail, satisfying nail styling process, and a beautiful final reveal.",
    "Keep one consistent adult hand model, clean salon/tabletop setting, realistic fingers, polished nail art continuity, and a final 1.5 second hero shot.",
    "Avoid deformed hands, extra fingers, changing nail shapes, messy polish, skin damage, text, logos, watermarks, captions, and generic 8K/masterpiece stuffing.",
  ].join("\n");
}

function revealStyleInstruction(toolType: ToolType, revealStyle: string): string {
  if (toolType === "tattoo_video") {
    const styles: Record<string, string> = {
      botched_wipe_reveal: "Use a botched tattoo wipe reveal: the first 7 seconds look like a messy black ink failure, then a gloved hand wipes with green soap tissue to reveal the flawless hidden design.",
      scribble_illusion: "Use a scribble illusion: random chaotic tattoo lines look meaningless until the last 3 seconds, when a small zoom-out reveals they form the final artwork.",
      second_skin_peel: "Use a second-skin peel reveal: smudged ink under clear protective film looks unreadable, then a gloved hand peels and wipes it clean to reveal the final tattoo.",
      single_line_illusion: "Use a single continuous line illusion: overlapping loops seem random until the final zoom-out reveals a complete animal or portrait design.",
      ink_blot_galaxy: "Use an ink blot reveal: thick black ink hides the tattoo until a wipe reveals a glowing, detailed design underneath.",
    };
    return styles[revealStyle] ?? styles.botched_wipe_reveal;
  }

  const styles: Record<string, string> = {
    wet_polish_drop: "Use a wet polish drop reveal: messy thick polish drops look like a failed nail design, then a needle drag transforms them into perfect floral nail art.",
    drag_marble_reveal: "Use a drag marble reveal: chaotic wet gel streaks are pulled into a clean marble pattern in one satisfying motion.",
    cat_eye_magnet_pull: "Use a cat eye magnet reveal: scattered shimmer particles look uneven, then a magnet pull gathers them into a sharp glowing cat-eye line.",
    messy_glitter_cleanup: "Use a messy glitter cleanup reveal: loose glitter and gel look chaotic, then a clean brush stroke reveals a precise sparkling design.",
    blooming_gel_flower: "Use a blooming gel flower reveal: random color dots spread through wet gel and suddenly bloom into a detailed flower pattern.",
  };
  return styles[revealStyle] ?? styles.wet_polish_drop;
}

function directUserPrompt(toolType: ToolType, formData: Record<string, unknown>, previousPrompt?: string): string {
  const idea = String(formData.coreIdea ?? "").trim();
  const duration = toolType === "tattoo_video" ? "10s" : String(formData.duration ?? "8s");
  const seed = String(formData.variationSeed ?? crypto.randomUUID());
  const revealStyle = String(formData.revealStyle ?? "");
  if (toolType === "tattoo_video") {
    return [
      `Tattoo idea: ${idea}`,
      `Style: ${String(formData.tattooStyle ?? "Realistic")}`,
      `Body part: ${String(formData.bodyPartLabel ?? formData.bodyPart ?? "Outer forearm")}`,
      `Ink: ${String(formData.inkStyle ?? "Black ink")}`,
      `Subject: ${String(formData.subjectGender ?? "woman") === "man" ? "adult man age 21+" : "adult woman age 21+"}`,
      `Camera: ${String(formData.cameraMovement ?? "Macro close-up")}`,
      `Lighting: ${String(formData.lighting ?? "Studio rim lighting")}`,
      `Reveal style: ${revealStyleInstruction(toolType, revealStyle)}`,
      "Format: 9:16 vertical video",
      `Duration: ${duration}`,
      `Fresh variation seed: ${seed}`,
      previousPrompt ? `Avoid repeating this previous prompt structure:\n${previousPrompt}` : "",
      "Create a super prompt with a strong curiosity hook and an ending the viewer cannot easily guess.",
    ].filter(Boolean).join("\n");
  }
  return [
    `Nail video idea: ${idea}`,
    `Nail style: ${String(formData.nailStyle ?? "Glossy chrome")}`,
    `Nail shape: ${String(formData.nailShape ?? "Almond")}`,
    `Color palette: ${String(formData.nailColor ?? "Pearl pink")}`,
    `Camera: ${String(formData.cameraMovement ?? "Macro push-in")}`,
    `Lighting: ${String(formData.lighting ?? "Soft beauty lighting")}`,
    `Reveal style: ${revealStyleInstruction(toolType, revealStyle)}`,
    "Subject: adult woman hand model, age 21+",
    "Format: 9:16 vertical video",
    `Duration: ${duration}`,
    `Fresh variation seed: ${seed}`,
    previousPrompt ? `Avoid repeating this previous prompt structure:\n${previousPrompt}` : "",
    "Create a super prompt for a girls nail style video with suspense, satisfying detail, and a clean final reveal.",
  ].filter(Boolean).join("\n");
}

async function directGroqGenerate(
  toolType: ToolType,
  formData: Record<string, unknown>,
  apiKey: string,
  previousPrompt?: string,
): Promise<GenerateResult> {
  let res: Response;
  try {
    res = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0.82,
        max_tokens: 900,
        messages: [
          { role: "system", content: directSystemPrompt(toolType) },
          { role: "user", content: directUserPrompt(toolType, formData, previousPrompt) },
        ],
      }),
      signal: AbortSignal.timeout(45_000),
    });
  } catch {
    throw new GeminiError("Could not connect to Groq.", 0, "network");
  }

  const data = await res.json().catch(() => null) as {
    choices?: Array<{ message?: { content?: string } }>;
    error?: { message?: string };
  } | null;

  if (!res.ok) {
    throw new GeminiError(data?.error?.message ?? `Groq request failed (${res.status}).`, res.status);
  }

  const prompt = data?.choices?.[0]?.message?.content?.trim() ?? "";
  if (!prompt) throw new GeminiError("Groq returned an empty response.", 502, "empty");
  return {
    prompt,
    model: GROQ_MODEL,
    fallbackUsed: false,
    generationId: `local_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`,
    sheetSaved: false,
    sheetError: "Configure Google Sheet Sync in API Settings to save this prompt to Google Sheets.",
  };
}

export async function generatePrompt(
  toolType: ToolType,
  formData: Record<string, unknown>,
  apiKey: string,
  previousPrompt?: string,
): Promise<GenerateResult> {
  if (!hasSupabaseSetup()) {
    return directGroqGenerate(toolType, formData, apiKey, previousPrompt);
  }
  const result = await postJson<GenerateResult>({
    action: "generate_prompt",
    toolType,
    formData,
    previousPrompt,
  }, apiKey);
  if (!result.prompt || typeof result.prompt !== "string") {
    throw new GeminiError("Groq returned an empty response.", 502, "empty");
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

export async function getTrends(toolType: ToolType, apiKey: string): Promise<TrendResult> {
  if (!hasSupabaseSetup()) {
    return { ideas: [], fallback: true, error: "Live trends need the server connector." };
  }
  return postJson<TrendResult>({ action: "get_trends", toolType }, apiKey);
}

export async function testGeminiConnection(apiKey: string): Promise<HealthCheckResult> {
  if (!hasSupabaseSetup()) {
    const test = await directGroqGenerate("nails_video", {
      coreIdea: "quick connection test",
      duration: "8s",
    }, apiKey);
    return { ok: !!test.prompt, model: test.model };
  }
  return postJson<HealthCheckResult>({ action: "health_check" }, apiKey);
}
