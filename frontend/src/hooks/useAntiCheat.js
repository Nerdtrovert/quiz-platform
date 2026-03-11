import { useEffect, useRef, useState } from "react";

/**
 * useAntiCheat — detects tab switches, visibility changes,
 * back navigation, and right-click during a quiz.
 *
 * @param {boolean} active — only enforce when quiz is in progress
 * @param {function} onViolation — called with a message each time a violation occurs
 * @param {number} maxViolations — auto-submit after this many violations (default 3)
 * @param {function} onForceSubmit — called when max violations exceeded
 */
export default function useAntiCheat({
  active = true,
  onViolation,
  maxViolations = 3,
  onForceSubmit,
}) {
  const violationCount = useRef(0);
  const [warnings, setWarnings] = useState([]);

  const triggerViolation = (message) => {
    if (!active) return;
    violationCount.current += 1;
    const remaining = maxViolations - violationCount.current;

    setWarnings((prev) => [...prev, message]);
    if (onViolation) onViolation(message, violationCount.current, remaining);

    if (violationCount.current >= maxViolations && onForceSubmit) {
      onForceSubmit();
    }
  };

  useEffect(() => {
    if (!active) return;

    // ── 1. Tab switch / Alt+Tab (visibility change) ──────────
    const handleVisibilityChange = () => {
      if (document.hidden) {
        triggerViolation("Tab switch detected");
      }
    };

    // ── 2. Window blur (alt+tab, new window, mobile home) ────
    const handleBlur = () => {
      triggerViolation("Window lost focus");
    };

    // ── 3. Block right click ──────────────────────────────────
    const handleContextMenu = (e) => {
      e.preventDefault();
    };

    // ── 4. Block keyboard shortcuts ──────────────────────────
    const handleKeyDown = (e) => {
      // Block Alt+Tab signal (we can't fully block OS-level but can detect)
      if (
        (e.altKey && e.key === "Tab") ||
        (e.ctrlKey && e.key === "t") || // new tab
        (e.ctrlKey && e.key === "n") || // new window
        (e.ctrlKey && e.key === "w") || // close tab
        (e.metaKey && e.key === "t") || // mac new tab
        e.key === "F5" || // refresh
        (e.ctrlKey && e.key === "r") // refresh
      ) {
        e.preventDefault();
        if (e.key === "Tab") triggerViolation("Alt+Tab attempt detected");
      }
    };

    // ── 5. Block back navigation ──────────────────────────────
    // Push a dummy state so back button doesn't leave the page
    window.history.pushState(null, "", window.location.href);
    const handlePopState = () => {
      window.history.pushState(null, "", window.location.href);
      triggerViolation("Back navigation attempt detected");
    };

    // ── 6. Warn before unload (refresh / close) ───────────────
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "Quiz in progress! Leaving will end your attempt.";
      return e.returnValue;
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("popstate", handlePopState);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [active]);

  return { violationCount: violationCount.current, warnings };
}