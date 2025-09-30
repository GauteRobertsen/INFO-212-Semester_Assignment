// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "",
  authDomain: "login-form-59de4.firebaseapp.com",
  projectId: "login-form-59de4",
  storageBucket: "login-form-59de4.appspot.com",
  messagingSenderId: "524532626361",
  appId: "1:524532626361:web:409c0a04698c30268bfc68"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Export so other scripts can use
export { db, auth };
