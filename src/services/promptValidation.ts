import type { ToolType } from "../types";

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

export interface PromptIdeaFeedback {
  score: number;
  label: "Weak" | "Good" | "Strong";
  message: string;
  suggestion: string;
}

function normalizedWords(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .map((word) => word.replace(/^-+|-+$/g, ""))
    .filter(Boolean);
}

function looksLikeRandomToken(word: string): boolean {
  if (word.length < 5) return false;
  const letters = word.replace(/[^a-z]/g, "");
  if (letters.length < 5) return false;
  const vowels = letters.match(/[aeiou]/g)?.length ?? 0;
  const vowelRatio = vowels / letters.length;
  const hasKnownChunk = [...MEANINGFUL_TERMS].some((term) => letters.includes(term));
  const repeatedPair = /([a-z]{2})\1{2,}/.test(letters);
  return !hasKnownChunk && (vowelRatio < 0.24 || vowelRatio > 0.62 || repeatedPair);
}

function hasAny(words: string[], terms: Set<string>): boolean {
  return words.some((word) => terms.has(word));
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

  const suffix =
    toolType === "nails_video"
      ? "with glossy macro reveal and clean final hero shot"
      : "with cinematic macro reveal and clean final hero shot";
  return `${trimmed} ${suffix}`.replace(/\s+/g, " ").trim();
}

export function validatePromptIdea(input: string, toolType: ToolType): string | null {
  const trimmed = input.trim();
  if (!trimmed) return "Real design idea එකක් type කරන්න.";
  if (trimmed.length < 4) return "Idea එක කෙටි වැඩියි. Real design words කිහිපයක් දාන්න.";

  const words = normalizedWords(trimmed);
  if (words.length === 0) return "Normal words වලින් idea එක type කරන්න.";
  if (words.some(looksLikeRandomToken)) {
    return "මේක random text වගේ. Real design idea එකක් type කරන්න, e.g. pink chrome French tips.";
  }

  const hasMeaningfulTerm = words.some((word) => MEANINGFUL_TERMS.has(word));
  if (words.length === 1 && !hasMeaningfulTerm) {
    return "මේක random text වගේ. Real design idea එකක් type කරන්න, e.g. pink chrome French tips.";
  }

  const nailDomain = hasAny(words, NAIL_TERMS);
  const tattooDomain = hasAny(words, TATTOO_TERMS);
  if (toolType === "nails_video" && tattooDomain && !nailDomain) {
    return "මේක tattoo idea එකක් වගේ. Tattoo tab එක use කරන්න.";
  }
  if (toolType === "tattoo_video" && nailDomain && !tattooDomain) {
    return "මේක nails idea එකක් වගේ. Nails tab එක use කරන්න.";
  }

  const usefulWords = words.filter((word) => MEANINGFUL_TERMS.has(word));
  const onlyGeneric = words.every((word) => GENERIC_ONLY_TERMS.has(word));
  if (onlyGeneric || usefulWords.length === 0) {
    return "Idea එක vague වැඩියි. Color/style/subject එකක් දාන්න.";
  }

  const feedback = getPromptIdeaFeedback(trimmed, toolType);
  if (feedback.score < 35) {
    return `Idea එක තව clear කරන්න. Try: ${feedback.suggestion}`;
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
