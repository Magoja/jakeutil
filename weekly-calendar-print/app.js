// Calendar Print Tool JS
// Weekly and Monthly calendar support

let currentView = 'weekly'; // 'weekly' or 'monthly'
let currentDate = new Date(); // serves as anchor for both views

// Helper: For weekly view, find the Sunday of the current week
function getSunday(date) {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  return d;
}

function getWeekDates(sunday) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    return d;
  });
}

function formatDateLabel(date) {
  return String(date.getDate()).padStart(2, '0');
}

function render() {
  if (currentView === 'weekly') {
    renderWeekCalendar();
  } else {
    renderMonthCalendar();
  }
}

function renderWeekCalendar() {
  const currentSunday = getSunday(currentDate);
  const weekDates = getWeekDates(currentSunday);
  const table = document.getElementById('calendar-table');
  const label = document.getElementById('current-label');
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Title row based on Wednesday using full month name
  const midDate = weekDates[3];
  const title = `Weekly Calendar of ${monthNames[midDate.getMonth()]}`;
  label.textContent = title;

  let html = '';
  // Header row with title and Wednesday
  html += '<tr>' + `<th style="text-align:center; font-size:1.5em;">${title}</th>` + renderDayCell(weekDates[3], days[3]) + '</tr>';
  // Row 1: Sunday and Thursday
  html += '<tr>' + [0, 4].map(i => renderDayCell(weekDates[i], days[i])).join('') + '</tr>';
  // Row 2: Monday and Friday
  html += '<tr>' + [1, 5].map(i => renderDayCell(weekDates[i], days[i])).join('') + '</tr>';
  // Row 3: Tuesday and Saturday
  html += '<tr>' + [2, 6].map(i => renderDayCell(weekDates[i], days[i])).join('') + '</tr>';
  table.innerHTML = html;
}

function renderMonthCalendar() {
  const table = document.getElementById('calendar-table');
  const label = document.getElementById('current-label');
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const daysShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Set Title
  label.textContent = `${monthNames[month]} ${year}`;

  let html = '<thead><tr>';
  daysShort.forEach(d => html += `<th class="month-header">${d}</th>`);
  html += '</tr></thead><tbody>';

  // Calculate dates
  const firstDay = new Date(year, month, 1);
  const startDay = firstDay.getDay(); // 0-6
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Generate grid
  let dayCount = 1;
  // 6 rows to cover all possibilities
  for (let row = 0; row < 6; row++) {
    html += '<tr class="month-row">';
    for (let col = 0; col < 7; col++) {
      if (row === 0 && col < startDay) {
        html += '<td class="month-cell empty"></td>';
      } else if (dayCount > daysInMonth) {
        html += '<td class="month-cell empty"></td>';
      } else {
        const dateObj = new Date(year, month, dayCount);
        html += renderMonthDayCell(dateObj);
        dayCount++;
      }
    }
    html += '</tr>';
    if (dayCount > daysInMonth) break;
  }
  html += '</tbody>';
  table.innerHTML = html;
}

function renderDayCell(date, weekday, center = false) {
  const dayIdx = date.getDay();
  let colorClass = '';
  if (dayIdx === 0) colorClass = 'sunday';
  if (dayIdx === 6) colorClass = 'saturday';
  return `<td${center ? ' style="text-align:center;"' : ''}>
    <span class="weekday ${colorClass}">${weekday[0]} <span class="date-label">${formatDateLabel(date)}</span></span>
    <div class="guidelines">
      <div class="guideline-row"></div>
      <div class="guideline-row"></div>
      <div class="guideline-row"></div>
      <div class="guideline-row"></div>
    </div>
  </td>`;
}

function renderMonthDayCell(date) {
  const dayIdx = date.getDay();
  let colorClass = '';
  if (dayIdx === 0) colorClass = 'sunday';
  if (dayIdx === 6) colorClass = 'saturday';

  return `<td class="month-cell">
        <div class="month-date-header">
            <span class="${colorClass}">${date.getDate()}</span>
        </div>
        <div class="month-content"></div>
    </td>`;
}

// Navigation Events
document.getElementById('prev-btn').addEventListener('click', () => {
  if (currentView === 'weekly') {
    currentDate.setDate(currentDate.getDate() - 7);
  } else {
    currentDate.setMonth(currentDate.getMonth() - 1);
  }
  render();
});

document.getElementById('next-btn').addEventListener('click', () => {
  if (currentView === 'weekly') {
    currentDate.setDate(currentDate.getDate() + 7);
  } else {
    currentDate.setMonth(currentDate.getMonth() + 1);
  }
  render();
});

document.getElementById('view-selector').addEventListener('change', (e) => {
  currentView = e.target.value;
  render();
});

document.getElementById('print-btn').addEventListener('click', () => {
  window.print();
});

document.addEventListener('DOMContentLoaded', render);
