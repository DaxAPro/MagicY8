import type { ToolType } from "../types";
import { getGoogleSheetConfig } from "./googleSheetConfig";
import { safeShortId } from "./id";

interface DirectSheetPayload {
  generationId?: string;
  toolType: ToolType;
  coreIdea: string;
  finalPrompt: string;
  model?: string;
  duration?: string;
  nailStyle?: string;
  nailShape?: string;
  nailColor?: string;
  tattooStyle?: string;
  bodyPart?: string;
  inkStyle?: string;
  subjectGender?: string;
  revealStyle?: string;
}

export async function savePromptDirectToGoogleSheets(
  payload: DirectSheetPayload,
): Promise<{ saved: boolean; error?: string }> {
  const config = getGoogleSheetConfig();
  if (!config) return { saved: false, error: "Google Sheet sync is not configured." };

  const generationId = payload.generationId?.startsWith("local_")
    ? `gen_${payload.generationId.slice(6).replace(/[^a-z0-9_]/gi, "_")}`
    : payload.generationId ?? `gen_${Date.now()}_${safeShortId("sheet")}`;

  const body = {
    action: "save_prompt",
    webhookSecret: config.webhookSecret,
    generationId,
    createdAt: new Date().toISOString(),
    toolType: payload.toolType,
    format: "video",
    originalCoreIdea: payload.coreIdea,
    finalPrompt: payload.finalPrompt,
    negativePrompt: "",
    targetGenerator: "Browser prompt engine",
    aspectRatio: "9:16",
    duration: payload.duration ?? "10s",
    cameraMovement: "",
    shotType: payload.toolType === "tattoo_video" ? "Single continuous tattoo process" : "Nails style reveal",
    motionPace: "Curiosity hook to clean final reveal",
    lighting: "",
    visualStyle: payload.revealStyle ?? "",
    tattooStyle: payload.tattooStyle ?? "",
    bodyPart: payload.bodyPart ?? "",
    inkStyle: payload.inkStyle ?? "",
    subjectGender: payload.subjectGender ?? "",
    nailStyle: payload.nailStyle ?? "",
    nailShape: payload.nailShape ?? "",
    nailColor: payload.nailColor ?? "",
    modelUsed: payload.model ?? "Browser prompt engine",
    fallbackUsed: false,
    applicationName: "MagicY8",
  };

  try {
    await fetch(config.webhookUrl, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(body),
    });
    return {
      saved: false,
      error: "Google Sheet request was sent, but browser-only sync cannot confirm the save. Firebase Firestore is the primary verified prompt database for MagicY8.",
    };
  } catch {
    return { saved: false, error: "Could not send prompt to Google Sheet. Firebase Firestore remains the primary prompt database." };
  }
}
