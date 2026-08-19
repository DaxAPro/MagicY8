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
  "cat",
  "clean",
  "color",
  "flower",
  "gold",
  "green",
  "heart",
  "ocean",
  "panda",
  "sea",
  "wave",
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
    aura: "aura manicure with glossy airbrushed glow and pearl highlights in colors from the user idea, with no lettering",
    butterfly: "butterfly manicure with clear wing shapes, colors chosen from the user idea, and glossy macro reveal, with no text on the nail",
    chrome: "chrome French tip nails with mirror shine and colors chosen from the user idea",
    dragon: "tiny dragon accent manicure with clean pictorial linework and glossy final reveal, with no letters or words",
    flower: "delicate flower manicure with colors from the requested flower and clean glossy finish, with no lettering",
    heart: "heart accent nails with colors chosen from the user idea and soft beauty lighting",
    rose: "rose flower nail art with rose-inspired colors and glossy salon finish",
    cat: "cat themed manicure with tiny cat face, ears, whiskers, paw-print details, and glossy macro reveal, with no text",
    ocean: "ocean and sea themed manicure with blue waves, foam, shell accents, and glossy water reflections, with no lettering",
    panda: "panda themed manicure with clear black-white panda face, ears, paw details, and glossy final reveal, with no text",
    sea: "sea themed manicure with blue ocean waves, foam, shell accents, and glossy water reflections, with no lettering",
    wave: "ocean wave manicure with blue water movement, foam edges, and glossy macro reveal, with no lettering",
    star: "star accent nails with colors chosen from the user idea and glossy macro reveal",
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
  const trimmed = normalizeSensitiveIdeaTerms(input.trim(), toolType);
  const fallback =
    toolType === "nails_video"
      ? "custom decorative manicure based exactly on the user idea with clear pictorial motifs, glossy final reveal, and no lettering"
      : "professional real tattoo design based exactly on the user idea, inked on the selected adult subject body part with cinematic macro reveal";
  if (!trimmed || normalizedWords(trimmed).some(looksLikeRandomToken)) return fallback;

  const words = normalizedWords(trimmed);
  const learnedExpansion = getLearnedPromptMemory()[toolType].expansions[words[0] ?? ""];
  if (words.length <= 2 && learnedExpansion) return learnedExpansion;

  const expansion = IDEA_EXPANSIONS[toolType][words.join(" ")] ?? IDEA_EXPANSIONS[toolType][words[0] ?? ""];
  if (words.length <= 2 && expansion) return expansion;

  const suffix =
    toolType === "nails_video"
      ? "as clear decorative manicure motifs with glossy macro reveal, clean final hero shot, and no letters or words painted on the nail"
      : "as an actual professional tattoo inked into skin by a real tattoo machine, on a clearly adult subject age 25+, with cinematic macro reveal and clean final hero shot";
  return `${trimmed} ${suffix}`.replace(/\s+/g, " ").trim();
}

function normalizeSensitiveIdeaTerms(input: string, toolType: ToolType): string {
  if (toolType !== "tattoo_video") return input;
  return input
    .replace(/\bschool\s*girl\b/gi, "adult woman age 25+ in tasteful fashion-editorial styling")
    .replace(/\bschool\s*boy\b/gi, "adult man age 25+ in tasteful fashion-editorial styling")
    .replace(/\bgirls?\b/gi, "adult woman age 25+")
    .replace(/\bboys?\b/gi, "adult man age 25+")
    .replace(/\bteen(?:ager)?s?\b/gi, "adult subject age 25+")
    .replace(/\s+/g, " ")
    .trim();
}

