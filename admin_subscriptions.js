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

    let hasPending = false;

    for (const docSnap of snap.docs) {
      const req = { id: docSnap.id, ...docSnap.data() };

      // Only show pending requests
      if (req.status !== 'pending') continue;

      hasPending = true;

      // Fetch the user's email using the UID stored in req.from
      let emailOrUid = req.from;
      try {
        const userDoc = await getDoc(doc(db, "users", req.from));
        if (userDoc.exists() && userDoc.data().email) {
          emailOrUid = userDoc.data().email;
        }
      } catch (err) {
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

    // Show empty message if no pending requests
    if (!hasPending) {
      const li = document.createElement('li');
      li.className = 'list-group-item text-muted text-center py-5';
      li.innerHTML = `
        <div>
          <div style="font-size: 2.5rem;">📭</div>
          <div class="mt-2 fw-semibold">Ingen ventende forespørsler</div>
          <div class="small">Du vil se nye abonnementsforespørsler her når noen abonnerer på deg.</div>
        </div>
      `;
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

    // Add the adminId to subscriber's subscribedTo array
    batch.update(subscriberRef, { subscribedTo: arrayUnion(adminId) });

    // Optional: add a subscribers doc under admin
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
