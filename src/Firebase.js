// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use

const firebaseConfig = {
  apiKey: "AIzaSyB2MAFvoaf_nWQIXncXtBrpTvpKn05vmRs",
  authDomain: "foodbnb-10778.firebaseapp.com",
  projectId: "foodbnb-10778",
  storageBucket: "foodbnb-10778.firebasestorage.app",
  messagingSenderId: "217297623709",
  appId: "1:217297623709:web:990ff29bd2f1df66021274",
  measurementId: "G-NBGWX62336"
};
// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth= getAuth(app);
export const db = getFirestore(app , "firestore-db-foodbnb");
export default app;                                      