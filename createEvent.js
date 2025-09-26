// createEvent.js
import { db, auth } from './firebase.js';
import { collection, addDoc, doc, getDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

console.log("createEvent.js loaded");

// Vent til brukeren er lastet
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        alert("Du må være logget inn som admin for å opprette et event.");
        window.location.href = "login_page.html"; // redirect til login
        return;
    }

    console.log("Logged in as:", user.email);

    // Sjekk om brukeren er admin
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (!userDoc.exists() || !userDoc.data().isAdmin) {
        alert("Du har ikke admin-rettigheter.");
        window.location.href = "login_page.html";
        return;
    }

    console.log("Admin verified");

    // Sett opp submit-event når brukeren er admin
    const createEventForm = document.getElementById('create-event-form');
    if (!createEventForm) {
        console.error("Form element not found!");
        return;
    }

    createEventForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const title = document.getElementById('event-title').value;
        const datetime = document.getElementById('event-datetime').value;
        const location = document.getElementById('event-location').value;
        const description = document.getElementById('event-description').value;

        // Sjekk at datetime er satt
        if (!datetime) {
            alert("Velg en dato og tid for eventet!");
            return;
        }

        console.log("Submitting event:", { title, datetime, location, description });

        try {
            await addDoc(collection(db, "events"), {
                title,
                datetime: new Date(datetime),
                location,
                description,
                createdBy: user.uid
            });

            alert("Event opprettet!");
            createEventForm.reset();
        } catch (error) {
            console.error("Error creating event:", error);
            alert("Feil ved oppretting av event: " + error.message);
        }
    });
});

