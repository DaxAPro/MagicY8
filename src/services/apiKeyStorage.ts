const STORAGE_KEY = "magy8_session_ai_api_key";
const LEGACY_STORAGE_KEY = "promptforge_groq_api_key";

function removeLegacyKey(): void {
  try {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // ignore storage errors
  }
}

export function getApiKey(): string | null {
  try {
    removeLegacyKey();
    const currentKey = sessionStorage.getItem(STORAGE_KEY);
    if (currentKey) return currentKey;
    return null;
  } catch {
    return null;
  }
}

export function saveApiKey(key: string): void {
  try {
    removeLegacyKey();
    sessionStorage.setItem(STORAGE_KEY, key);
  } catch {
    // ignore storage errors
  }
}

export function removeApiKey(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
    removeLegacyKey();
  } catch {
    // ignore storage errors
  }
}

export function hasApiKey(): boolean {
  return getApiKey() !== null;
}

export function maskApiKey(key: string): string {
  if (key.length <= 4) return "****";
  return `••••${key.slice(-4)}`;
}

export function validateKeyFormat(key: string): string | null {
  const trimmed = key.trim();
  if (!trimmed) return "API key is required.";
  if (!trimmed.startsWith("AIza") && !trimmed.startsWith("AQ.")) {
    return "Use a Gemini key starting with AIza or AQ.";
  }
  if (trimmed.length < 20) return "API key is too short.";
  return null;
}
