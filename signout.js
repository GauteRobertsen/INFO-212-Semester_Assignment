import { signOut } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { auth } from "./firebase.js";

document.addEventListener("DOMContentLoaded", () => {
  const logoutLink = document.getElementById("logout-link");

  if (logoutLink) {
    logoutLink.addEventListener("click", (e) => {
      e.preventDefault();

      signOut(auth)
        .then(() => {
          console.log("User signed out successfully");
          window.location.replace = "login_page.html";
        })
        .catch((error) => {
          console.error("Error signing out:", error);
        });
    });
  }
});