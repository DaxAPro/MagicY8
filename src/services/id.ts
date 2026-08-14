export function safeRandomId(prefix = "id"): string {
  const cryptoApi = globalThis.crypto;
  if (typeof cryptoApi?.randomUUID === "function") {
    return `${prefix}_${cryptoApi.randomUUID()}`;
  }

  const randomPart = Math.random().toString(36).slice(2, 10);
  const timePart = Date.now().toString(36);
  return `${prefix}_${timePart}_${randomPart}`;
}

export function safeShortId(prefix = "id"): string {
  return safeRandomId(prefix).replace(/[^a-z0-9]/gi, "").slice(0, 18);
}
