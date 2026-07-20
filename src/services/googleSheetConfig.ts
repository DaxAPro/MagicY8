const URL_KEY = "magy8_sheet_webhook_url";
const SECRET_KEY = "magy8_sheet_webhook_secret";

export const DEFAULT_GOOGLE_SHEET_WEBHOOK_URL =
  "";

export interface GoogleSheetConfig {
  webhookUrl: string;
  webhookSecret: string;
}

export function getGoogleSheetConfig(): GoogleSheetConfig | null {
  try {
    const webhookUrl = getStoredValue(URL_KEY) || DEFAULT_GOOGLE_SHEET_WEBHOOK_URL;
    const webhookSecret = getStoredValue(SECRET_KEY);
    if (!webhookUrl || !webhookSecret) return null;
    return { webhookUrl, webhookSecret };
  } catch {
    return null;
  }
}

export function getGoogleSheetWebhookUrlDraft(): string {
  try {
    return getStoredValue(URL_KEY) || DEFAULT_GOOGLE_SHEET_WEBHOOK_URL;
  } catch {
    return DEFAULT_GOOGLE_SHEET_WEBHOOK_URL;
  }
}

export function saveGoogleSheetConfig(config: GoogleSheetConfig): void {
  try {
    localStorage.setItem(URL_KEY, config.webhookUrl.trim());
    localStorage.setItem(SECRET_KEY, config.webhookSecret.trim());
  } catch {
    // ignore storage errors
  }
}

export function removeGoogleSheetConfig(): void {
  try {
    localStorage.removeItem(URL_KEY);
    localStorage.removeItem(SECRET_KEY);
    sessionStorage.removeItem(URL_KEY);
    sessionStorage.removeItem(SECRET_KEY);
  } catch {
    // ignore storage errors
  }
}

function getStoredValue(key: string): string {
  const localValue = localStorage.getItem(key)?.trim() ?? "";
  if (localValue) return localValue;

  const legacySessionValue = sessionStorage.getItem(key)?.trim() ?? "";
  if (legacySessionValue) localStorage.setItem(key, legacySessionValue);
  return legacySessionValue;
}

export function maskSecret(secret: string): string {
  if (secret.length <= 4) return "****";
  return `••••${secret.slice(-4)}`;
}
