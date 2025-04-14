import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";    
import {getFirestore} from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA1r08XXBiMIrJ736Spq28_vZFV4pvsWUM",
  authDomain: "sportsmate-ccf54.firebaseapp.com",
  projectId: "sportsmate-ccf54",
  storageBucket: "sportsmate-ccf54.firebasestorage.app",
  messagingSenderId: "432417359220",
  appId: "1:432417359220:web:76c7c55326b09698e05821"
};


// Initialize Firebase
export const app = initializeApp(firebaseConfig);