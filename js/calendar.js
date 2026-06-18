// A tiny dependency-free month calendar renderer.
//
// `calendarHTML(fromDate, monthCount, markFn)` returns HTML for `monthCount`
// consecutive months starting at the month of `fromDate`. For each day it calls
// `markFn(dateStr)` (dateStr = "YYYY-MM-DD") and places the returned HTML inside
// the cell — callers use this to mark bookings, events, etc. Weeks start Monday.

const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function ds(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function renderMonth(year, month, markFn) {
  const today = todayStr();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // JS: 0=Sun..6=Sat → convert to Monday-first (Mon=0).
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;

  let cells = "";
  for (let i = 0; i < firstWeekday; i++) cells += `<div class="cal-cell empty"></div>`;
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = ds(year, month, day);
    const marks = markFn ? markFn(dateStr) : "";
    cells += `
      <div class="cal-cell${dateStr === today ? " today" : ""}">
        <div class="cal-day">${day}</div>
        ${marks ? `<div class="cal-marks">${marks}</div>` : ""}
      </div>`;
  }

  return `
    <div class="cal-month">
      <div class="cal-title">${MONTHS[month]} ${year}</div>
      <div class="cal-grid">
        ${DOW.map((d) => `<div class="cal-dow">${d}</div>`).join("")}
        ${cells}
      </div>
    </div>`;
}

export function calendarHTML(fromDate, monthCount, markFn) {
  let html = `<div class="cal-wrap">`;
  let year = fromDate.getFullYear();
  let month = fromDate.getMonth();
  for (let i = 0; i < monthCount; i++) {
    html += renderMonth(year, month, markFn);
    month += 1;
    if (month > 11) { month = 0; year += 1; }
  }
  return html + `</div>`;
}
