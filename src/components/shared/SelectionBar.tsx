import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react';

interface SelectionBarProps {
  count: number;
  summary: ReactNode;
  onCheckout: () => void;
  onDownload?: () => void;
  canDownload?: boolean;
  /** Fires whenever the bar's rendered height changes (including mount/unmount
   *  where it fires with 0). Consumers use this to reserve bottom space for
   *  overlapping overlays like DominancePanel, CellLegend, Raios toggle. */
  onHeightChange?: (height: number) => void;
}

export default function SelectionBar({ count, summary, onCheckout, onDownload, canDownload, onHeightChange }: SelectionBarProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const lastReported = useRef<number>(0);

  // Report height to parent via ResizeObserver. Covers responsive changes
  // (px-5 vs md:px-7), font swap, device orientation, etc. — no magic numbers.
  useLayoutEffect(() => {
    if (!onHeightChange) return;
    if (count === 0) {
      if (lastReported.current !== 0) { lastReported.current = 0; onHeightChange(0); }
      return;
    }
    const el = barRef.current;
    if (!el) return;
    const report = () => {
      const h = el.offsetHeight;
      if (h !== lastReported.current) { lastReported.current = h; onHeightChange(h); }
    };
    report();
    const ro = new ResizeObserver(report);
    ro.observe(el);
    return () => ro.disconnect();
  }, [count, onHeightChange]);

  // Emit 0 on unmount to avoid stale height lingering after user clears cart
  // in a way that skips the count=0 render path.
  useEffect(() => () => { if (onHeightChange && lastReported.current !== 0) onHeightChange(0); }, [onHeightChange]);

  if (count === 0) return null;

  return (
    <div
      ref={barRef}
      role="status"
      aria-live="polite"
      className="fixed bottom-0 left-0 right-0 z-[1400] border-t px-5 md:px-7 py-3.5 pb-[calc(0.875rem+env(safe-area-inset-bottom))] md:pb-3.5
                 flex items-center gap-4
                 bg-[var(--bg-surface)] border-[var(--border)]
                 animate-[slideUp_0.3s_cubic-bezier(0.32,0.72,0,1)]"
    >
      <span className="font-heading text-[22px] font-bold text-[var(--accent)] tracking-[-0.01em]">
        {count}
      </span>

      <div className="text-[12px] text-[var(--text-secondary)] leading-snug">
        {summary}
      </div>

      <div className="ml-auto flex items-center gap-2">
        {canDownload && onDownload && (
          <button
            onClick={onDownload}
            aria-label="Exportar base de endereços selecionados"
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-[10px]
                       text-[12px] font-semibold transition-all duration-200 cursor-pointer
                       bg-transparent text-[var(--accent)] outline-none
                       hover:bg-[var(--accent-muted)]"
            style={{ border: '0.5px solid var(--accent)' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Exportar base
          </button>
        )}
        <button
          onClick={onCheckout}
          className="flex items-center gap-1.5 px-6 py-2.5 rounded-[10px]
                     text-[12px] font-semibold transition-all duration-200 cursor-pointer
                     bg-[var(--accent)] text-[var(--on-accent)] border-0 outline-none
                     hover:opacity-90"
        >
          Montar plano
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
          </svg>
        </button>
      </div>
    </div>
  );
}
