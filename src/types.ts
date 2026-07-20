export type PromptFormat = "video";

export type ToolType = "nails_video" | "tattoo_video";

export type TargetGenerator =
  | "Generic"
  | "Google Veo"
  | "Sora"
  | "Runway"
  | "Kling";

export interface HistoryEntry {
  id: string;
  timestamp: number;
  toolType: ToolType;
  category: string;
  format: PromptFormat;
  coreIdea: string;
  prompt: string;
  model?: string;
  videoRatio?: string;
  duration?: string;
  shotType?: string;
  motionPace?: string;
  bodyPart?: string;
  tattooStyle?: string;
  inkStyle?: string;
  subjectGender?: string;
  revealStyle?: string;
  colorMode?: string;
  nailStyle?: string;
  nailShape?: string;
  nailColor?: string;
  generationId?: string;
  sheetSaved?: boolean;
  sheetError?: string;
}

export type SheetStatus = "saved" | "pending" | "failed";

export interface PendingSheetRecord {
  generationId: string;
  toolType: ToolType;
  formData: Record<string, unknown>;
  finalPrompt: string;
  modelUsed: string;
  fallbackUsed: boolean;
  syncToken?: string;
  createdAt: number;
  retryCount: number;
}

export interface AIPromptFormState {
  format: PromptFormat;
  videoRatio: string;
  duration: string;
  cameraMotion: string;
  lighting: string;
  visualStyle: string;
  shotType: string;
  motionPace: string;
  targetGenerator: TargetGenerator;
  coreIdea: string;
  negativePrompt: string;
}

export interface TattooVideoFormState {
  coreIdea: string;
  tattooStyle: string;
  bodyPart: string;
  inkStyle: string;
  cameraMovement: string;
  lighting: string;
  aspectRatio: string;
  subjectGender: string;
  revealStyle: string;
  colorMode: string;
}

export interface NailsVideoFormState {
  coreIdea: string;
  duration: string;
  nailStyle: string;
  nailShape: string;
  nailColor: string;
  cameraMovement: string;
  lighting: string;
  revealStyle: string;
  colorMode: string;
}
