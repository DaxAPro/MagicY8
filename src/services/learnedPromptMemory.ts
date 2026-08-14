import type { HistoryEntry, ToolType } from "../types";

const CACHE_KEY = "magy8_learned_prompt_memory";
const FIREBASE_SYNC_KEY = "magy8_learning_last_firebase_sync";
const FIREBASE_SYNC_TTL_MS = 6 * 60 * 60 * 1000;
const MAX_LEARNED_ITEMS_PER_TOOL = 24;

interface LearnedToolMemory {
  expansions: Record<string, string>;
  trends: Array<{ title: string; description: string }>;
  promptSnippets: string[];
}

interface RecentPromptRecord {
  toolType: ToolType;
  originalCoreIdea: string;
  finalPrompt: string;
  createdAtClient?: string;
}

export interface LearnedPromptMemory {
  nails_video: LearnedToolMemory;
  tattoo_video: LearnedToolMemory;
  updatedAt: number;
}

function emptyMemory(): LearnedPromptMemory {
  return {
    nails_video: { expansions: {}, trends: [], promptSnippets: [] },
    tattoo_video: { expansions: {}, trends: [], promptSnippets: [] },
    updatedAt: 0,
  };
}

function safeLocalStorageGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeLocalStorageSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Browser storage can be unavailable in privacy modes.
  }
}

function normalizeIdea(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ");
}

function keywordFromIdea(input: string): string | undefined {
  const generic = new Set(["a", "an", "the", "with", "and", "for", "video", "prompt", "style", "design"]);
  return normalizeIdea(input)
    .split(" ")
    .find((word) => word.length >= 3 && !generic.has(word));
}

function asRecordsFromHistory(history: HistoryEntry[]): RecentPromptRecord[] {
  return history.map((entry) => ({
    toolType: entry.toolType,
    originalCoreIdea: entry.coreIdea,
    finalPrompt: entry.prompt,
  }));
}

function deriveMemory(records: RecentPromptRecord[]): LearnedPromptMemory {
  const memory = emptyMemory();
  const seenIdeas: Record<ToolType, Set<string>> = {
    nails_video: new Set(),
    tattoo_video: new Set(),
  };

  for (const record of records) {
    const idea = record.originalCoreIdea.trim();
    const prompt = record.finalPrompt.trim();
    if (idea.length < 6 || prompt.length < 80) continue;

    const toolMemory = memory[record.toolType];
    const normalized = normalizeIdea(idea);
    if (seenIdeas[record.toolType].has(normalized)) continue;
    seenIdeas[record.toolType].add(normalized);

    const keyword = keywordFromIdea(idea);
    if (keyword && !toolMemory.expansions[keyword]) {
      toolMemory.expansions[keyword] = idea;
    }

    if (toolMemory.trends.length < MAX_LEARNED_ITEMS_PER_TOOL) {
      toolMemory.trends.push({
        title: idea,
        description: "Learned from saved MagicY8 prompt patterns.",
      });
    }

    if (toolMemory.promptSnippets.length < MAX_LEARNED_ITEMS_PER_TOOL) {
      toolMemory.promptSnippets.push(prompt.slice(0, 420));
    }
  }

  memory.updatedAt = Date.now();
  return memory;
}

function mergeMemories(primary: LearnedPromptMemory, fallback: LearnedPromptMemory): LearnedPromptMemory {
  return {
    nails_video: {
      expansions: { ...fallback.nails_video.expansions, ...primary.nails_video.expansions },
      trends: [...primary.nails_video.trends, ...fallback.nails_video.trends].slice(0, MAX_LEARNED_ITEMS_PER_TOOL),
      promptSnippets: [...primary.nails_video.promptSnippets, ...fallback.nails_video.promptSnippets].slice(0, MAX_LEARNED_ITEMS_PER_TOOL),
    },
    tattoo_video: {
      expansions: { ...fallback.tattoo_video.expansions, ...primary.tattoo_video.expansions },
      trends: [...primary.tattoo_video.trends, ...fallback.tattoo_video.trends].slice(0, MAX_LEARNED_ITEMS_PER_TOOL),
      promptSnippets: [...primary.tattoo_video.promptSnippets, ...fallback.tattoo_video.promptSnippets].slice(0, MAX_LEARNED_ITEMS_PER_TOOL),
    },
    updatedAt: Math.max(primary.updatedAt, fallback.updatedAt),
  };
}

export function getLearnedPromptMemory(): LearnedPromptMemory {
  const stored = safeLocalStorageGet(CACHE_KEY);
  if (!stored) return emptyMemory();

  try {
    const parsed = JSON.parse(stored) as Partial<LearnedPromptMemory>;
    const fallback = emptyMemory();
    return {
      nails_video: { ...fallback.nails_video, ...parsed.nails_video },
      tattoo_video: { ...fallback.tattoo_video, ...parsed.tattoo_video },
      updatedAt: typeof parsed.updatedAt === "number" ? parsed.updatedAt : 0,
    };
  } catch {
    return emptyMemory();
  }
}

export async function refreshLearnedPromptMemory(history: HistoryEntry[]): Promise<void> {
  const localMemory = deriveMemory(asRecordsFromHistory(history));
  let combined = mergeMemories(localMemory, getLearnedPromptMemory());

  const lastFirebaseSync = Number(safeLocalStorageGet(FIREBASE_SYNC_KEY) ?? "0");
  if (Date.now() - lastFirebaseSync > FIREBASE_SYNC_TTL_MS) {
    const { fetchRecentFirebasePrompts } = await import("./firebasePromptLearning");
    const firebaseRecords = await fetchRecentFirebasePrompts();
    if (firebaseRecords.length > 0) {
      combined = mergeMemories(deriveMemory(firebaseRecords), combined);
    }
    safeLocalStorageSet(FIREBASE_SYNC_KEY, String(Date.now()));
  }

  safeLocalStorageSet(CACHE_KEY, JSON.stringify(combined));
}
