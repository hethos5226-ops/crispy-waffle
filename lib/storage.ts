"use client";

import { useSyncExternalStore } from "react";
import { isSnapshot, type ListingSnapshot } from "@/lib/data/snapshot";

/**
 * Everything here is per-viewer browser storage, not a real account system.
 * Reads go through useSyncExternalStore (with an in-memory cache kept in
 * sync by the write functions below) so components can subscribe to
 * changes without the "setState inside an effect" anti-pattern, and
 * without a hydration mismatch between server and first client render.
 * Every localStorage access is wrapped in try/catch — storage can be
 * unavailable (private browsing, blocked cookies) and callers should
 * degrade quietly rather than throw.
 */

const HISTORY_KEY = "buywise_history_v2";
const FAVORITES_KEY = "buywise_favorites_v2";
const THEME_KEY = "buywise_theme_v1";
const ONBOARDED_KEY = "buywise_onboarded_v1";

const listeners = new Set<() => void>();
function notify() {
  listeners.forEach((l) => l());
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// ---- History ----
// Entries are full snapshots so History can render real titles, prices and
// images without re-querying eBay for every item on every visit.
let historyCache: ListingSnapshot[] | null = null;
const EMPTY_HISTORY: ListingSnapshot[] = [];

function loadHistory(): ListingSnapshot[] {
  if (historyCache) return historyCache;
  try {
    const raw = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]");
    historyCache = Array.isArray(raw) ? raw.filter(isSnapshot) : [];
  } catch {
    historyCache = [];
  }
  return historyCache;
}

function writeHistory(next: ListingSnapshot[]) {
  historyCache = next;
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
  notify();
}

export function recordHistory(snapshot: ListingSnapshot) {
  const list = loadHistory().filter((e) => e.id !== snapshot.id);
  writeHistory([snapshot, ...list].slice(0, 40));
}

export function clearHistory() {
  writeHistory([]);
}

export function useHistory(): ListingSnapshot[] {
  return useSyncExternalStore(subscribe, loadHistory, () => EMPTY_HISTORY);
}

// ---- Favorites ----
let favoritesCache: ListingSnapshot[] | null = null;
const EMPTY_FAVORITES: ListingSnapshot[] = [];

function loadFavorites(): ListingSnapshot[] {
  if (favoritesCache) return favoritesCache;
  try {
    const raw = JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? "[]");
    favoritesCache = Array.isArray(raw) ? raw.filter(isSnapshot) : [];
  } catch {
    favoritesCache = [];
  }
  return favoritesCache;
}

function writeFavorites(next: ListingSnapshot[]) {
  favoritesCache = next;
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
  notify();
}

/** Returns the new favorited state. */
export function toggleFavorite(snapshot: ListingSnapshot): boolean {
  const current = loadFavorites();
  const nowFav = !current.some((f) => f.id === snapshot.id);
  writeFavorites(nowFav ? [snapshot, ...current] : current.filter((f) => f.id !== snapshot.id));
  return nowFav;
}

export function clearFavorites() {
  writeFavorites([]);
}

export function useFavorites(): ListingSnapshot[] {
  return useSyncExternalStore(subscribe, loadFavorites, () => EMPTY_FAVORITES);
}

export function useIsFavorite(id: string): boolean {
  return useFavorites().some((f) => f.id === id);
}

// ---- Theme ----
export type ThemePref = "system" | "light" | "dark";

let themeCache: ThemePref | null = null;

function loadTheme(): ThemePref {
  if (themeCache) return themeCache;
  try {
    const v = localStorage.getItem(THEME_KEY);
    themeCache = v === "light" || v === "dark" ? v : "system";
  } catch {
    themeCache = "system";
  }
  return themeCache;
}

export function applyTheme(pref: ThemePref) {
  const root = document.documentElement;
  if (pref === "light") root.setAttribute("data-theme", "light");
  else if (pref === "dark") root.setAttribute("data-theme", "dark");
  else root.removeAttribute("data-theme");
}

export function setThemePref(pref: ThemePref) {
  themeCache = pref;
  try {
    localStorage.setItem(THEME_KEY, pref);
  } catch {
    // ignore
  }
  applyTheme(pref);
  notify();
}

export function useThemePref(): ThemePref {
  return useSyncExternalStore(subscribe, loadTheme, () => "system" as const);
}

// ---- Onboarding ----
let onboardedCache: boolean | null = null;

function loadOnboarded(): boolean {
  if (onboardedCache != null) return onboardedCache;
  try {
    onboardedCache = Boolean(localStorage.getItem(ONBOARDED_KEY));
  } catch {
    onboardedCache = false;
  }
  return onboardedCache;
}

export function setOnboarded() {
  onboardedCache = true;
  try {
    localStorage.setItem(ONBOARDED_KEY, "1");
  } catch {
    // ignore
  }
  notify();
}

/** Server/first-render snapshot is `true` (onboarded) so the sheet never flashes before hydration settles it. */
export function useHasOnboarded(): boolean {
  return useSyncExternalStore(subscribe, loadOnboarded, () => true);
}
