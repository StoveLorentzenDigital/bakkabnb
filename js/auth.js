// Very simple session handling. The logged-in user's name is kept in
// sessionStorage so a page refresh keeps you signed in for the tab.
// This is intentionally lightweight — no sensitive information is involved.

import { store } from "./store.js";

const SESSION_KEY = "bakkabnb.session";

export function currentUser() {
  return sessionStorage.getItem(SESSION_KEY) || null;
}

export function isLoggedIn() {
  return !!currentUser();
}

export async function login(name, password) {
  const ok = await store.verify(name, password);
  if (!ok) throw new Error("Wrong name or password.");
  sessionStorage.setItem(SESSION_KEY, name.trim());
  return name.trim();
}

export async function register(name, password) {
  const clean = await store.createAccount(name, password);
  sessionStorage.setItem(SESSION_KEY, clean);
  return clean;
}

export function logout() {
  sessionStorage.removeItem(SESSION_KEY);
}
