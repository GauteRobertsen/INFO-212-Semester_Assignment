import { db } from './firebase.js';
import { collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// DOM Elements
const monthYearEl = document.getElementById('monthYear');
const calendarDaysEl = document.getElementById('calendarDays');
const calendarDatesEl = document.getElementById('calendarDates');
const prevBtn = document.getElementById('prevMonth');
const nextBtn = document.getElementById('nextMonth');
const adminFilterEl = document.getElementById('adminFilter');

const daysOfWeek = ["Man", "Tir", "Ons", "Tor", "Fre", "Lør", "Søn"];
let currentDate = new Date();

let events = [];
let adminMap = {};       // UID -> friendlyName
let adminColors = {};    // UID -> color
let activeAdmins = new Set();  // Which admins are selected in filter

// Predefined colors for admins
const COLORS = [
    '#FF5733', '#33C1FF', '#33FF57', '#FF33A8', '#FFC733', '#8D33FF', '#33FFF3'
];

// Fetch admin users
async function fetchAdmins() {
    const usersCol = collection(db, "users");
    const q = query(usersCol, where("isAdmin", "==", true));
    const snapshot = await getDocs(q);
    let i = 0;
    snapshot.forEach(doc => {
        const data = doc.data();
        const uid = doc.id;
        const email = data.email || uid;
        const friendlyName = email.includes('@') ? email.split('@')[0] : email;
        adminMap[uid] = friendlyName;
        adminColors[uid] = COLORS[i % COLORS.length];
        activeAdmins.add(uid); // Initially all admins active
        i++;
    });
}

// Fetch all events
async function fetchEvents() {
    const eventsCol = collection(db, "events");
    const snapshot = await getDocs(eventsCol);
    events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// Fetch and render upcoming events
async function renderUpcomingEvents() {
    const upcomingEventsEl = document.querySelector('.list-group');
    upcomingEventsEl.innerHTML = ''; // Clear existing content

    try {
        // Fetch events from Firestore
        const eventsCol = collection(db, "events");
        const snapshot = await getDocs(eventsCol);

        // Filter events for the user's organizations
        const userOrganizations = Object.keys(adminMap).filter(uid => activeAdmins.has(uid));
        const now = new Date();
        const upcomingEvents = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(event => {
                const eventDate = event.datetime.toDate ? event.datetime.toDate() : new Date(event.datetime);
                return eventDate > now && userOrganizations.includes(event.createdBy);
            })
            .sort((a, b) => new Date(a.datetime) - new Date(b.datetime)) // Sort by date
            .slice(0, 3); // Limit to 3 events

        // Render events
        if (upcomingEvents.length === 0) {
            upcomingEventsEl.innerHTML = '<p class="text-muted">No upcoming events.</p>';
        } else {
            upcomingEvents.forEach(event => {
                const eventDate = event.datetime.toDate ? event.datetime.toDate() : new Date(event.datetime);
                const eventItem = document.createElement('a');
                eventItem.href = '#';
                eventItem.className = 'list-group-item list-group-item-action';
                eventItem.innerHTML = `
                    <div class="d-flex w-100 justify-content-between">
                        <h5 class="mb-1">${event.title}</h5>
                        <small>${eventDate.toLocaleDateString('no-NB', { day: 'numeric', month: 'long', year: 'numeric' })}</small>
                    </div>
                    <p class="mb-1">${event.description || 'No description available.'}</p>
                `;
                upcomingEventsEl.appendChild(eventItem);
            });
        }
    } catch (error) {
        console.error("Error fetching upcoming events:", error);
        upcomingEventsEl.innerHTML = '<p class="text-danger">Failed to load upcoming events.</p>';
    }
}

// Format time for display
function formatTime(date) {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
}

// Render filter checkboxes
function renderFilter() {
    adminFilterEl.classList.add('filter-list');
    adminFilterEl.innerHTML = '';
    for (const [uid, name] of Object.entries(adminMap)) {
        const div = document.createElement('div');
        div.className = 'form-check';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'form-check-input';
        checkbox.id = `filter-${uid}`;
        checkbox.checked = activeAdmins.has(uid);
        const label = document.createElement('label');
        label.className = 'form-check-label';
        label.htmlFor = `filter-${uid}`;

        const dot = document.createElement('span'); // lager fargeprikken
        dot.className = 'filter-dot';
        if (checkbox.checked) {
            dot.style.backgroundColor = adminColors[uid];
        }
        const text = document.createElement('span');
        text.textContent = name;
        label.appendChild(dot);
        label.appendChild(text);
        checkbox.addEventListener('change', () => {
            if (checkbox.checked) {
                activeAdmins.add(uid);
                dot.style.backgroundColor = adminColors[uid]; 
            } else {
                activeAdmins.delete(uid);
                dot.style.backgroundColor = ''; 
            }
            renderCalendar();
            renderUpcomingEvents();
        });

        div.appendChild(checkbox);
        div.appendChild(label);
        adminFilterEl.appendChild(div);
    }
}

// Render calendar
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

                // Events for this day and active admins
                const dayDate = new Date(year, month, day);
                let dayEvents = events.filter(ev => {
                    const evDate = ev.datetime.toDate ? ev.datetime.toDate() : new Date(ev.datetime);
                    return evDate.getFullYear() === dayDate.getFullYear() &&
                           evDate.getMonth() === dayDate.getMonth() &&
                           evDate.getDate() === dayDate.getDate() &&
                           activeAdmins.has(ev.createdBy);
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
                    const bg = adminColors[ev.createdBy] || '#777';
                    evDiv.style.backgroundColor = bg;
                    evDiv.style.color = '#fff';
                    evDiv.style.boxShadow = '0 0 0 1px rgba(0,0,0,.08) inset';
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

// Init
async function init() {
    await fetchAdmins();
    renderFilter();
    adminFilterEl.classList.add('filter-list');
    await fetchEvents();
    renderCalendar();
    renderUpcomingEvents();
}
init();
