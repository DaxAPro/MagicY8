import type { ToolType } from "../types";
import { getLearnedPromptMemory } from "./learnedPromptMemory";

const NAIL_TERMS = new Set([
  "almond",
  "aura",
  "bow",
  "cat",
  "chrome",
  "coffin",
  "cuticle",
  "french",
  "gel",
  "glitter",
  "glossy",
  "manicure",
  "marble",
  "nail",
  "ombre",
  "pearl",
  "polish",
  "stiletto",
  "tip",
]);

const TATTOO_TERMS = new Set([
  "blackwork",
  "botanical",
  "dragon",
  "fine",
  "forearm",
  "geometric",
  "ink",
  "line",
  "mandala",
  "minimal",
  "needle",
  "ornamental",
  "shoulder",
  "skull",
  "snake",
  "tattoo",
  "tribal",
  "wrist",
]);

const VISUAL_TERMS = new Set([
  "abstract",
  "black",
  "blue",
  "butterfly",
  "clean",
  "color",
  "flower",
  "gold",
  "green",
  "heart",
  "pink",
  "red",
  "rose",
  "silver",
  "star",
  "white",
]);

const GENERIC_ONLY_TERMS = new Set([
  "art",
  "beautiful",
  "best",
  "cool",
  "design",
  "good",
  "nice",
  "style",
  "video",
]);

const MEANINGFUL_TERMS = new Set([...NAIL_TERMS, ...TATTOO_TERMS, ...VISUAL_TERMS]);

const IDEA_EXPANSIONS: Record<ToolType, Record<string, string>> = {
  nails_video: {
    aura: "soft pink aura nails with glossy airbrushed glow and pearl highlights",
    butterfly: "soft pastel butterfly nail art with chrome accents and glossy macro reveal",
    chrome: "pink chrome French tip nails with mirror shine and pearl highlights",
    dragon: "tiny chrome dragon accent nail art with black gel linework and glossy final reveal",
    flower: "delicate rose flower nail art with pearl pink gel polish and clean glossy finish",
    heart: "pink heart accent nails with chrome outline and soft beauty lighting",
    rose: "rose flower nail art with pearl pink chrome details and glossy salon finish",
    star: "silver star accent nails with soft pastel polish and glossy macro reveal",
  },
  tattoo_video: {
    aura: "minimal aura-inspired ornamental tattoo with soft black and grey shading on the outer forearm",
    butterfly: "fine-line butterfly tattoo with delicate black and grey shading on the outer forearm",
    chrome: "futuristic chrome-effect cyber sigil tattoo with black and grey linework on the outer forearm",
    dragon: "minimal blackwork dragon tattoo wrapping around the outer forearm with cinematic macro reveal",
    flower: "fine-line rose flower tattoo with botanical leaves on the outer forearm",
    heart: "minimal fine-line heart tattoo with subtle ornamental details on the wrist",
    rose: "fine-line rose tattoo with black and grey botanical shading on the outer forearm",
    star: "minimal constellation star tattoo with fine-line dots and clean black ink",
  },
};

export interface PromptIdeaFeedback {
  score: number;
  label: "Weak" | "Good" | "Strong";
  message: string;
  suggestion: string;
}

function normalizedWords(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .split(/\s+/)
    .map((word) => word.replace(/^-+|-+$/g, ""))
    .filter(Boolean);
}

function looksLikeRandomToken(word: string): boolean {
  if (!/^[a-z0-9-]+$/i.test(word)) return false;
  if (word.length < 5) return false;
  const letters = word.replace(/[^a-z]/g, "");
  if (letters.length < 5) return false;
  const vowels = letters.match(/[aeiou]/g)?.length ?? 0;
  const vowelRatio = vowels / letters.length;
  const hasKnownChunk = [...MEANINGFUL_TERMS].some((term) => letters.includes(term));
  const repeatedPair = /([a-z]{2})\1{2,}/.test(letters);
  return !hasKnownChunk && (vowelRatio < 0.24 || vowelRatio > 0.62 || repeatedPair);
}

function hasNonLatinText(input: string): boolean {
  return [...input].some((char) => char.charCodeAt(0) > 127);
}

