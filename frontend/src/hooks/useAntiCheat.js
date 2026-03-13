import { useEffect, useRef } from "react";

/**
 * useAntiCheat — detects tab switches, back navigation,
 * right-click, and keyboard shortcuts during a quiz.
 *
 * @param {boolean} active        — only enforce when quiz is in progress
 * @param {function} onViolation  — called with (message, count, remaining)
 * @param {number} maxViolations  — auto-submit after this many (default 3)
 * @param {function} onForceSubmit — called when max violations exceeded
 */
export default function useAntiCheat({
  active = true,
  onViolation,
  maxViolations = 3,
  onForceSubmit,
}) {
  const violationCount = useRef(0);
  const activeRef = useRef(active);
  const lastViolationTime = useRef(0); // debounce blur+visibility double-fire

  // Keep activeRef in sync
  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    if (!active) return;

    const triggerViolation = (message) => {
      if (!activeRef.current) return;

      // Debounce: ignore if another violation fired within 500ms
      const now = Date.now();
      if (now - lastViolationTime.current < 500) return;
      lastViolationTime.current = now;

      violationCount.current += 1;
      const remaining = Math.max(maxViolations - violationCount.current, 0);

      if (onViolation) onViolation(message, violationCount.current, remaining);

      if (violationCount.current >= maxViolations && onForceSubmit) {
        onForceSubmit();
      }
    };

    // ── 1. Tab switch via visibility API ─────────────────────
    const handleVisibilityChange = () => {
      if (document.hidden) {
        triggerViolation("Tab switch detected");
      }
    };

    // ── 2. Window blur (Alt+Tab, mobile home button) ──────────
    // Only fire if visibility didn't already fire (debounced above)
    const handleBlur = () => {
      triggerViolation("Window lost focus");
    };

    // ── 3. Block right click ──────────────────────────────────
    const handleContextMenu = (e) => {
      e.preventDefault();
    };

    // ── 4. Block/detect keyboard shortcuts ───────────────────
    const handleKeyDown = (e) => {
      const blocked =
        (e.ctrlKey && ["t", "n", "w", "r"].includes(e.key.toLowerCase())) ||
        (e.metaKey && ["t", "n", "w", "r"].includes(e.key.toLowerCase())) ||
        e.key === "F5";

      if (blocked) {
        e.preventDefault();
        e.stopPropagation();
        triggerViolation("Shortcut key blocked");
        return;
      }

      // Alt+Tab — can't prevent OS switch but can detect the keydown
      if (e.altKey && e.key === "Tab") {
        e.preventDefault();
        triggerViolation("Alt+Tab detected");
      }
    };

    // ── 5. Block back/forward navigation ─────────────────────
    window.history.pushState(null, "", window.location.href);
    const handlePopState = () => {
      window.history.pushState(null, "", window.location.href);
      triggerViolation("Back navigation blocked");
    };

    // ── 6. Warn on page unload (refresh / close tab) ─────────
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "Quiz in progress! Leaving will end your attempt.";
      return e.returnValue;
    };

    // ── 7. Fullscreen exit detection (optional UX signal) ─────
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        triggerViolation("Fullscreen exited");
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleKeyDown, true); // capture phase
    window.addEventListener("popstate", handlePopState);
    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [active]); // re-register when active changes

  return { violationCount: violationCount.current };
}