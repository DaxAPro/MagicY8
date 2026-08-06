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

function hasFirebaseConfig(): boolean {
  return Boolean(
    firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.appId,
  );
}

export interface PromptStorePayload {
  generationId?: string;
  toolType: ToolType;
  category: string;
  coreIdea: string;
  finalPrompt: string;
  model?: string;
  formData: Record<string, unknown>;
  fallbackUsed?: boolean;
}

export async function savePromptToFirebase(
  payload: PromptStorePayload,
): Promise<{ saved: boolean; skipped?: boolean; error?: string }> {
  const firebaseApp = await createFirebaseApp();
  if (!firebaseApp) return { saved: false, skipped: true };

  try {
    const { addDoc, collection, getFirestore, serverTimestamp } = await import("firebase/firestore");
    const db = getFirestore(firebaseApp);
    await addDoc(collection(db, "prompts"), {
      generationId: payload.generationId ?? "",
      toolType: payload.toolType,
      category: payload.category,
      originalCoreIdea: payload.coreIdea,
      finalPrompt: payload.finalPrompt,
      modelUsed: payload.model ?? "",
      fallbackUsed: Boolean(payload.fallbackUsed),
      formData: payload.formData,
      applicationName: "MagicY8",
      createdAt: serverTimestamp(),
      createdAtClient: new Date().toISOString(),
    });
    return { saved: true };
  } catch (err) {
    return {
      saved: false,
      error: err instanceof Error ? err.message : "Firebase save failed",
    };
  }
}

async function createFirebaseApp(): Promise<FirebaseApp | null> {
  if (!hasFirebaseConfig()) return null;
  if (!app) {
    const { initializeApp } = await import("firebase/app");
    app = initializeApp(firebaseConfig);
  }
  return app;
}
