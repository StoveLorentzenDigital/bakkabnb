// Bakkabnb proof of concept — router + views.
// UI talks only to `store` (async) and `auth`, so swapping in a real backend
// later means re-implementing the store, not rewriting these views.

import { store } from "./store.js";
import { currentUser, isLoggedIn, login, register, logout } from "./auth.js";
import { DEFAULT_PASSWORD } from "./seed.js";

const app = document.getElementById("app");
const topbar = document.getElementById("topbar");

const ROUTES = {
  "/home": renderHome,
  "/beds": renderBeds,
  "/events": renderEvents,
  "/meals": renderMeals,
};

// ---- helpers --------------------------------------------------------------

function esc(s = "") {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

function isActiveOn(booking, dateStr) {
  return booking.startDate <= dateStr && dateStr <= booking.endDate;
}

function go(path) {
  if (location.hash !== "#" + path) location.hash = path;
  else router();
}

// ---- chrome (top bar + nav) ----------------------------------------------

function renderChrome() {
  if (!isLoggedIn()) {
    topbar.innerHTML = "";
    return;
  }
  const path = (location.hash || "#/home").slice(1);
  const link = (href, label) =>
    `<a href="#${href}" class="${path === href ? "active" : ""}">${label}</a>`;
  topbar.innerHTML = `
    <div class="topbar">
      <a href="#/home" class="brand">🏡 Bakkabnb</a>
      <span class="who">${esc(currentUser())}</span>
      <button class="menu-toggle" id="menuToggle" aria-label="Menu">☰</button>
      <button class="btn secondary small" id="logoutBtn">Log out</button>
    </div>
    <nav class="nav" id="nav">
      ${link("/beds", "🛏️ Beds")}
      ${link("/events", "📅 Events")}
      ${link("/meals", "🍲 Meals")}
    </nav>`;
  document.getElementById("logoutBtn").onclick = () => { logout(); go("/login"); renderChrome(); };
  document.getElementById("menuToggle").onclick = () =>
    document.getElementById("nav").classList.toggle("open");
}

// ---- login / register -----------------------------------------------------

function renderLogin() {
  let mode = "login"; // or "register"
  function paint() {
    const isReg = mode === "register";
    app.innerHTML = `
      <div class="center-wrap">
        <div class="card login-card">
          <h1>🏡 Bakkabnb</h1>
          <p class="subtitle">Family coordination at the Kleppe farm.</p>
          <form class="stack" id="authForm">
            <div>
              <label for="name">Name</label>
              <input id="name" autocomplete="off" required />
            </div>
            <div>
              <label for="password">Password</label>
              <input id="password" type="password" required />
            </div>
            <p class="error" id="authErr" hidden></p>
            <button class="btn" type="submit">${isReg ? "Create account" : "Log in"}</button>
          </form>
          <p class="hint" style="margin-top:1rem">
            ${isReg
              ? `Already have an account? <button class="muted-link" id="swap">Log in</button>`
              : `New here? <button class="muted-link" id="swap">Create an account</button>`}
          </p>
          <p class="hint">Family default password: <strong>${esc(DEFAULT_PASSWORD)}</strong></p>
        </div>
      </div>`;
    const err = document.getElementById("authErr");
    document.getElementById("swap").onclick = () => { mode = isReg ? "login" : "register"; paint(); };
    document.getElementById("authForm").onsubmit = async (e) => {
      e.preventDefault();
      err.hidden = true;
      const name = document.getElementById("name").value;
      const password = document.getElementById("password").value;
      try {
        if (isReg) await register(name, password);
        else await login(name, password);
        renderChrome();
        go("/home");
      } catch (ex) {
        err.textContent = ex.message;
        err.hidden = false;
      }
    };
  }
  paint();
}

// ---- home: buildings with occupancy bubbles -------------------------------

async function renderHome() {
  const [buildings, bookings, people] = await Promise.all([
    store.getBuildings(), store.getBookings(), store.getPeople(),
  ]);
  const today = todayStr();
  const personById = Object.fromEntries(people.map((p) => [p.id, p]));
  const occupantsOf = (building) => {
    const bedIds = new Set(building.beds.map((b) => b.id));
    return bookings
      .filter((bk) => bedIds.has(bk.bedId) && isActiveOn(bk, today))
      .map((bk) => personById[bk.personId])
      .filter(Boolean);
  };

  app.innerHTML = `
    <h1>Who's at the farm</h1>
    <p class="subtitle">Today, ${fmtDate(today)} · tap <a href="#/beds">Beds</a> to book or free a bed.</p>
    <div class="buildings">
      ${buildings.map((b) => {
        const occ = occupantsOf(b);
        const sleepable = b.beds.filter((bed) => bed.status !== "out_of_commission").length;
        return `
        <div class="card building">
          <h3>${b.emoji} ${esc(b.name)} <span class="count">· ${sleepable} beds</span></h3>
          <div class="bubbles">
            ${occ.length
              ? occ.map((p) => `<span class="bubble"><span class="av">${p.emoji}</span>${esc(p.name)}</span>`).join("")
              : `<span class="empty-note">Empty right now</span>`}
          </div>
        </div>`;
      }).join("")}
    </div>`;
}

// ---- beds ------------------------------------------------------------------

async function renderBeds() {
  const [buildings, bookings, people] = await Promise.all([
    store.getBuildings(), store.getBookings(), store.getPeople(),
  ]);
  const today = todayStr();
  const personById = Object.fromEntries(people.map((p) => [p.id, p]));
  const me = currentUser();
  const meId = people.find((p) => p.name.toLowerCase() === me.toLowerCase())?.id;

  app.innerHTML = `
    <h1>🛏️ Beds</h1>
    <p class="subtitle">Who's sleeping where. Showing occupancy for today, ${fmtDate(today)}.</p>
    ${buildings.map((b) => `
      <h2>${b.emoji} ${esc(b.name)}</h2>
      <div class="card">
        ${b.beds.map((bed) => {
          const active = bookings.find((bk) => bk.bedId === bed.id && isActiveOn(bk, today));
          const ooc = bed.status === "out_of_commission";
          const occupant = active ? personById[active.personId] : null;
          return `
          <div class="bed-row">
            <span class="bed-icon">${bed.type === "double" ? "🛏️" : "🛌"}</span>
            <span class="bed-label">${esc(bed.label)}</span>
            <span class="bed-meta">${bed.type}</span>
            ${ooc ? `<span class="tag ooc">out of commission</span>` : ""}
            ${occupant ? `<span class="tag occupied">${occupant.emoji} ${esc(occupant.name)}</span>` : ""}
            <span class="spacer"></span>
            ${ooc ? "" : active
              ? (active.personId === meId
                  ? `<button class="btn small danger" data-free="${active.id}">Free bed</button>`
                  : "")
              : `<button class="btn small" data-book="${bed.id}">Book for me</button>`}
          </div>`;
        }).join("")}
      </div>`).join("")}`;

  app.querySelectorAll("[data-book]").forEach((btn) => {
    btn.onclick = async () => {
      if (!meId) { alert("Could not find your person record."); return; }
      await store.addBooking({
        bedId: btn.dataset.book, personId: meId,
        startDate: today, endDate: "2026-12-31",
      });
      renderBeds();
    };
  });
  app.querySelectorAll("[data-free]").forEach((btn) => {
    btn.onclick = async () => { await store.removeBooking(btn.dataset.free); renderBeds(); };
  });
}

// ---- events ----------------------------------------------------------------

async function renderEvents() {
  const events = await store.getEvents();
  const me = currentUser();

  app.innerHTML = `
    <h1>📅 Events</h1>
    <p class="subtitle">Anyone can add an event. You can delete your own, and comment on any.</p>
    <div class="card">
      <form class="stack" id="evForm">
        <div class="row">
          <div><label for="evTitle">Title</label><input id="evTitle" required /></div>
          <div><label for="evDate">Date</label><input id="evDate" type="date" value="${todayStr()}" required /></div>
        </div>
        <div><label for="evDesc">Description</label><textarea id="evDesc"></textarea></div>
        <button class="btn" type="submit">Add event</button>
      </form>
    </div>
    <div class="list" style="margin-top:1.25rem">
      ${events.length ? events.map((ev) => `
        <div class="card">
          <div class="item-head">
            <strong>${esc(ev.title)}</strong>
            <span class="date">${fmtDate(ev.date)}</span>
            <span class="spacer" style="margin-left:auto"></span>
            ${ev.createdBy === me ? `<button class="btn small danger" data-del-ev="${ev.id}">Delete</button>` : ""}
          </div>
          <div class="byline">by ${esc(ev.createdBy)}</div>
          ${ev.description ? `<p style="margin-top:0.5rem">${esc(ev.description)}</p>` : ""}
          <div class="comments">
            ${ev.comments.map((c) => `<div class="comment"><span class="who">${esc(c.author)}:</span> ${esc(c.text)}</div>`).join("")
              || `<div class="empty-note">No comments yet</div>`}
            <form class="row" data-comment="${ev.id}" style="margin-top:0.6rem">
              <input placeholder="Add a comment…" required />
              <button class="btn small secondary" type="submit" style="flex:0 0 auto">Comment</button>
            </form>
          </div>
        </div>`).join("") : `<p class="empty-note">No events yet — add the first one above.</p>`}
    </div>`;

  document.getElementById("evForm").onsubmit = async (e) => {
    e.preventDefault();
    await store.addEvent({
      title: document.getElementById("evTitle").value.trim(),
      description: document.getElementById("evDesc").value.trim(),
      date: document.getElementById("evDate").value,
      createdBy: me,
    });
    renderEvents();
  };
  app.querySelectorAll("[data-del-ev]").forEach((btn) => {
    btn.onclick = async () => { await store.removeEvent(btn.dataset.delEv); renderEvents(); };
  });
  app.querySelectorAll("[data-comment]").forEach((form) => {
    form.onsubmit = async (e) => {
      e.preventDefault();
      const input = form.querySelector("input");
      await store.addComment(form.dataset.comment, { author: me, text: input.value.trim() });
      renderEvents();
    };
  });
}

// ---- meals -----------------------------------------------------------------

async function renderMeals() {
  const meals = await store.getMeals();
  const me = currentUser();

  app.innerHTML = `
    <h1>🍲 Meals</h1>
    <p class="subtitle">Plan shared meals. Add what you're bringing, and mark if you're coming.</p>
    <div class="card">
      <form class="stack" id="mlForm">
        <div class="row">
          <div><label for="mlTitle">Meal</label><input id="mlTitle" placeholder="e.g. Saturday dinner" required /></div>
          <div><label for="mlDate">Date</label><input id="mlDate" type="date" value="${todayStr()}" required /></div>
        </div>
        <button class="btn" type="submit">Add meal</button>
      </form>
    </div>
    <div class="list" style="margin-top:1.25rem">
      ${meals.length ? meals.map((ml) => {
        const going = ml.attendees.includes(me);
        return `
        <div class="card">
          <div class="item-head">
            <strong>${esc(ml.title)}</strong>
            <span class="date">${fmtDate(ml.date)}</span>
            <span class="spacer" style="margin-left:auto"></span>
            ${ml.createdBy === me ? `<button class="btn small danger" data-del-ml="${ml.id}">Delete</button>` : ""}
          </div>
          <div class="byline">by ${esc(ml.createdBy)}</div>
          <div class="chips">
            ${ml.items.map((it) => `<span class="chip">${esc(it.food)} · ${esc(it.broughtBy)}</span>`).join("")
              || `<span class="empty-note">Nothing on the menu yet</span>`}
          </div>
          <form class="row" data-additem="${ml.id}">
            <input placeholder="Food you're bringing…" required />
            <button class="btn small secondary" type="submit" style="flex:0 0 auto">Add</button>
          </form>
          <div class="attendees">
            <button class="attend-btn ${going ? "going" : ""}" data-attend="${ml.id}">
              ${going ? "✅ You're coming" : "Mark me attending"}
            </button>
            ${ml.attendees.filter((n) => n !== me).map((n) => `<span class="chip">${esc(n)}</span>`).join("")}
          </div>
        </div>`;
      }).join("") : `<p class="empty-note">No meals planned yet — add one above.</p>`}
    </div>`;

  document.getElementById("mlForm").onsubmit = async (e) => {
    e.preventDefault();
    await store.addMeal({
      title: document.getElementById("mlTitle").value.trim(),
      date: document.getElementById("mlDate").value,
      createdBy: me,
    });
    renderMeals();
  };
  app.querySelectorAll("[data-del-ml]").forEach((btn) => {
    btn.onclick = async () => { await store.removeMeal(btn.dataset.delMl); renderMeals(); };
  });
  app.querySelectorAll("[data-additem]").forEach((form) => {
    form.onsubmit = async (e) => {
      e.preventDefault();
      const input = form.querySelector("input");
      await store.addMealItem(form.dataset.additem, { food: input.value.trim(), broughtBy: me });
      renderMeals();
    };
  });
  app.querySelectorAll("[data-attend]").forEach((btn) => {
    btn.onclick = async () => { await store.toggleAttendance(btn.dataset.attend, me); renderMeals(); };
  });
}

// ---- router ----------------------------------------------------------------

async function router() {
  if (!location.hash) { location.hash = "/home"; return; }
  const path = location.hash.slice(1);

  if (!isLoggedIn()) {
    renderChrome();
    renderLogin();
    return;
  }
  // close mobile nav on navigation
  document.getElementById("nav")?.classList.remove("open");

  const view = ROUTES[path];
  if (!view) { go("/home"); return; }
  renderChrome();
  try {
    await view();
  } catch (ex) {
    app.innerHTML = `<div class="card"><p class="error">Something went wrong: ${esc(ex.message)}</p></div>`;
  }
}

window.addEventListener("hashchange", router);
window.addEventListener("DOMContentLoaded", router);
router();