export function preparePromptIdeaForGeneration(input: string, toolType: ToolType): string {
  const trimmed = input.trim();
  if (!trimmed) return improvePromptIdea("", toolType);

  const feedback = getPromptIdeaFeedback(trimmed, toolType);
  if (feedback.label === "Strong") return normalizeSensitiveIdeaTerms(trimmed, toolType);
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
    return "මේක random text වගේ. Real design idea එකක් type කරන්න, e.g. cat sea panda nail art.";
  }

  const hasMeaningfulTerm = words.some((word) => MEANINGFUL_TERMS.has(word));
  if (words.length === 1 && !hasMeaningfulTerm) {
    return "මේක random text වගේ. Real design idea එකක් type කරන්න, e.g. cat sea panda nail art.";
  }

  const usefulWords = words.filter((word) => MEANINGFUL_TERMS.has(word));
  const onlyGeneric = words.every((word) => GENERIC_ONLY_TERMS.has(word));
  if (onlyGeneric || usefulWords.length === 0) {
    return null;
  }

  return null;
}

export function normalizeGeneratedPrompt(prompt: string, toolType: ToolType): string {
  if (toolType === "tattoo_video") {
    const normalized = normalizeSensitiveIdeaTerms(prompt, toolType)
      .replace(/\b8s\b/g, "10s")
      .replace(/\b8-second\b/gi, "10-second")
      .replace(/\b8 seconds\b/gi, "10 seconds");

    const hasAdultRule = /\badult (woman|man|subject).*(age (21|25)\+|25\+|21\+)/i.test(normalized);
    const hasProcessRule = /\b(tattoo machine|needle).*\b(skin|ink)\b/i.test(normalized);
    const guardrails = [
      hasAdultRule ? "" : "Subject guardrail: clearly adult subject age 25+, polished glamorous fashion-editorial styling, no school uniform, no teenage or minor-looking presentation.",
      hasProcessRule ? "" : "Process guardrail: show a real tattoo machine needle contacting skin, stencil transfer or cropped outline, ink entering skin, controlled linework, shading or color pass, and final skin-safe wipe.",
      "Placement guardrail: keep the tattoo on the selected body part only; avoid chest, breast, cleavage, intimate-area, or torso-focused framing unless the user explicitly selected that body part.",
      "Avoid: chest tattoos, breast or cleavage framing, fake tattoo sticker, body paint, makeup drawing, marker drawing, projected overlay, temporary transfer, random scribbles, repeated template tattoos, botched tattoo, messy ink blobs, schoolgirl styling, school uniform, underage look, nudity, gore, captions, logos, watermarks, blur, flicker, and AI morphing.",
    ].filter(Boolean);

    return guardrails.length ? `${normalized} ${guardrails.join(" ")}` : normalized;
  }

  if (toolType !== "nails_video") return prompt;
  const normalized = prompt
    .replace(/\b8s\b/g, "10s")
    .replace(/\b8-second\b/gi, "10-second")
    .replace(/\b8 seconds\b/gi, "10 seconds")
    .replace(/one clear adult finger or one clean set of five fingers only when needed/gi, "exactly one adult fingernail on one natural finger only");

  const textGuardrail =
    " Text guardrail: do not place any readable text, letters, words, labels, signatures, logos, captions, or typography on the nail; express the idea only through decorative shapes, colors, icons, shimmer, chrome, charms, and pictorial motifs.";
  const hasAnatomyGuardrail = /\bexactly one adult fingernail\b/i.test(normalized);
  const hasTextGuardrail = /\b(no|without|avoid|do not).{0,80}\b(text|letters|words|typography|logos)\b/i.test(normalized);

  if (hasAnatomyGuardrail && hasTextGuardrail) return normalized;
  if (hasAnatomyGuardrail) return `${normalized}${textGuardrail}`;

  return `${normalized} Anatomy guardrail: show exactly one adult fingernail on one natural finger, cropped from fingertip to first knuckle only; keep the palm, other fingers, whole hand, wrist, extra fingers, missing fingers, fused fingers, six or seven fingers, duplicated nails, and second hands out of frame.${hasTextGuardrail ? "" : textGuardrail}`;
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
