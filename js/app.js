// Bakkabnb proof of concept — router + views.
// UI talks only to `store` (async) and `auth`, so swapping in a real backend
// later means re-implementing the store, not rewriting these views.

import { store } from "./store.js";
import { currentUser, isLoggedIn, login, register, logout } from "./auth.js";
import { DEFAULT_PASSWORD } from "./seed.js";
import { calendarHTML } from "./calendar.js";

const app = document.getElementById("app");
const topbar = document.getElementById("topbar");

const ROUTES = {
  "/home": renderHome,
  "/beds": renderBeds,
  "/events": renderEvents,
  "/meals": renderMeals,
};

// Photography (web-optimized in assets/img/). Presentation only — kept out of
// the data store. Assignments are loose for now.
const HERO_PHOTO = "assets/img/20250703_182740.jpg";
const LOGIN_PHOTO = "assets/img/20250815_165345.jpg";
const BUILDING_PHOTOS = {
  b_van: "assets/img/20250705_161944.jpg",
  b_lave: "assets/img/20240929_113440.jpg",
  b_nord: "assets/img/20250815_185404.jpg",
  b_sond: "assets/img/20250815_165345.jpg",
};
const PAGE_HERO = {
  beds: "assets/img/20250815_185404.jpg",
  events: "assets/img/20250703_182740.jpg",
  meals: "assets/img/20250814_194101.jpg",
};

function pageHero(photo, title, sub) {
  return `
    <section class="page-hero" style="background-image:url('${photo}')">
      <div class="page-hero-inner">
        <h1>${title}</h1>
        ${sub ? `<p>${sub}</p>` : ""}
      </div>
    </section>`;
}

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

