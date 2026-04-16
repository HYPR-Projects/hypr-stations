import { memo, useEffect } from 'react';
import { List, useListRef } from 'react-window';
import { OPERADORA_COLORS, TECH_COLORS } from '../../lib/constants';
import type { ERB } from './cellData';

interface Props {
  erbs: ERB[]; cart: Set<number>; activeIdx: number | null;
  onFocus: (i: number) => void; onToggleCart: (id: number) => void;
  onClearCart: () => void; onSelectAll: () => void; totalCount: number;
}

interface RowData {
  erbs: ERB[];
  cart: Set<number>;
  activeIdx: number | null;
  onFocus: (i: number) => void;
  onToggleCart: (id: number) => void;
}

const ROW_HEIGHT = 70;

const StationRow = memo(function StationRow({
  index, style, ariaAttributes, erbs, cart, activeIdx, onFocus, onToggleCart,
}: { index: number; style: React.CSSProperties; ariaAttributes: Record<string, unknown> } & RowData) {
  const e = erbs[index];
  if (!e) return null;
  const sel = cart.has(e.id);
  const act = activeIdx === index;

  return (
    <div style={style} {...ariaAttributes}>
      <div tabIndex={0}
        onClick={() => onFocus(index)}
        onKeyDown={ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); onFocus(index); } }}
        style={{ height: ROW_HEIGHT }}
        className={`relative px-5 py-3 cursor-pointer transition-colors duration-150
          outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[var(--accent)]
          ${sel ? 'bg-[var(--accent-muted)]' : act ? 'bg-[var(--bg-surface2)]' : 'hover:bg-[var(--hover-bg)]'}`}>

        <div className="absolute bottom-0 left-5 right-5 h-px bg-[var(--border)]" />

        <div className="flex gap-3">
          {/* Checkbox */}
          <button onClick={ev => { ev.stopPropagation(); onToggleCart(e.id); }}
            aria-label={sel ? `Remover ${e.prestadora_norm}` : `Adicionar ${e.prestadora_norm}`}
            className="w-[18px] h-[18px] mt-[3px] rounded-[5px] flex items-center justify-center shrink-0 cursor-pointer
              transition-all duration-150 border-0 outline-none"
            style={sel
              ? { background: 'var(--accent)' }
              : { background: 'var(--input-bg)', border: '1.5px solid var(--control-border)' }}>
            {sel && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--on-accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
          </button>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-[12px] font-semibold shrink-0 leading-none"
                style={{ color: OPERADORA_COLORS[e.prestadora_norm] || OPERADORA_COLORS['Outras'] }}>
                {e.prestadora_norm}
              </span>
              {e.tecnologias.map(t => (
                <span key={t} className="text-[10px] font-bold px-[5px] py-[1px] rounded-[3px] shrink-0 leading-none"
                  style={{ color: TECH_COLORS[t] || '#576773', background: (TECH_COLORS[t] || '#576773') + '12' }}>
                  {t}
                </span>
              ))}
            </div>
            <div className="text-[12px] text-[var(--text-secondary)] leading-tight truncate">{e.municipio} — {e.uf}</div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default function CellStationList({ erbs, cart, activeIdx, onFocus, onToggleCart, onClearCart, onSelectAll, totalCount }: Props) {
  const listRef = useListRef();

  useEffect(() => {
    if (activeIdx != null && listRef.current) {
      try { listRef.current.scrollToRow({ index: activeIdx, align: 'smart' }); } catch {}
    }
  }, [activeIdx, listRef]);

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <div className="flex items-center gap-2 px-5 h-10 border-b border-[var(--border)] shrink-0">
        <span className="text-[12px] text-[var(--text-secondary)]">
          <strong className="text-[var(--accent)] font-semibold">{totalCount.toLocaleString('pt-BR')}</strong> ERBs
          {cart.size > 0 && <span className="text-[var(--text-muted)]"> · <strong className="text-[var(--text-primary)] font-semibold">{cart.size}</strong> no plano</span>}
        </span>
        <span className="ml-auto" />
        <button onClick={onSelectAll} className="text-[11px] text-[var(--text-muted)] hover:text-[var(--accent)] cursor-pointer transition-colors font-medium whitespace-nowrap bg-transparent border-0 outline-none p-0">
          Sel. tudo</button>
        <span className="text-[var(--border-hover)]">·</span>
        <button onClick={onClearCart} className="text-[11px] text-[var(--text-muted)] hover:text-[var(--color-red-400)] cursor-pointer transition-colors whitespace-nowrap bg-transparent border-0 outline-none p-0">
          Limpar</button>
      </div>

      {erbs.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <p className="text-[13px] text-[var(--text-muted)] mb-2">Nenhuma ERB encontrada</p>
            <p className="text-[12px] text-[var(--text-muted)]">Tente ajustar os filtros</p>
          </div>
        </div>
      ) : (
      <div className="flex-1 min-h-0">
        <List
          listRef={listRef}
          rowCount={erbs.length}
          rowHeight={ROW_HEIGHT}
          rowComponent={StationRow}
          rowProps={{ erbs, cart, activeIdx, onFocus, onToggleCart } satisfies RowData}
          role="list"
          aria-label="ERBs"
          style={{ height: '100%' }}
        />
      </div>
      )}
    </div>
  );
}
