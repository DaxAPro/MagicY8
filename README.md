# MagicY8 AI Video Prompt Generator

MagicY8 is a mobile-friendly AI video prompt studio for **Nails Style Video** and **Tattoo Style Video** prompts. It is designed to run for a long time on GitHub Pages with Firebase Firestore used for prompt saving.

## How It Works

1. The React app collects the idea and video settings.
2. MagicY8 uses the user's Gemini key for direct AI prompt analysis when configured.
3. Weak ideas are auto-improved before prompt generation.
4. Successful prompts are saved to Firebase Firestore when Firebase config is available.
5. Local history is used for learning better prompt patterns over time.
6. Without a Gemini key, prompt generation still works with the browser prompt engine.

## Current Production Mode

The live GitHub Pages site is Firebase-first:

- Google Sheets is not required.
- Gemini API key is optional.
- Prompt generation still works without an API key using the browser prompt engine.
- Firebase Firestore saves generated prompts when Firebase config and Firestore rules are correct.

## Install And Run Locally

Requirements: Node.js 20 or newer.

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Open `http://localhost:5173`.

## Firebase Setup

Add these values to `.env.local` for local use, and to the GitHub Pages workflow for production builds:

```text
VITE_FIREBASE_API_KEY=YOUR_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN=YOUR_FIREBASE_PROJECT.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=YOUR_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET=YOUR_FIREBASE_PROJECT.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=YOUR_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID=YOUR_FIREBASE_APP_ID
```

Firebase config values are public browser config. Security must be enforced by Firestore Security Rules.

## GitHub Pages Deployment

This repo deploys from `.github/workflows/deploy-pages.yml` on every push to `main`.

```powershell
npm run lint
npm run build
git push origin main
```

After pushing, GitHub Actions builds `dist` and publishes it to GitHub Pages. The live site can take a few minutes to show the new version. If a phone still shows the old UI, refresh the page or clear browser cache.

## Firestore Security

Use Firestore rules from `FIREBASE_SETUP.md`. The recommended setup allows public prompt creation with strict field validation and blocks browser reads, updates, and deletes.

That means:

- Prompt saving works from the website.
- Existing Firebase prompts are not readable by random visitors.
- Auto-learning uses local browser history by default.
- Global Firebase-based learning needs a future protected Cloud Function or carefully limited read endpoint.

## Optional Legacy Integrations

Some legacy files remain for optional future integrations:

- `google-apps-script/` contains an old Google Sheets path.
- `src/services/directGoogleSheets.ts` is optional and not part of the Firebase-first production flow.

Do not add private API keys or service-role secrets to frontend `VITE_*` variables.

## Verification

```powershell
npm run lint
npm run build
```

Both commands should pass before pushing changes to GitHub.
