// authCheck.js
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { auth } from "./firebase.js";

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.replace("login_page.html"); // redirect if not signed in
} else {
    document.body.style.display = "block"; // show page only if logged in
  }
});
