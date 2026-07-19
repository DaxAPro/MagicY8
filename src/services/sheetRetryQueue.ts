import type { PendingSheetRecord } from "../types";
import { retrySheetSave } from "./geminiApi";
import { getApiKey } from "./apiKeyStorage";

const STORAGE_KEY = "magy8_pending_sheet_queue";
const MAX_RETRIES = 5;
const MAX_AUTO_RETRIES = 3;

export function getPendingRecords(): PendingSheetRecord[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? (JSON.parse(stored) as PendingSheetRecord[]) : [];
  } catch {
    return [];
  }
}

function savePendingRecords(records: PendingSheetRecord[]): void {
  try {
    if (records.length === 0) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    }
  } catch {
    // ignore storage errors
  }
}

export function addPendingRecord(record: Omit<PendingSheetRecord, "retryCount">): void {
  const records = getPendingRecords();
  // Avoid duplicate entries for the same generationId
  if (records.some((r) => r.generationId === record.generationId)) return;
  records.push({ ...record, retryCount: 0 });
  savePendingRecords(records);
}

export function removePendingRecord(generationId: string): void {
  const records = getPendingRecords().filter((r) => r.generationId !== generationId);
  savePendingRecords(records);
}

export function hasPendingRecords(): boolean {
  return getPendingRecords().length > 0;
}

/**
 * Retries all pending sheet saves. Returns the number of records successfully synced.
 * Uses generationId as idempotency key — the server checks for duplicates.
 */
export async function retryPendingSaves(): Promise<{ synced: number; remaining: number }> {
  const records = getPendingRecords();
  if (records.length === 0) return { synced: 0, remaining: 0 };

  const apiKey = getApiKey();
  if (!apiKey) return { synced: 0, remaining: records.length };

  let synced = 0;
  const remaining: PendingSheetRecord[] = [];

  for (const record of records) {
    if (record.retryCount >= MAX_RETRIES) {
      // Drop records that have exceeded max retries
      continue;
    }

    try {
      const result = await retrySheetSave(
        record.generationId,
        record.toolType,
        record.formData,
        record.finalPrompt,
        record.modelUsed,
        record.fallbackUsed,
        record.syncToken ?? "",
        apiKey,
      );

      if (result.sheetSaved) {
        synced++;
      } else {
        // Increment retry count, keep in queue
        remaining.push({ ...record, retryCount: record.retryCount + 1 });
      }
    } catch {
      // Network or server error — keep in queue with incremented retry count
      remaining.push({ ...record, retryCount: record.retryCount + 1 });
    }
  }

  savePendingRecords(remaining);
  return { synced, remaining: remaining.length };
}

/**
 * Retries a single pending record by generationId.
 * Returns true if the record was successfully synced.
 */
export async function retrySingleRecord(generationId: string): Promise<boolean> {
  const records = getPendingRecords();
  const record = records.find((r) => r.generationId === generationId);
  if (!record) return true; // Already removed — treat as success

  const apiKey = getApiKey();
  if (!apiKey) return false;

  try {
    const result = await retrySheetSave(
      record.generationId,
      record.toolType,
      record.formData,
      record.finalPrompt,
      record.modelUsed,
      record.fallbackUsed,
      record.syncToken ?? "",
      apiKey,
    );

    if (result.sheetSaved) {
      removePendingRecord(generationId);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Automatically retry pending saves on app startup or connectivity return.
 * Limited to MAX_AUTO_RETRIES per record to avoid infinite loops.
 */
export async function autoRetryPendingSaves(): Promise<void> {
  const records = getPendingRecords();
  if (records.length === 0) return;

  const autoRetryable = records.filter((r) => r.retryCount < MAX_AUTO_RETRIES);
  if (autoRetryable.length === 0) return;

  await retryPendingSaves();
}

/**
 * Listen for connectivity restoration and retry pending saves.
 */
export function setupConnectivityRetry(): () => void {
  let retrying = false;

  const handleOnline = async () => {
    if (retrying) return;
    retrying = true;
    try {
      await autoRetryPendingSaves();
    } finally {
      retrying = false;
    }
  };

  window.addEventListener("online", handleOnline);
  return () => window.removeEventListener("online", handleOnline);
}
