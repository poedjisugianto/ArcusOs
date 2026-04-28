import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfigFile from '../firebase-applet-config.json';

// Define the config type
interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
  firestoreDatabaseId?: string;
}

const getFirebaseConfig = (): FirebaseConfig => {
  // Try environment variables first (Vite style)
  const envConfig: FirebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
    firestoreDatabaseId: import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID,
  };

  // If environment variables are available, use them
  if (envConfig.apiKey && envConfig.projectId) {
    return envConfig;
  }

  // Otherwise, use the bundled json file
  return firebaseConfigFile as FirebaseConfig;
};

const firebaseConfig = getFirebaseConfig();

const app = (() => {
  try {
    if (getApps().length > 0) return getApp();
    if (!firebaseConfig.apiKey || firebaseConfig.apiKey === "") {
      console.warn("Firebase API Key is missing. Check your environment variables or firebase-applet-config.json");
      return null;
    }
    return initializeApp(firebaseConfig);
  } catch (err) {
    console.error("Firebase App initialization failed:", err);
    return null;
  }
})();

export const db = app ? getFirestore(app, firebaseConfig.firestoreDatabaseId) : null as any;
export const auth = app ? getAuth(app) : null as any;

async function testConnection() {
  if (!db) return;
  try {
    console.log("Testing cloud connection...");
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Cloud connection successful.");
  } catch (error: any) {
    if (error?.message?.includes('the client is offline')) {
      console.warn("Firebase client is offline. Working in local mode.");
    } else {
      console.error("Firebase connection test failed:", error);
    }
  }
}

if (app) testConnection();
