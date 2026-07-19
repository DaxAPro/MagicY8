# MagicY8 AI Video Prompt Generator

MagicY8 converts a rough idea into a timed, production-ready AI video prompt. It keeps the existing general cinematic-video and tattoo-video tools, but no longer generates still-image prompts.

## How it works

1. The React app collects the video idea and cinematic settings.
2. A Supabase Edge Function validates the request and sends it to Groq.
3. The result is checked for detail, timing, continuity, and originality. One corrective rewrite is attempted when quality checks fail.
4. The completed prompt and its settings are sent to a protected Google Apps Script endpoint and appended to Google Sheets.
5. If Sheet saving fails, the browser queues a server-signed retry. Duplicate generation IDs are ignored by Apps Script.

Each person supplies their own Groq API key in the app. The key stays only in that browser tab's session storage, is cleared when the tab is closed, is forwarded over HTTPS for the current request, and is redacted from server logs. Never place a Groq key in `VITE_*` variables or commit it to this folder.

## 1. Install and run on this PC

Requirements: Node.js 20 or newer, a Supabase project, and a Groq API key.

```powershell
npm install
Copy-Item .env.example .env.local
```

Edit `.env.local` and set:

```text
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

Then run:

```powershell
npm run dev
```

Open `http://localhost:5173`, select API Settings, add a Groq key, test the connection, and generate a video prompt.

## 2. Connect Google Sheets securely

1. Create a new Google Sheet.
2. Open Extensions → Apps Script.
3. Replace the editor contents with `google-apps-script/Code.gs` from this project.
4. In Apps Script, open Project Settings → Script properties.
5. Add `MAGICY8_WEBHOOK_SECRET` with a long random value (at least 32 random characters).
6. Deploy → New deployment → Web app. Execute as yourself; allow access to anyone. Copy the `/exec` URL.
7. Store the same URL and secret only in Supabase Edge Function secrets:

```powershell
supabase secrets set GOOGLE_SHEETS_WEBHOOK_URL="YOUR_APPS_SCRIPT_EXEC_URL"
supabase secrets set GOOGLE_SHEETS_WEBHOOK_SECRET="YOUR_LONG_RANDOM_SECRET"
supabase secrets set SHEET_SIGNING_SECRET="A_DIFFERENT_LONG_RANDOM_SECRET"
supabase secrets set ALLOWED_ORIGINS="http://localhost:5173,http://127.0.0.1:5173"
supabase functions deploy gemini
```

Do not put any of these three secrets in `.env.local`. Only the Supabase URL and anon key belong there.

The first accepted record creates a `MagicY8_Data` tab and its headers automatically. Confirm that the app shows “Saved to Google Sheets” and that one new row appears.

## 3. Personal local use

Double-click `MagicY8 START LOCAL.bat` to run it on this PC, or run:

```powershell
npm run dev
```

## Security notes

- Google Sheets and retry calls are authenticated with server-only secrets/signatures.
- Allowed browser origins are restricted by the Edge Function.
- Request sizes, video-only fields, durations, ratios, targets, and retry IDs are validated server-side.
- Sheet cells that could be interpreted as formulas are escaped.
- The Google webhook URL and secrets are no longer hard-coded in source.
- The Supabase anon key is public by design; never use a service-role key in the frontend.
- No website can be guaranteed “unhackable.” Keep Supabase, Groq, dependencies, and Apps Script permissions updated, and set conservative Groq project rate/spend limits.

## Verification

```powershell
npm run lint
npm run build
```

If the app says setup is incomplete, check `.env.local`. If Groq fails, test the key in API Settings. If Sheet sync fails, check all three Supabase secrets, the Apps Script script property, and that the latest Apps Script deployment is active.
