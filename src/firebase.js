import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBi4QDWNareOtVvFf28yL-o3VsQzYW5tj0",
  authDomain: "lab-soft.firebaseapp.com",
  projectId: "lab-soft",
  storageBucket: "lab-soft.firebasestorage.app",
  messagingSenderId: "536723946759",
  appId: "1:536723946759:web:88365d6f0a4f6ca83319a2",
  measurementId: "G-WC3RWE4YCR"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
