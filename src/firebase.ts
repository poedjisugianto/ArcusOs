import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = (() => {
  try {
    return initializeApp(firebaseConfig);
  } catch (err) {
    console.error("Firebase App initialization failed:", err);
    return null as any;
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
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Firebase client is offline. Working in local mode.");
    } else {
      console.error("Firebase connection test failed:", error);
    }
  }
}
if (app) testConnection();
