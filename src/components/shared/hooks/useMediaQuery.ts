import { useEffect, useState } from 'react';

/**
 * Subscribes to a CSS media query. Safe during SSR — returns `false` until
 * the browser side takes over. Use a ref-based guard at the call site if
 * the initial value matters for layout (it usually doesn't because the
 * Tailwind md: classes also handle the SSR case).
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    setMatches(mql.matches);
    // addEventListener is the modern signature — older Safari fell back to
    // addListener, but our engines target (Node 22, modern browsers) doesn't
    // need the shim.
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

/** Tailwind-aligned convenience: matches md breakpoint and up. */
export function useIsDesktop() {
  return useMediaQuery('(min-width: 768px)');
}
