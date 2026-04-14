import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyCltSqov7_ObT3IyDKazDfkoUM2RydxEh8",
  authDomain: "ss-packaging.firebaseapp.com",
  projectId: "ss-packaging",
  storageBucket: "ss-packaging.firebasestorage.app",
  messagingSenderId: "198358784207",
  appId: "1:198358784207:web:61227a6dededb0ab4b3fba",
  measurementId: "G-0CL77WYL23"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
