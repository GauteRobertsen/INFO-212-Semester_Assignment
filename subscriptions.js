// subscriptions.js
import { db } from './firebase.js';
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import {
  collection, getDocs, doc, updateDoc, getDoc, query, where,
  arrayUnion, arrayRemove, setDoc, serverTimestamp, collectionGroup, onSnapshot
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const auth = getAuth();

// DOM elements
const orgDropdown = document.getElementById('orgDropdown');
const subscribeBtn = document.getElementById('subscribeBtn');
const subscribedList = document.getElementById('subscribedList');
const pendingList = document.getElementById('pendingList');

// Data
let userDocRef = null;
let currentUser = null;
let allAdmins = [];
let subscribedTo = [];
let pendingRequests = []; // array of { adminId, reqId, createdAt }

// Fetch all admin organizations
async function fetchAdmins() {
  const usersCol = collection(db, "users");
  const q = query(usersCol, where("isAdmin", "==", true));
  const snapshot = await getDocs(q);

  allAdmins = snapshot.docs.map(d => ({
    id: d.id,
    email: d.data().email || d.id
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

  // Build map for quick pending lookup
  const pendingMap = new Map(pendingRequests.map(r => [r.adminId, r]));

  allAdmins.forEach(admin => {
    const option = document.createElement('option');
    option.value = admin.id;

    // Friendly name
    const name = admin.email.split('@')[0];

    // If already subscribed — don't show in dropdown (they're in subscribed list)
    if (subscribedTo.includes(admin.id)) {
      // skip adding to dropdown
      return;
    }

    // If pending request exists, show disabled and mark pending
    if (pendingMap.has(admin.id)) {
      option.disabled = true;
      option.textContent = `${name} — (Venter...)`;
    } else {
      option.textContent = name;
    }

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
        if (confirm(`Vil du avslutte abonnementet på ${admin ? admin.email.split('@')[0] : uid}?`)) {
          await updateDoc(userDocRef, { subscribedTo: arrayRemove(uid) });
          subscribedTo = subscribedTo.filter(id => id !== uid);
          renderLists();
        }
      });

      li.appendChild(btn);
      subscribedList.appendChild(li);
    });
  }

  // --- Pending list UI (below dropdown) ---
  pendingList.innerHTML = '';
  if (pendingRequests.length === 0) {
    const li = document.createElement('li');
    li.className = 'list-group-item text-muted';
    li.textContent = 'Ingen ventende forespørsler.';
    pendingList.appendChild(li);
  } else {
    pendingRequests.forEach(r => {
      const admin = allAdmins.find(a => a.id === r.adminId);
      const li = document.createElement('li');
      li.className = 'list-group-item d-flex justify-content-between align-items-center';
      li.textContent = admin ? admin.email.split('@')[0] : r.adminId;

      const small = document.createElement('small');
      small.className = 'text-muted ms-2';
      small.textContent = r.createdAt ? timeAgo(r.createdAt.toDate()) : 'Nylig';
      li.appendChild(small);

      pendingList.appendChild(li);
    });
  }
}

// Helper: simple time-ago string for Date
function timeAgo(date) {
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSec < 60) return `${diffSec}s`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}t`;
  const diffDays = Math.floor(diffHr / 24);
  return `${diffDays}d`;
}

// Subscribe button click — create a request under admin's subcollection
subscribeBtn.addEventListener('click', async () => {
  const selectedAdminId = orgDropdown.value;
  if (!selectedAdminId) return alert("Velg en organisasjon først.");
  if (subscribedTo.includes(selectedAdminId)) return alert("Du abonnerer allerede på denne organisasjonen.");
  if (pendingRequests.some(r => r.adminId === selectedAdminId)) return alert("Forespørsel allerede sendt.");

  const requestsCol = collection(db, `users/${selectedAdminId}/subscriptionRequests`);
  const reqRef = doc(requestsCol); // auto id
  await setDoc(reqRef, {
    from: currentUser.uid,
    status: "pending",
    createdAt: serverTimestamp(),
    // optional: message: "Hei, jeg ønsker å abonnere"
  });

  alert("Forespørsel sendt — vent på godkjenning fra organisasjonen.");
  // local optimistic update: mark pending
  pendingRequests.push({ adminId: selectedAdminId, reqId: reqRef.id, createdAt: null });
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

  // Listen for any subscriptionRequests across all admins where from == currentUser.uid
  const cg = collectionGroup(db, 'subscriptionRequests');
  const q = query(cg, where('from', '==', currentUser.uid));
  onSnapshot(q, snap => {
    // refresh pendingRequests from snapshot
    pendingRequests = snap.docs
      .map(d => ({ adminId: d.ref.path.split('/')[1], reqId: d.id, ...d.data() }))
      .filter(r => r.status === 'pending'); // only keep pending
    renderLists();
  });

  // Finally show body
  document.body.style.display = 'block';
});
