import type { ToolType } from "../types";

type FirebaseApp = import("firebase/app").FirebaseApp;

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
};

let app: FirebaseApp | null = null;

export interface RecentPromptRecord {
  toolType: ToolType;
  originalCoreIdea: string;
  finalPrompt: string;
  createdAtClient?: string;
}

function hasFirebaseConfig(): boolean {
  return Boolean(
    firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.appId,
  );
}

async function createFirebaseApp(): Promise<FirebaseApp | null> {
  if (!hasFirebaseConfig()) return null;
  if (!app) {
    const { initializeApp } = await import("firebase/app");
    app = initializeApp(firebaseConfig);
  }
  return app;
}

export async function fetchRecentFirebasePrompts(
  maxRecords = 80,
): Promise<RecentPromptRecord[]> {
  const firebaseApp = await createFirebaseApp();
  if (!firebaseApp) return [];

  try {
    const { collection, getDocs, getFirestore, limit, orderBy, query } = await import("firebase/firestore");
    const db = getFirestore(firebaseApp);
    const snapshot = await getDocs(query(
      collection(db, "prompts"),
      orderBy("createdAtClient", "desc"),
      limit(maxRecords),
    ));

    return snapshot.docs.flatMap((doc) => {
      const data = doc.data() as Partial<RecentPromptRecord>;
      if (
        (data.toolType === "nails_video" || data.toolType === "tattoo_video") &&
        typeof data.originalCoreIdea === "string" &&
        typeof data.finalPrompt === "string"
      ) {
        return [{
          toolType: data.toolType,
          originalCoreIdea: data.originalCoreIdea,
          finalPrompt: data.finalPrompt,
          createdAtClient: typeof data.createdAtClient === "string" ? data.createdAtClient : undefined,
        }];
      }
      return [];
    });
  } catch {
    return [];
  }
}
