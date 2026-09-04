// src/hooks/useIdleLogout.ts
import { useEffect, useRef } from "react";

/**
 * Auto-logout after a period of user inactivity — POS terminals often sit
 * unattended in a shop, and Sanctum tokens don't expire on their own.
 *
 * Timeout is configurable via `VITE_IDLE_TIMEOUT_MINUTES` (default 30). A value
 * of 0 or a non-positive number disables the feature entirely.
 *
 * Activity is shared across tabs of the same browser through a `localStorage`
 * timestamp, so working in one tab keeps the others alive and the logout fires
 * only when the whole browser has been idle.
 */
const ACTIVITY_EVENTS = [
  "mousemove",
  "mousedown",
  "keydown",
  "touchstart",
  "scroll",
  "wheel",
] as const;

const LAST_ACTIVITY_KEY = "lastActivityAt";
const ACTIVITY_THROTTLE_MS = 1000;

/**
 * sessionStorage flag set right before an inactivity logout, so the login page
 * can explain why the user landed back there. Consumed (and cleared) by LoginPage.
 */
export const IDLE_LOGOUT_FLAG = "idleLogout";

function getIdleTimeoutMs(): number {
  const raw = Number(import.meta.env.VITE_IDLE_TIMEOUT_MINUTES);
  const minutes = Number.isFinite(raw) ? raw : 30;
  return minutes > 0 ? minutes * 60 * 1000 : 0;
}

export function useIdleLogout(onIdle: () => void, enabled: boolean): void {
  const onIdleRef = useRef(onIdle);
  onIdleRef.current = onIdle;

  useEffect(() => {
    if (!enabled) return;
    const timeoutMs = getIdleTimeoutMs();
    if (timeoutMs <= 0) return;

    let timerId: number | undefined;
    let throttleUntil = 0;

    const readLastActivity = (): number => {
      const raw = Number(localStorage.getItem(LAST_ACTIVITY_KEY));
      return Number.isFinite(raw) && raw > 0 ? raw : Date.now();
    };

    const check = () => {
      const elapsed = Date.now() - readLastActivity();
      if (elapsed >= timeoutMs) {
        onIdleRef.current();
        return;
      }
      // Activity happened in another tab since we scheduled — wait out the rest.
      timerId = window.setTimeout(check, timeoutMs - elapsed);
    };

    const schedule = () => {
      if (timerId) window.clearTimeout(timerId);
      timerId = window.setTimeout(check, timeoutMs);
    };

    const handleActivity = () => {
      const now = Date.now();
      if (now < throttleUntil) return;
      throttleUntil = now + ACTIVITY_THROTTLE_MS;
      localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
      schedule();
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === LAST_ACTIVITY_KEY) schedule();
    };

    localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
    schedule();

    ACTIVITY_EVENTS.forEach((evt) =>
      window.addEventListener(evt, handleActivity, { passive: true }),
    );
    window.addEventListener("storage", handleStorage);

    return () => {
      if (timerId) window.clearTimeout(timerId);
      ACTIVITY_EVENTS.forEach((evt) =>
        window.removeEventListener(evt, handleActivity),
      );
      window.removeEventListener("storage", handleStorage);
    };
  }, [enabled]);
}
