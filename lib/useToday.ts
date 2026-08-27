"use client";

import { useSyncExternalStore } from "react";

// The date only changes across a day boundary, so there is nothing to
// subscribe to — but going through useSyncExternalStore keeps the value out
// of render (it would be an impure read) and lets the server render a
// timezone-neutral placeholder instead of a mismatched date.
const subscribe = () => () => {};

function clientToday() {
  return new Date().toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

/**
 * Today's date, formatted for the viewer's locale. Renders as "daily" on the
 * server and during the first client paint, then settles to the real date.
 */
export function useTodayLabel(): string {
  return useSyncExternalStore(subscribe, clientToday, () => "daily");
}