export function getPromptIdeaFeedback(input: string, toolType: ToolType): PromptIdeaFeedback {
  const words = normalizedWords(input);
  const uniqueWords = new Set(words);
  const domainTerms = toolType === "nails_video" ? NAIL_TERMS : TATTOO_TERMS;
  const visualCount = words.filter((word) => VISUAL_TERMS.has(word)).length;
  const domainCount = words.filter((word) => domainTerms.has(word)).length;
  const usefulCount = words.filter((word) => MEANINGFUL_TERMS.has(word)).length;
  const detailCount = words.filter((word) => word.length >= 4 && !GENERIC_ONLY_TERMS.has(word)).length;

  let score = 20;
  score += Math.min(domainCount * 22, 44);
  score += Math.min(visualCount * 12, 24);
  score += Math.min(detailCount * 5, 20);
  score += Math.min(uniqueWords.size * 2, 12);
  if (words.length < 2) score -= 28;
  if (usefulCount === 0) score -= 35;
  if (words.some(looksLikeRandomToken)) score -= 45;
  score = Math.max(0, Math.min(100, score));

  const label = score >= 72 ? "Strong" : score >= 45 ? "Good" : "Weak";
  const suggestion = improvePromptIdea(input, toolType);
  const message =
    label === "Strong"
      ? "Strong idea / හොඳ අදහසක්"
      : label === "Good"
        ? "Good idea. Add one more detail for better results."
        : "Weak idea. Add real design words before generating.";

  return { score, label, message, suggestion };
}

export function improvePromptIdea(input: string, toolType: ToolType): string {
  const trimmed = input.trim();
  const fallback =
    toolType === "nails_video"
      ? "pink chrome French tip nails with glossy pearl highlights"
      : "minimal blackwork dragon tattoo around the outer forearm";
  if (!trimmed || normalizedWords(trimmed).some(looksLikeRandomToken)) return fallback;

  const words = normalizedWords(trimmed);
  const learnedExpansion = getLearnedPromptMemory()[toolType].expansions[words[0] ?? ""];
  if (words.length <= 2 && learnedExpansion) return learnedExpansion;

  const expansion = IDEA_EXPANSIONS[toolType][words.join(" ")] ?? IDEA_EXPANSIONS[toolType][words[0] ?? ""];
  if (words.length <= 2 && expansion) return expansion;

  const suffix =
    toolType === "nails_video"
      ? "with glossy macro reveal and clean final hero shot"
      : "with cinematic macro reveal and clean final hero shot";
  return `${trimmed} ${suffix}`.replace(/\s+/g, " ").trim();
}

export function preparePromptIdeaForGeneration(input: string, toolType: ToolType): string {
  const trimmed = input.trim();
  if (!trimmed) return improvePromptIdea("", toolType);

  const feedback = getPromptIdeaFeedback(trimmed, toolType);
  if (feedback.label === "Strong") return trimmed;
  return feedback.suggestion;
}

export function isPromptIdeaSavable(input: string, toolType: ToolType): boolean {
  void toolType;
  const trimmed = input.trim();
  const words = normalizedWords(trimmed);
  if (words.some(looksLikeRandomToken)) return false;
  if (words.every((word) => GENERIC_ONLY_TERMS.has(word))) return false;

  const usefulWords = words.filter((word) => MEANINGFUL_TERMS.has(word));
  if (usefulWords.length > 0) return true;

  if (trimmed.length < 6) return false;
  if (words.length < 2) return false;

  return hasNonLatinText(trimmed) && trimmed.length >= 8;
}

export function validatePromptIdea(input: string, toolType: ToolType): string | null {
  void toolType;
  const trimmed = input.trim();
  if (!trimmed) return "Real design idea එකක් type කරන්න.";
  if (trimmed.length < 4) return "Idea එක කෙටි වැඩියි. Real design words කිහිපයක් දාන්න.";

  const words = normalizedWords(trimmed);
  if (words.some(looksLikeRandomToken)) {
    return "මේක random text වගේ. Real design idea එකක් type කරන්න, e.g. pink chrome French tips.";
  }

  const hasMeaningfulTerm = words.some((word) => MEANINGFUL_TERMS.has(word));
  if (words.length === 1 && !hasMeaningfulTerm) {
    return "මේක random text වගේ. Real design idea එකක් type කරන්න, e.g. pink chrome French tips.";
  }

  const usefulWords = words.filter((word) => MEANINGFUL_TERMS.has(word));
  const onlyGeneric = words.every((word) => GENERIC_ONLY_TERMS.has(word));
  if (onlyGeneric || usefulWords.length === 0) {
    return null;
  }

  return null;
}

export function normalizeGeneratedPrompt(prompt: string, toolType: ToolType): string {
  if (toolType !== "nails_video") return prompt;
  return prompt
    .replace(/\b8s\b/g, "10s")
    .replace(/\b8-second\b/gi, "10-second")
    .replace(/\b8 seconds\b/gi, "10 seconds");
}

export function normalizeFormDataForSave<T extends Record<string, unknown>>(
  formData: T,
  toolType: ToolType,
): T {
  return {
    ...formData,
    ...(toolType === "nails_video" ? { duration: "10s" } : {}),
  };
}
