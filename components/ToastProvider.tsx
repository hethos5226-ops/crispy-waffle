"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

const ToastContext = createContext<(text: string) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [text, setText] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string) => {
    setText(message);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setText(null), 2200);
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div
        className={`pointer-events-none fixed bottom-24 left-1/2 z-50 -translate-x-1/2 max-w-[88vw] truncate rounded-full px-4 py-2.5 text-sm font-semibold transition-all duration-200 ${
          text ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
        }`}
        style={{ backgroundColor: "color-mix(in srgb, var(--foreground) 92%, transparent)", color: "var(--background)", backdropFilter: "blur(10px)" }}
        role="status"
        aria-live="polite"
      >
        {text}
      </div>
    </ToastContext.Provider>
  );
}
