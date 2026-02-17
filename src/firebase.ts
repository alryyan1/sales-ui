import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBivFl3oyBtjUOCUhycPW51P_2GzQ7E2Jw",
  authDomain: "sales-9e9b8.firebaseapp.com",
  projectId: "sales-9e9b8",
  storageBucket: "sales-9e9b8.firebasestorage.app",
  messagingSenderId: "849598643135",
  appId: "1:849598643135:web:e866e665a0eb7acbafff0a",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const storage = getStorage(app);
export const db = getFirestore(app);
