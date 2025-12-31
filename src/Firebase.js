// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBnOMUqbAdM8yS2TPR5G_jwPR_sdYusm4w",
  authDomain: "foodbnb-b6993.firebaseapp.com",
  projectId: "foodbnb-b6993",
  storageBucket: "foodbnb-b6993.firebasestorage.app",
  messagingSenderId: "553828899686",
  appId: "1:553828899686:web:bd8cd8d43ec0f0525686a7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export default app;                                      