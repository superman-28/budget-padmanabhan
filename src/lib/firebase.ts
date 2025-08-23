
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDfD0tQojgU5y51wpQt9yz0_24ovBlPgaI",
  authDomain: "spendwise-c03b1.firebaseapp.com",
  projectId: "spendwise-c03b1",
  storageBucket: "spendwise-c03b1.firebasestorage.app",
  messagingSenderId: "48781807258",
  appId: "1:48781807258:web:c26cd43c9ca3c09d8f1923",
  measurementId: "G-F5DX56RKH4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

export default app;
