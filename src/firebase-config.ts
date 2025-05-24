import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore"; 

// Votre configuration Firebase (remplacez par vos propres clés)
const firebaseConfig = {
  apiKey: "AIzaSyBZKL34Ga1HEV11KPvYbayC6nT2Tx9w5Yg",
  authDomain: "salescoach-a85b1.firebaseapp.com",
  projectId: "salescoach-a85b1",
  storageBucket: "salescoach-a85b1.appspot.com",
  messagingSenderId: "85386023379",
  appId: "1:85386023379:web:76e6e870e5075f7ebd9f26",
  measurementId: "G-L7Q6YSPL1L"
};

// Initialiser Firebase
const app = initializeApp(firebaseConfig);

// Initialiser les services Firebase
const auth = getAuth(app);
const db = getFirestore(app); 

export { auth, db };
