// Data layer for Bakkabnb.
//
// Everything the UI needs goes through `store`. The methods are async (return
// Promises) on purpose: today they read/write the browser's localStorage, but
// the same interface can later be backed by a real shared API. To switch,
// implement `ApiStore` with `fetch(...)` calls and flip `USE_BACKEND` — the UI
// code does not change.

import { buildSeed } from "./seed.js";

const STORAGE_KEY = "bakkabnb.v1";
const USE_BACKEND = false; // flip to true once a backend implements the same interface

// ---------------------------------------------------------------------------
// localStorage-backed implementation
// ---------------------------------------------------------------------------

function read() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {
      // fall through to reseed on corrupt data
    }
  }
  const seed = buildSeed();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
  return seed;
}

function write(db) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  return db;
}

function uid(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

const LocalStore = {
  // -- people ---------------------------------------------------------------
  async getPeople() {
    return read().people;
  },

  // -- accounts -------------------------------------------------------------
  async verify(name, password) {
    const acct = read().accounts.find(
      (a) => a.name.toLowerCase() === name.trim().toLowerCase()
    );
    return !!acct && acct.password === password;
  },

  async accountExists(name) {
    return read().accounts.some(
      (a) => a.name.toLowerCase() === name.trim().toLowerCase()
    );
  },

  async createAccount(name, password) {
    const db = read();
    const clean = name.trim();
    if (db.accounts.some((a) => a.name.toLowerCase() === clean.toLowerCase())) {
      throw new Error("An account with that name already exists.");
    }
    db.accounts.push({ name: clean, password });
    // Anyone who logs in becomes a "person" who can occupy beds, host events, etc.
    if (!db.people.some((p) => p.name.toLowerCase() === clean.toLowerCase())) {
      db.people.push({ id: uid("p"), name: clean, emoji: "🙂" });
    }
    write(db);
    return clean;
  },

  // -- buildings & beds -----------------------------------------------------
  async getBuildings() {
    return read().buildings;
  },

  // -- bookings -------------------------------------------------------------
  async getBookings() {
    return read().bookings;
  },

  async addBooking({ bedId, personId, startDate, endDate }) {
    const db = read();
    const booking = { id: uid("bk"), bedId, personId, startDate, endDate };
    db.bookings.push(booking);
    write(db);
    return booking;
  },

  async removeBooking(id) {
    const db = read();
    db.bookings = db.bookings.filter((b) => b.id !== id);
    write(db);
  },

  // -- events ---------------------------------------------------------------
  async getEvents() {
    return read().events.slice().sort((a, b) => (a.date < b.date ? -1 : 1));
  },

  async addEvent({ title, description, date, createdBy }) {
    const db = read();
    const event = {
      id: uid("ev"),
      title,
      description,
      date,
      createdBy,
      comments: [],
    };
    db.events.push(event);
    write(db);
    return event;
  },

  async removeEvent(id) {
    const db = read();
    db.events = db.events.filter((e) => e.id !== id);
    write(db);
  },

  async addComment(eventId, { author, text }) {
    const db = read();
    const event = db.events.find((e) => e.id === eventId);
    if (!event) throw new Error("Event not found.");
    event.comments.push({
      id: uid("c"),
      author,
      text,
      createdAt: new Date().toISOString(),
    });
    write(db);
    return event;
  },

  // -- meals ----------------------------------------------------------------
  async getMeals() {
    return read().meals.slice().sort((a, b) => (a.date < b.date ? -1 : 1));
  },

  async addMeal({ title, date, createdBy }) {
    const db = read();
    const meal = {
      id: uid("ml"),
      title,
      date,
      createdBy,
      items: [],
      attendees: [],
    };
    db.meals.push(meal);
    write(db);
    return meal;
  },

  async removeMeal(id) {
    const db = read();
    db.meals = db.meals.filter((m) => m.id !== id);
    write(db);
  },

  async addMealItem(mealId, { food, broughtBy }) {
    const db = read();
    const meal = db.meals.find((m) => m.id === mealId);
    if (!meal) throw new Error("Meal not found.");
    meal.items.push({ id: uid("it"), food, broughtBy });
    write(db);
    return meal;
  },

  async toggleAttendance(mealId, personName) {
    const db = read();
    const meal = db.meals.find((m) => m.id === mealId);
    if (!meal) throw new Error("Meal not found.");
    if (meal.attendees.includes(personName)) {
      meal.attendees = meal.attendees.filter((n) => n !== personName);
    } else {
      meal.attendees.push(personName);
    }
    write(db);
    return meal;
  },

  // -- admin / utility ------------------------------------------------------
  async resetAll() {
    localStorage.removeItem(STORAGE_KEY);
    read(); // reseed
  },
};

// ---------------------------------------------------------------------------
// Backend implementation (stub) — implement these with fetch() when ready.
// ---------------------------------------------------------------------------

const ApiStore = new Proxy(
  {},
  {
    get() {
      return async () => {
        throw new Error(
          "ApiStore is not implemented yet. Set USE_BACKEND = false or implement the API."
        );
      };
    },
  }
);

export const store = USE_BACKEND ? ApiStore : LocalStore;
