    const monthYearEl = document.getElementById('monthYear');
    const calendarDaysEl = document.getElementById('calendarDays');
    const calendarDatesEl = document.getElementById('calendarDates');
    const prevBtn = document.getElementById('prevMonth');
    const nextBtn = document.getElementById('nextMonth');

    const daysOfWeek = ["Man", "Tir", "Ons", "Tor", "Fre", "Lør", "Søn"];

    let currentDate = new Date();

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

        // Monday-first adjustment
        const paddingStart = firstDayIndex === 0 ? 6 : firstDayIndex - 1;
        const paddingEnd = lastDayIndex === 0 ? 0 : 7 - lastDayIndex;

        // build array with start + dates + end padding
        const allDays = [
            ...Array(paddingStart).fill(null), 
            ...Array(daysInMonth).fill().map((_, i) => i + 1),
            ...Array(paddingEnd).fill(null)
        ];

        // Render in rows of 7
        calendarDatesEl.innerHTML = '';
        for (let i = 0; i < allDays.length; i += 7) {
          const week = allDays.slice(i, i + 7);
          const row = document.createElement('div');
          row.className = 'row text-center';
          week.forEach(day => {
          const col = document.createElement('div');
          col.className = 'col calendar-cell';

          if (day) {
            // Day number in top-right
            const dayNumber = document.createElement('div');
            dayNumber.className = 'calendar-day-number';
            dayNumber.textContent = day;

            // Placeholder for notes (3 lines)
            const content = document.createElement('div');
            content.className = 'calendar-content';
            content.innerHTML = ' '; // leave empty or fill dynamically

            col.appendChild(dayNumber);
            col.appendChild(content);
          }

          row.appendChild(col);
        });

          calendarDatesEl.appendChild(row);
        }
    } 

    prevBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
    });

    nextBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
    });

    renderCalendar();