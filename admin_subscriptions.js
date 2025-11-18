// admin_subscriptions.js
import { db } from './firebase.js';
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import {
  doc, collection, query, orderBy, onSnapshot, writeBatch,
  serverTimestamp, arrayUnion, setDoc, getDoc
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const auth = getAuth();
const requestsList = document.getElementById('requestsList');
const noAccess = document.getElementById('noAccess');

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login_page.html";
    return;
  }

  // Check if this user is admin by reading users/{uid}.isAdmin
  const userDocRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userDocRef);
  if (!userSnap.exists() || !userSnap.data().isAdmin) {
    noAccess.classList.remove('d-none');
    document.body.style.display = 'block';
    return;
  }

  // Listen for incoming requests
  const requestsCol = collection(db, `users/${user.uid}/subscriptionRequests`);
  const q = query(requestsCol, orderBy('createdAt', 'desc'));

  onSnapshot(q, async (snap) => {
    requestsList.innerHTML = '';
    if (snap.empty) {
      const li = document.createElement('li');
      li.className = 'list-group-item text-muted';
      li.textContent = 'Ingen ventende forespørsler.';
      requestsList.appendChild(li);
      return;
    }

    // Use for..of so we can await inside the loop
    for (const docSnap of snap.docs) {
      const req = { id: docSnap.id, ...docSnap.data() };
      // Only show pending requests
      if (req.status !== 'pending') continue;

      // Fetch the user's email using the UID stored in req.from
      let emailOrUid = req.from;
      try {
        const userDoc = await getDoc(doc(db, "users", req.from));
        if (userDoc.exists() && userDoc.data().email) {
          emailOrUid = userDoc.data().email;
        }
      } catch (err) {
        // If fetching fails, fall back to showing the UID
        console.error('Failed to load user email for', req.from, err);
      }

      const li = document.createElement('li');
      li.className = 'list-group-item d-flex justify-content-between align-items-start';

      const left = document.createElement('div');
      left.innerHTML = `<strong>${emailOrUid}</strong><br><small>${req.message || ''}</small>`;
      li.appendChild(left);

      const right = document.createElement('div');

      const acceptBtn = document.createElement('button');
      acceptBtn.className = 'btn btn-success btn-sm me-2';
      acceptBtn.textContent = 'Godta';
      acceptBtn.addEventListener('click', () => acceptRequest(user.uid, docSnap.id, req.from));

      const denyBtn = document.createElement('button');
      denyBtn.className = 'btn btn-secondary btn-sm';
      denyBtn.textContent = 'Avslå';
      denyBtn.addEventListener('click', () => denyRequest(user.uid, docSnap.id));

      right.appendChild(acceptBtn);
      right.appendChild(denyBtn);
      li.appendChild(right);

      requestsList.appendChild(li);
    }
  });

  document.body.style.display = 'block';
});

async function acceptRequest(adminId, requestId, subscriberId) {
  if (!confirm('Godta forespørselen?')) return;

  try {
    const batch = writeBatch(db);

    const reqRef = doc(db, `users/${adminId}/subscriptionRequests/${requestId}`);
    const subscriberRef = doc(db, `users/${subscriberId}`);
    const adminSubscriberRef = doc(db, `users/${adminId}/subscribers/${subscriberId}`);

    // Update the request status
    batch.update(reqRef, { status: 'accepted', handledAt: serverTimestamp() });

    // Add the adminId to subscriber's subscribedTo array (create array if missing)
    batch.update(subscriberRef, { subscribedTo: arrayUnion(adminId) });

    // Optional: add a subscribers doc under admin for quick listing
    batch.set(adminSubscriberRef, { userId: subscriberId, subscribedAt: serverTimestamp() });

    await batch.commit();
    alert('Forespørsel godkjent.');
  } catch (err) {
    console.error('Failed to accept request:', err);
    alert('Kunne ikke godkjenne forespørselen. Se konsollen for detaljer.');
  }
}

async function denyRequest(adminId, requestId) {
  if (!confirm('Avslå forespørselen?')) return;

  try {
    const reqRef = doc(db, `users/${adminId}/subscriptionRequests/${requestId}`);
    await setDoc(reqRef, { status: 'denied', handledAt: serverTimestamp() }, { merge: true });
    alert('Forespørsel avslått.');
  } catch (err) {
    console.error('Failed to deny request:', err);
    alert('Kunne ikke avslå forespørselen. Se konsollen for detaljer.');
  }
}
