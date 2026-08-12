const MEANINGFUL_TERMS = new Set([
  "abstract",
  "almond",
  "aura",
  "black",
  "blackwork",
  "blue",
  "botanical",
  "bow",
  "butterfly",
  "cat",
  "chrome",
  "clean",
  "coffin",
  "color",
  "dragon",
  "flower",
  "french",
  "gel",
  "geometric",
  "glitter",
  "glossy",
  "gold",
  "green",
  "heart",
  "ink",
  "line",
  "mandala",
  "marble",
  "minimal",
  "nail",
  "ombre",
  "pearl",
  "pink",
  "red",
  "rose",
  "silver",
  "skull",
  "snake",
  "star",
  "tattoo",
  "white",
]);

function normalizedWords(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .map((word) => word.replace(/^-+|-+$/g, ""))
    .filter(Boolean);
}

function looksLikeRandomToken(word: string): boolean {
  if (word.length < 7) return false;
  const letters = word.replace(/[^a-z]/g, "");
  if (letters.length < 7) return false;
  const vowels = letters.match(/[aeiou]/g)?.length ?? 0;
  const vowelRatio = vowels / letters.length;
  const hasKnownChunk = [...MEANINGFUL_TERMS].some((term) => letters.includes(term));
  return !hasKnownChunk && (vowelRatio < 0.22 || vowelRatio > 0.62);
}

export function validatePromptIdea(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return "Type a real nail or tattoo idea first.";
  if (trimmed.length < 4) return "Add a clearer idea before generating.";

  const words = normalizedWords(trimmed);
  if (words.length === 0) return "Use normal words for the idea.";
  if (words.some(looksLikeRandomToken)) {
    return "That looks like random text. Type a real design idea, e.g. pink chrome French tips or blackwork dragon.";
  }

  const hasMeaningfulTerm = words.some((word) => MEANINGFUL_TERMS.has(word));
  const hasEnoughPhraseDetail = words.length >= 3 && words.join("").length >= 12;
  if (!hasMeaningfulTerm && !hasEnoughPhraseDetail) {
    return "Type a clearer design idea, not random text.";
  }

  return null;
}
