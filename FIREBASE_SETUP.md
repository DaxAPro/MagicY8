# Firebase Firestore Setup for MagicY8

MagicY8 uses Firebase Firestore as the main prompt database for the GitHub Pages version.

## Create The Database

1. Open Firebase Console and create/select the `magicy8-ai` project.
2. Go to Build -> Firestore Database.
3. Click Create database.
4. Start in production mode.
5. Choose a nearby region and create the database.
6. Go to Project settings -> General -> Your apps.
7. Add a Web app and copy the Firebase config values.
8. Put those values in `.env.local` for local testing.
9. Keep the same public Firebase config in `.github/workflows/deploy-pages.yml` for GitHub Pages builds.

## Firestore Security Rules

Paste these in Firestore Database -> Rules:

```js
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /prompts/{promptId} {
      allow read, update, delete: if false;

      allow create: if
        request.resource.data.applicationName == "MagicY8" &&
        request.resource.data.toolType in ["nails_video", "tattoo_video"] &&
        request.resource.data.originalCoreIdea is string &&
        request.resource.data.originalCoreIdea.size() > 0 &&
        request.resource.data.originalCoreIdea.size() <= 2000 &&
        request.resource.data.finalPrompt is string &&
        request.resource.data.finalPrompt.size() > 0 &&
        request.resource.data.finalPrompt.size() <= 12000 &&
        request.resource.data.createdAtClient is string;
    }
  }
}
```

## Important Behavior

- The website can save new prompt records.
- Visitors cannot read, edit, or delete saved prompts directly from the browser.
- Auto-learning still works from local browser history.
- Firebase-wide/global learning should be added later through a protected Firebase Cloud Function if needed.

## Free Quota

Cloud Firestore's free quota includes 20,000 document writes per day, 50,000 reads per day, and 1 GiB stored data for one free database per project.

## Manual Save Test

1. Open the live GitHub Pages site.
2. Generate one Nails prompt and one Tattoo prompt.
3. Open Firebase Console -> Firestore Database -> `prompts`.
4. Confirm two new records exist with `applicationName: "MagicY8"`.