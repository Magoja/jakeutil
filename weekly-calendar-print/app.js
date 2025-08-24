// Weekly Calendar Print Tool JS
// Clean horizontal weekly calendar, Sunday start, navigation arrows, print button

function getCurrentWeekInfo() {
    const today = new Date();
    // Find Sunday of this week
    const dayOfWeek = today.getDay(); // 0=Sun
    const sunday = new Date(today);
    sunday.setDate(today.getDate() - dayOfWeek);
    return { year: sunday.getFullYear(), month: sunday.getMonth(), date: sunday.getDate(), sunday };
}

function getWeekDates(sunday) {
    // Returns array of Date objects for Sun-Sat
    return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(sunday);
        d.setDate(sunday.getDate() + i);
        return d;
    });
}

function formatDateLabel(date) {
  return String(date.getDate()).padStart(2,'0');
}

let currentSunday = getCurrentWeekInfo().sunday;

function renderWeekCalendar() {
    const weekDates = getWeekDates(currentSunday);
    const table = document.getElementById('calendar-table');
    const weekLabel = document.getElementById('current-week-label');
    const weekNum = getWeekNumber(currentSunday);
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    // Title row: Weekly Calendar of Aug XX, Wednesday
    const midDate = weekDates[3];
    const title = `Weekly Calendar of ${monthNames[midDate.getMonth()]}`;
    weekLabel.textContent = title;
    let html = '';
    html += '<tr>' + `<th style="text-align:center; font-size:1.5em;">${title}</th>` + renderDayCell(weekDates[3], days[3]) + '</tr>';
    // Row 1: Sunday and Thursday
    html += '<tr>' + [0, 4].map(i => renderDayCell(weekDates[i], days[i])).join('') + '</tr>';
    // Row 2: Monday and Friday
    html += '<tr>' + [1, 5].map(i => renderDayCell(weekDates[i], days[i])).join('') + '</tr>';
    // Row 3: Tuesday and Saturday
    html += '<tr>' + [2, 6].map(i => renderDayCell(weekDates[i], days[i])).join('') + '</tr>';
    table.innerHTML = html;
}

function renderDayCell(date, weekday, center=false) {
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

function getWeekNumber(date) {
    // ISO week number, but starting with Sunday
    const firstJan = new Date(date.getFullYear(), 0, 1);
    const days = Math.floor((date - firstJan) / 86400000);
    return Math.floor((days + firstJan.getDay()) / 7) + 1;
}

document.getElementById('prev-week').addEventListener('click', () => {
    currentSunday.setDate(currentSunday.getDate() - 7);
    renderWeekCalendar();
});
document.getElementById('next-week').addEventListener('click', () => {
    currentSunday.setDate(currentSunday.getDate() + 7);
    renderWeekCalendar();
});
document.getElementById('print-btn').addEventListener('click', () => {
    window.print();
});

document.addEventListener('DOMContentLoaded', renderWeekCalendar);
