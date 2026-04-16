import { memo, useEffect } from 'react';
import { List, useListRef } from 'react-window';
import { RADIO_COLORS } from '../../lib/constants';
import { formatAudience, estimateRadioAudience } from '../../lib/audience';
import type { RadioStation } from './radioData';

interface Props {
  stations: RadioStation[]; cart: Set<number>; activeIdx: number | null;
  onFocus: (i: number) => void; onToggleCart: (sid: number) => void;
  onClearCart: () => void; onSelectAll: () => void; totalCount: number;
}

interface RowData {
  stations: RadioStation[];
  cart: Set<number>;
  activeIdx: number | null;
  onFocus: (i: number) => void;
  onToggleCart: (sid: number) => void;
}

const ROW_HEIGHT = 76;

const StationRow = memo(function StationRow({
  index, style, ariaAttributes, stations, cart, activeIdx, onFocus, onToggleCart,
}: { index: number; style: React.CSSProperties; ariaAttributes: Record<string, unknown> } & RowData) {
  const s = stations[index];
  if (!s) return null;

  const sel = cart.has(s._sid);
  const act = activeIdx === index;
  const aud = estimateRadioAudience(s.erp, s.tipo, s.classe, s.uf);
  const isFM = s.tipo === 'FM';

  return (
    <div style={style} {...ariaAttributes}>
      <div tabIndex={0}
        onClick={() => onFocus(index)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onFocus(index); } }}
        className={`px-5 py-3 cursor-pointer border-l-2 transition-all duration-150 h-full
          outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent)] focus-visible:ring-inset
          ${sel ? 'bg-[var(--accent-muted)] border-l-[var(--accent)]'
            : act ? 'bg-[var(--bg-surface2)] border-l-[var(--accent)]'
            : 'border-l-transparent hover:bg-[var(--hover-bg)]'}`}>
        <div className="flex items-center gap-3">
          <button onClick={e => { e.stopPropagation(); onToggleCart(s._sid); }}
            aria-label={sel ? `Remover ${s.frequencia}` : `Adicionar ${s.frequencia}`}
            className={`w-4 h-4 rounded-[5px] border-[1.5px] flex items-center justify-center shrink-0 cursor-pointer transition-all duration-150
              ${sel ? 'bg-[var(--accent)] border-[var(--accent)]' : 'border-[var(--text-faint)] hover:border-[var(--accent)]'}`}>
            {sel && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="var(--on-accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-[7px] mb-1">
              <span className="text-[11px] font-semibold px-[9px] py-[3px] rounded-[5px]"
                style={{ background: isFM ? RADIO_COLORS.fmBg : RADIO_COLORS.amBg, color: isFM ? RADIO_COLORS.fm : RADIO_COLORS.am }}>
                {s.tipo}
              </span>
              <span className="text-[13px] font-semibold text-[var(--text-primary)]">
                {s.frequencia} <span className="text-[11px] font-normal text-[var(--text-muted)]">{isFM ? 'MHz' : 'kHz'}</span>
              </span>
              {aud > 0 && <span className="text-[11px] font-medium text-[var(--accent)] ml-auto shrink-0">{formatAudience(aud)}</span>}
            </div>
            <div className="text-[12px] text-[var(--text-secondary)]">{s.municipio} — {s.uf}</div>
            <div className="text-[11px] text-[var(--text-muted)] mt-0.5 truncate">{s.entidade || ''}</div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default function StationList({ stations, cart, activeIdx, onFocus, onToggleCart, onClearCart, onSelectAll, totalCount }: Props) {
  const listRef = useListRef();

  // Scroll to active station when it changes
  useEffect(() => {
    if (activeIdx != null && listRef.current) {
      try { listRef.current.scrollToRow({ index: activeIdx, align: 'smart' }); } catch {}
    }
  }, [activeIdx, listRef]);

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <div className="flex items-center gap-2 px-5 h-10 border-b border-[var(--border)] shrink-0">
        <span className="text-[12px] text-[var(--text-secondary)]">
          <strong className="text-[var(--accent)] font-semibold">{totalCount.toLocaleString('pt-BR')}</strong> estações
          {cart.size > 0 && <span className="text-[var(--text-muted)]"> · <strong className="text-[var(--text-primary)] font-semibold">{cart.size}</strong> no plano</span>}
        </span>
        <span className="ml-auto" />
        <button onClick={onSelectAll} className="text-[11px] text-[var(--text-muted)] hover:text-[var(--accent)] cursor-pointer transition-colors font-medium whitespace-nowrap bg-transparent border-none p-0">
          Sel. tudo</button>
        <span className="text-[var(--border-hover)]">·</span>
        <button onClick={onClearCart} className="text-[11px] text-[var(--text-muted)] hover:text-[var(--color-red-400)] cursor-pointer transition-colors whitespace-nowrap bg-transparent border-none p-0">
          Limpar</button>
      </div>

      {stations.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <p className="text-[13px] text-[var(--text-muted)] mb-2">Nenhuma estação encontrada</p>
            <p className="text-[12px] text-[var(--text-muted)]">Tente ajustar os filtros</p>
          </div>
        </div>
      ) : (
      <div className="flex-1 min-h-0">
        <List
          listRef={listRef}
          rowCount={stations.length}
          rowHeight={ROW_HEIGHT}
          rowComponent={StationRow}
          rowProps={{ stations, cart, activeIdx, onFocus, onToggleCart } satisfies RowData}
          role="list"
          aria-label="Estações"
          style={{ height: '100%' }}
        />
      </div>
      )}
    </div>
  );
}
