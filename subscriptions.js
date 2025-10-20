import { db } from './firebase.js';
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { collection, getDocs, doc, updateDoc, getDoc, query, where, arrayUnion, arrayRemove } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const auth = getAuth();

// DOM elements
const orgDropdown = document.getElementById('orgDropdown');
const subscribeBtn = document.getElementById('subscribeBtn');
const subscribedList = document.getElementById('subscribedList');

// Data
let userDocRef = null;
let currentUser = null;
let allAdmins = [];
let subscribedTo = [];

// Fetch all admin organizations
async function fetchAdmins() {
    const usersCol = collection(db, "users");
    const q = query(usersCol, where("isAdmin", "==", true));
    const snapshot = await getDocs(q);

    allAdmins = snapshot.docs.map(doc => ({
        id: doc.id,
        email: doc.data().email || doc.id
    }));
}

// Load current user's subscribedTo array
async function loadUserData(user) {
    userDocRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userDocRef);

    if (userSnap.exists()) {
        const data = userSnap.data();
        subscribedTo = data.subscribedTo || [];
    } else {
        subscribedTo = [];
    }

    renderLists();
}

// Render dropdown and subscribed list
function renderLists() {
    // --- Dropdown: available orgs ---
    orgDropdown.innerHTML = '<option value="">Velg organisasjon</option>';
    const availableOrgs = allAdmins.filter(admin => !subscribedTo.includes(admin.id));

    availableOrgs.forEach(admin => {
        const option = document.createElement('option');
        option.value = admin.id;
        option.textContent = admin.email.split('@')[0]; // Show friendly name
        orgDropdown.appendChild(option);
    });

    // --- Subscribed list ---
    subscribedList.innerHTML = '';
    if (subscribedTo.length === 0) {
        const li = document.createElement('li');
        li.className = 'list-group-item text-muted';
        li.textContent = 'Du abonnerer på ingen organisasjoner ennå.';
        subscribedList.appendChild(li);
    } else {
        subscribedTo.forEach(uid => {
            const admin = allAdmins.find(a => a.id === uid);
            const li = document.createElement('li');
            li.className = 'list-group-item d-flex justify-content-between align-items-center';
            li.textContent = admin ? admin.email.split('@')[0] : uid;

            const btn = document.createElement('button');
            btn.className = 'btn btn-danger btn-sm';
            btn.textContent = 'Avslutt abonnement';
            btn.addEventListener('click', async () => {
                if (confirm(`Vil du avslutte abonnementet på ${admin.email.split('@')[0]}?`)) {
                    subscribedTo = subscribedTo.filter(id => id !== uid);
                    await updateDoc(userDocRef, { subscribedTo: arrayRemove(uid) });
                    renderLists();
                }
            });

            li.appendChild(btn);
            subscribedList.appendChild(li);
        });
    }
}

// Subscribe button click
subscribeBtn.addEventListener('click', async () => {
    const selected = orgDropdown.value;
    if (!selected) return alert("Velg en organisasjon først.");
    if (subscribedTo.includes(selected)) return alert("Du abonnerer allerede på denne organisasjonen.");

    subscribedTo.push(selected);
    await updateDoc(userDocRef, { subscribedTo: arrayUnion(selected) });
    alert("Du har abonnert!");
    renderLists();
});

// Initialize page when user is logged in
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "login_page.html";
        return;
    }
    currentUser = user;
    await fetchAdmins();
    await loadUserData(user);
});
