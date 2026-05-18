import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import appleConfig from '../../firebase-applet-config.json';

// @ts-ignore
const env = import.meta.env;

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || appleConfig.apiKey,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || appleConfig.authDomain,
  projectId: env.VITE_FIREBASE_PROJECT_ID || appleConfig.projectId,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || appleConfig.storageBucket,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || appleConfig.messagingSenderId,
  appId: env.VITE_FIREBASE_APP_ID || appleConfig.appId,
  firestoreDatabaseId: env.VITE_FIREBASE_DATABASE_ID || appleConfig.firestoreDatabaseId || '(default)'
};

const isConfigValid = firebaseConfig.apiKey && firebaseConfig.apiKey !== 'placeholder';

const app = !getApps().length ? (isConfigValid ? initializeApp(firebaseConfig) : null) : getApp();

export const db = app ? getFirestore(app, firebaseConfig.firestoreDatabaseId) : null as any;
export const auth = app ? getAuth(app) : null as any;
export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = () => auth ? signInWithPopup(auth, googleProvider) : Promise.reject('Firebase not configured');
export const logout = () => auth ? signOut(auth) : Promise.reject('Firebase not configured');

export { isConfigValid };
