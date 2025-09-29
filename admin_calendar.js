// admin_calendar.js
import { db, auth } from './firebase.js';
import { collection, getDocs, query, where, doc, getDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

// DOM Elements
const monthYearEl = document.getElementById('monthYear');
const calendarDaysEl = document.getElementById('calendarDays');
const calendarDatesEl = document.getElementById('calendarDates');
const prevBtn = document.getElementById('prevMonth');
const nextBtn = document.getElementById('nextMonth');

const daysOfWeek = ["Man", "Tir", "Ons", "Tor", "Fre", "Lør", "Søn"];
let currentDate = new Date();

let events = [];
let currentUser = null; // uid til innlogget admin

// Format time for display
function formatTime(date) {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
}

// Hent kun events for innlogget admin
async function fetchEventsForAdmin(uid) {
    const eventsCol = collection(db, "events");
    const q = query(eventsCol, where("createdBy", "==", uid));
    const snapshot = await getDocs(q);
    events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// Render kalender
function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Month title
    monthYearEl.textContent = currentDate.toLocaleString("no-NB", { month: "long", year: "numeric" });

    // Days of week header
    calendarDaysEl.innerHTML = '';
    daysOfWeek.forEach(day => {
        const dayEl = document.createElement('div');
        dayEl.className = 'col border p-2';
        dayEl.textContent = day;
        calendarDaysEl.appendChild(dayEl);
    });

    // Days in month
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0=Sunday
    const lastDayIndex = new Date(year, month, daysInMonth).getDay(); // 0=Sunday

    const paddingStart = firstDayIndex === 0 ? 6 : firstDayIndex - 1;
    const paddingEnd = lastDayIndex === 0 ? 0 : 7 - lastDayIndex;

    const allDays = [
        ...Array(paddingStart).fill(null),
        ...Array(daysInMonth).fill().map((_, i) => i + 1),
        ...Array(paddingEnd).fill(null)
    ];

    // Render weeks
    calendarDatesEl.innerHTML = '';
    for (let i = 0; i < allDays.length; i += 7) {
        const week = allDays.slice(i, i + 7);
        const row = document.createElement('div');
        row.className = 'row text-center';

        week.forEach(day => {
            const col = document.createElement('div');
            col.className = 'col calendar-cell border p-1';

            if (day) {
                // Top spacer
                const topSpacer = document.createElement('div');
                topSpacer.style.height = '12px';
                col.appendChild(topSpacer);

                // Day number
                const dayNumber = document.createElement('div');
                dayNumber.className = 'calendar-day-number mb-1';
                dayNumber.textContent = day;
                col.appendChild(dayNumber);

                // Events for this day
                const dayDate = new Date(year, month, day);
                let dayEvents = events.filter(ev => {
                    const evDate = ev.datetime.toDate ? ev.datetime.toDate() : new Date(ev.datetime);
                    return evDate.getFullYear() === dayDate.getFullYear() &&
                           evDate.getMonth() === dayDate.getMonth() &&
                           evDate.getDate() === dayDate.getDate();
                });

                // Sort events by time
                dayEvents.sort((a, b) => {
                    const aDate = a.datetime.toDate ? a.datetime.toDate() : new Date(a.datetime);
                    const bDate = b.datetime.toDate ? b.datetime.toDate() : new Date(b.datetime);
                    return aDate - bDate;
                });

                // Add events
                dayEvents.forEach(ev => {
                    const evDate = ev.datetime.toDate ? ev.datetime.toDate() : new Date(ev.datetime);
                    const evDiv = document.createElement('div');
                    evDiv.className = 'calendar-event small text-truncate';
                    evDiv.textContent = `${formatTime(evDate)} ${ev.title}`;
                    col.appendChild(evDiv);
                });
            }

            row.appendChild(col);
        });

        calendarDatesEl.appendChild(row);
    }
}

// Month navigation
prevBtn.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
});

nextBtn.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
});

// Init – sjekk auth og last events
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        alert("Du må være logget inn som admin for å se dine arrangementer.");
        window.location.href = "login_page.html";
        return;
    }

    // Sjekk admin
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (!userDoc.exists() || !userDoc.data().isAdmin) {
        alert("Du har ikke admin-rettigheter.");
        window.location.href = "login_page.html";
        return;
    }

    currentUser = user;
    await fetchEventsForAdmin(currentUser.uid);
    renderCalendar();
});
