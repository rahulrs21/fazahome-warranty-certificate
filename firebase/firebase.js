// Import the functions you need from the SDKs you need
import { getApp, getApps, initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";
import { getFirestore } from "firebase/firestore";
import { connectAuthEmulator, getAuth } from "firebase/auth";

// Your web app's Firebase configuration using environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: "faza-warranty.firebasestorage.app", // Updated to use the correct storage bucket
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase
// const app = initializeApp(firebaseConfig);

// Initialize Firebase only once
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const storage = getStorage(app);

export const db = getFirestore(app);

export function getFirebaseAuth() {
  const auth = getAuth(app);
  const emulator = process.env.NEXT_PUBLIC_AUTH_EMULATOR_HOST;
  if (emulator && firebaseConfig.projectId?.startsWith("demo-") && !auth.emulatorConfig) {
    connectAuthEmulator(auth, `http://${emulator}`, { disableWarnings: true });
  }
  return auth;
}
