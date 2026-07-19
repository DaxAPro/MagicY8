const SHEET_NAME = "MagicY8_Data";
const SECRET_PROPERTY = "MAGICY8_WEBHOOK_SECRET";

const HEADERS = [
  "generationId",
  "createdAt",
  "toolType",
  "format",
  "originalCoreIdea",
  "finalPrompt",
  "negativePrompt",
  "targetGenerator",
  "aspectRatio",
  "duration",
  "cameraMovement",
  "shotType",
  "motionPace",
  "lighting",
  "visualStyle",
  "tattooStyle",
  "bodyPart",
  "inkStyle",
  "subjectGender",
  "nailStyle",
  "nailShape",
  "nailColor",
  "modelUsed",
  "fallbackUsed",
  "applicationName",
];

function doGet() {
  return jsonResponse_({ ok: true, service: "MagicY8 Sheets collector" });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    const payload = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    const expectedSecret = PropertiesService.getScriptProperties().getProperty(SECRET_PROPERTY);
    if (!expectedSecret || !constantTimeEqual_(String(payload.webhookSecret || ""), expectedSecret)) {
      return jsonResponse_({ success: false, error: "Unauthorized" });
    }

    const generationId = cleanText_(payload.generationId, 120);
    if (!/^gen_[a-z0-9_]{8,64}$/i.test(generationId)) {
      return jsonResponse_({ success: false, error: "Invalid generationId" });
    }

    lock.waitLock(10000);
    const sheet = getOrCreateSheet_();
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      const match = sheet
        .getRange(2, 1, lastRow - 1, 1)
        .createTextFinder(generationId)
        .matchEntireCell(true)
        .findNext();
      if (match) return jsonResponse_({ success: true, duplicate: true });
    }

    const row = HEADERS.map((name) => safeCell_(payload[name]));
    sheet.appendRow(row);
    return jsonResponse_({ success: true });
  } catch (error) {
    return jsonResponse_({ success: false, error: String(error && error.message || error) });
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
}

function getOrCreateSheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = spreadsheet.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function safeCell_(value) {
  if (typeof value === "boolean" || typeof value === "number") return value;
  const text = cleanText_(value, 12000);
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function cleanText_(value, maxLength) {
  return String(value == null ? "" : value).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").slice(0, maxLength);
}

function constantTimeEqual_(a, b) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

function jsonResponse_(body) {
  return ContentService
    .createTextOutput(JSON.stringify(body))
    .setMimeType(ContentService.MimeType.JSON);
}
