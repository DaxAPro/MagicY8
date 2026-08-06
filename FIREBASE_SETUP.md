# Firebase Firestore Setup for MagicY8

Use Firebase Firestore when Google Sheet sync is unreliable.

## Create the database

1. Open Firebase Console and create/select a project.
2. Go to Build -> Firestore Database.
3. Click Create database.
4. Start in production mode.
5. Choose a nearby region and create the database.
6. Go to Project settings -> General -> Your apps.
7. Add a Web app and copy the Firebase config values.
8. Put those values in `.env.local` using the keys from `.env.example`.
9. Restart the website dev server.

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
        request.resource.data.createdAt == request.time;
    }
  }
}
```

## Free quota

Cloud Firestore's free quota includes 20,000 document writes per day, 50,000 reads per day, and 1 GiB stored data for one free database per project.
