import { useEffect, useRef, useState } from 'react';

/**
 * Controls mount/visibility for components that need exit animations.
 *
 * The pattern: `open` toggles user intent; `mounted` stays true long enough
 * for the exit transition to play; `visible` flips on the next frame so the
 * entrance transition actually transitions (a fresh-mounted element can't
 * animate from state A to state B if both states are set in the same frame).
 *
 * Usage:
 *   const { mounted, visible } = usePresence(open, 220);
 *   if (!mounted) return null;
 *   return <div data-visible={visible} className="...transition-all..." />
 *
 * Then in CSS: `[data-visible="false"] { opacity: 0; transform: ... }`
 * and the default (`data-visible="true"`) state is the "resting" state.
 */
export function usePresence(open: boolean, durationMs = 200) {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);
  const rafRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);

    if (open) {
      setMounted(true);
      // Two rAFs: first to ensure the element is in the DOM and has its
      // "initial" styles committed, second to flip the visibility flag so
      // the browser sees a state change and animates between them.
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = requestAnimationFrame(() => setVisible(true));
      });
    } else {
      setVisible(false);
      timeoutRef.current = window.setTimeout(() => setMounted(false), durationMs);
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, [open, durationMs]);

  return { mounted, visible };
}
