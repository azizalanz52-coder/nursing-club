import { initializeApp, getApps, getApp } from "firebase/app";
import { browserLocalPersistence, getAuth, indexedDBLocalPersistence, initializeAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDKlVEjVC-IiqGVlqD8V9pX_1cGalHKfYw",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "nursing-club-62994.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "nursing-club-62994",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "nursing-club-62994.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "135230922363",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:135230922363:web:e24c421861df3ec148ccde",
  measurementId: "G-YTN7JBYE77"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

function prefersLocalAuthPersistence() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const iOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  return iOS;
}

function getClubAuth() {
  if (typeof window === "undefined") return getAuth(app);
  // الآيفون يمسح IndexedDB، فتضيع جلسة Firebase واللوحة تبقى مفتوحة برقم الجوال فقط.
  const persistence = prefersLocalAuthPersistence()
    ? browserLocalPersistence
    : [indexedDBLocalPersistence, browserLocalPersistence];
  try {
    return initializeAuth(app, { persistence });
  } catch {
    const existing = getAuth(app);
    existing.setPersistence(browserLocalPersistence).catch(() => undefined);
    return existing;
  }
}

export const auth = getClubAuth();
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;