function fmtShort(iso) {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function isActiveOn(booking, dateStr) {
  return booking.startDate <= dateStr && dateStr <= booking.endDate;
}

function emojiForName(name, people) {
  const p = people.find((x) => x.name.toLowerCase() === String(name).trim().toLowerCase());
  return p ? p.emoji : "🛌";
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
      <div class="center-wrap" style="background-image:url('${LOGIN_PHOTO}')">
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
  const occupantsOf = (building) => {
    const bedIds = new Set(building.beds.map((b) => b.id));
    return bookings
      .filter((bk) => bedIds.has(bk.bedId) && isActiveOn(bk, today))
      .map((bk) => bk.name);
  };

  app.innerHTML = `
    <section class="hero" style="background-image:url('${HERO_PHOTO}')">
      <div class="hero-inner">
        <p class="eyebrow">Kleppe farm</p>
        <h2 class="hero-title">Who's at the farm</h2>
        <p class="hero-sub">${fmtDate(today)} · tap <a href="#/beds" style="color:#fff">Beds</a> to book or free a bed.</p>
      </div>
    </section>
    <section class="section">
      <p class="eyebrow">The buildings</p>
      <div class="buildings">
        ${buildings.map((b) => {
          const occ = occupantsOf(b);
          const sleepable = b.beds.filter((bed) => bed.status !== "out_of_commission").length;
          const photo = BUILDING_PHOTOS[b.id];
          return `
          <article class="card building">
            <div class="building-photo" style="background-image:url('${photo}')">
              <span class="building-badge">${b.emoji} ${esc(b.name)}</span>
            </div>
            <div class="building-body">
              <p class="count">${sleepable} beds</p>
              <div class="bubbles">
                ${occ.length
                  ? occ.map((n) => `<span class="bubble"><span class="av">${emojiForName(n, people)}</span>${esc(n)}</span>`).join("")
                  : `<span class="empty-note">Empty right now</span>`}
              </div>
            </div>
          </article>`;
        }).join("")}
      </div>
    </section>`;
}

// ---- beds ------------------------------------------------------------------

async function renderBeds() {
  const [buildings, bookings, people] = await Promise.all([
    store.getBuildings(), store.getBookings(), store.getPeople(),
  ]);
  const today = todayStr();
  const me = currentUser();

  // Calendar: per-building occupied-bed count per day, using building emoji.
  const bedToBuilding = {};
  buildings.forEach((b) => b.beds.forEach((bed) => { bedToBuilding[bed.id] = b; }));
  const bedsMark = (dateStr) => {
    const counts = {};
    bookings.forEach((bk) => {
      if (!isActiveOn(bk, dateStr)) return;
      const b = bedToBuilding[bk.bedId];
      if (b) counts[b.id] = (counts[b.id] || 0) + 1;
    });
    return buildings
      .filter((b) => counts[b.id])
      .map((b) => `<span class="cal-mark" title="${esc(b.name)}: ${counts[b.id]} occupied">${b.emoji}${counts[b.id]}</span>`)
      .join("");
  };

  app.innerHTML = `
    ${pageHero(PAGE_HERO.beds, "🛏️ Beds", "Book future stays and see who's where.")}
    <p class="eyebrow">Next two months</p>
    ${calendarHTML(new Date(), 2, bedsMark)}
    ${buildings.map((b) => `
      <h2>${b.emoji} ${esc(b.name)}</h2>
      <div class="card">
        ${b.beds.map((bed) => {
          const ooc = bed.status === "out_of_commission";
          const upcoming = bookings
            .filter((bk) => bk.bedId === bed.id && bk.endDate >= today)
            .sort((a, b2) => (a.startDate < b2.startDate ? -1 : 1));
          return `
          <div class="bed-row">
            <span class="bed-icon">${bed.type === "double" ? "🛏️" : "🛌"}</span>
            <span class="bed-label">${esc(bed.label)}</span>
            <span class="bed-meta">${bed.type}</span>
            ${ooc ? `<span class="tag ooc">out of commission</span>` : ""}
            <span class="spacer"></span>
            ${ooc ? "" : `<button class="btn small" data-bookbtn="${bed.id}">Book</button>`}
          </div>
          ${!ooc && upcoming.length ? `
          <div class="bed-bookings">
            ${upcoming.map((bk) => `
              <span class="chip booking ${isActiveOn(bk, today) ? "occupied" : ""}">
                ${emojiForName(bk.name, people)} ${esc(bk.name)} · ${fmtShort(bk.startDate)}–${fmtShort(bk.endDate)}
                <button class="chip-x" data-free="${bk.id}" title="Remove booking">✕</button>
              </span>`).join("")}
          </div>` : ""}
          ${ooc ? "" : `
          <form class="booking-form" data-bookform="${bed.id}" hidden>
            <input data-f="name" placeholder="Who's staying?" value="${esc(me)}" required />
            <label class="hint">From <input data-f="start" type="date" value="${today}" required /></label>
            <label class="hint">To <input data-f="end" type="date" value="${today}" required /></label>
            <button class="btn small" type="submit">Confirm</button>
            <button class="btn small secondary" type="button" data-cancel>Cancel</button>
          </form>`}`;
        }).join("")}
      </div>`).join("")}`;

  app.querySelectorAll("[data-bookbtn]").forEach((btn) => {
    btn.onclick = () => {
      const form = app.querySelector(`[data-bookform="${btn.dataset.bookbtn}"]`);
      form.hidden = !form.hidden;
      if (!form.hidden) form.querySelector('[data-f="name"]').focus();
    };
  });
  app.querySelectorAll("[data-cancel]").forEach((btn) => {
    btn.onclick = () => { btn.closest("form").hidden = true; };
  });
  app.querySelectorAll("[data-bookform]").forEach((form) => {
    form.onsubmit = async (e) => {
      e.preventDefault();
      const name = form.querySelector('[data-f="name"]').value.trim();
      const start = form.querySelector('[data-f="start"]').value;
      const end = form.querySelector('[data-f="end"]').value;
      if (!name || !start || !end) return;
      if (end < start) { alert("The end date can't be before the start date."); return; }
      await store.addBooking({ bedId: form.dataset.bookform, name, startDate: start, endDate: end });
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
  const evMark = (dateStr) => {
    const n = events.filter((e) => e.date === dateStr).length;
    return n ? `<span class="cal-ev" title="${n} event(s)">${n}</span>` : "";
  };

  app.innerHTML = `
    ${pageHero(PAGE_HERO.events, "📅 Events", "Anyone can add an event. Edit or delete your own, and comment on any.")}
    <p class="eyebrow">Next two months</p>
    ${calendarHTML(new Date(), 2, evMark)}
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
      ${events.length ? events.map((ev) => {
        const own = ev.createdBy === me;
        return `
        <div class="card">
          <div class="item-head">
            <strong>${esc(ev.title)}</strong>
            <span class="date">${fmtDate(ev.date)}</span>
            <span class="spacer" style="margin-left:auto"></span>
            ${own ? `<button class="btn small secondary" data-edit-ev="${ev.id}">Edit</button>
                     <button class="btn small danger" data-del-ev="${ev.id}">Delete</button>` : ""}
          </div>
          <div class="byline">by ${esc(ev.createdBy)}</div>
          ${ev.description ? `<p style="margin-top:0.5rem">${esc(ev.description)}</p>` : ""}
          ${own ? `
          <form class="stack edit-form" data-editform-ev="${ev.id}" hidden style="margin-top:0.75rem">
            <div class="row">
              <div><label>Title</label><input data-f="title" value="${esc(ev.title)}" required /></div>
              <div><label>Date</label><input data-f="date" type="date" value="${ev.date}" required /></div>
            </div>
            <div><label>Description</label><textarea data-f="desc">${esc(ev.description || "")}</textarea></div>
            <div class="row">
              <button class="btn small" type="submit" style="flex:0 0 auto">Save</button>
              <button class="btn small secondary" type="button" data-cancel style="flex:0 0 auto">Cancel</button>
            </div>
          </form>` : ""}
          <div class="comments">
            ${ev.comments.map((c) => `<div class="comment"><span class="who">${esc(c.author)}:</span> ${esc(c.text)}</div>`).join("")
              || `<div class="empty-note">No comments yet</div>`}
            <form class="row" data-comment="${ev.id}" style="margin-top:0.6rem">
              <input placeholder="Add a comment…" required />
              <button class="btn small secondary" type="submit" style="flex:0 0 auto">Comment</button>
            </form>
          </div>
        </div>`;
      }).join("") : `<p class="empty-note">No events yet — add the first one above.</p>`}
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
  app.querySelectorAll("[data-edit-ev]").forEach((btn) => {
    btn.onclick = () => {
      const form = app.querySelector(`[data-editform-ev="${btn.dataset.editEv}"]`);
      form.hidden = !form.hidden;
    };
  });
  app.querySelectorAll(".edit-form [data-cancel]").forEach((btn) => {
    btn.onclick = () => { btn.closest("form").hidden = true; };
  });
  app.querySelectorAll("[data-editform-ev]").forEach((form) => {
    form.onsubmit = async (e) => {
      e.preventDefault();
      await store.updateEvent(form.dataset.editformEv, {
        title: form.querySelector('[data-f="title"]').value.trim(),
        date: form.querySelector('[data-f="date"]').value,
        description: form.querySelector('[data-f="desc"]').value.trim(),
      });
      renderEvents();
    };
  });
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
    ${pageHero(PAGE_HERO.meals, "🍲 Meals", "Plan shared meals — add what you're bringing, and mark if you're coming.")}
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
          <div class="meal-items">
            ${ml.items.length ? ml.items.map((it) => {
              const own = it.broughtBy === me;
              return `
              <div class="meal-item">
                <span class="chip">${esc(it.food)} · ${esc(it.broughtBy)}</span>
                ${own ? `<button class="chip-x" data-edit-item="${ml.id}|${it.id}" title="Edit">✏️</button>
                         <button class="chip-x" data-del-item="${ml.id}|${it.id}" title="Remove">✕</button>` : ""}
                ${own ? `
                <form class="inline-edit" data-edititem="${ml.id}|${it.id}" hidden>
                  <input value="${esc(it.food)}" required />
                  <button class="btn small" type="submit">Save</button>
                </form>` : ""}
              </div>`;
            }).join("") : `<span class="empty-note">Nothing on the menu yet</span>`}
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

  const split = (v) => v.split("|");

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
  app.querySelectorAll("[data-edit-item]").forEach((btn) => {
    btn.onclick = () => {
      const form = app.querySelector(`[data-edititem="${btn.dataset.editItem}"]`);
      form.hidden = !form.hidden;
      if (!form.hidden) form.querySelector("input").focus();
    };
  });
  app.querySelectorAll("[data-del-item]").forEach((btn) => {
    btn.onclick = async () => {
      const [mealId, itemId] = split(btn.dataset.delItem);
      await store.removeMealItem(mealId, itemId);
      renderMeals();
    };
  });
  app.querySelectorAll("[data-edititem]").forEach((form) => {
    form.onsubmit = async (e) => {
      e.preventDefault();
      const [mealId, itemId] = split(form.dataset.edititem);
      await store.updateMealItem(mealId, itemId, { food: form.querySelector("input").value.trim() });
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
