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

const ROW_HEIGHT = 84;

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
        style={{ height: ROW_HEIGHT }}
        className={`relative px-5 py-3 cursor-pointer transition-colors duration-150
          outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[var(--accent)]
          ${sel ? 'bg-[var(--accent-muted)]' : act ? 'bg-[var(--bg-surface2)]' : 'hover:bg-[var(--hover-bg)]'}`}>

        {/* Bottom separator — inset shadow avoids box-model issues */}
        <div className="absolute bottom-0 left-5 right-5 h-px bg-[var(--border)]" />

        <div className="flex gap-3">
          {/* Checkbox */}
          <button onClick={e => { e.stopPropagation(); onToggleCart(s._sid); }}
            aria-label={sel ? `Remover ${s.frequencia}` : `Adicionar ${s.frequencia}`}
            className="w-[18px] h-[18px] mt-[3px] rounded-[5px] flex items-center justify-center shrink-0 cursor-pointer
              transition-all duration-150 border-0 outline-none"
            style={sel
              ? { background: 'var(--accent)' }
              : { background: 'var(--input-bg)', border: '1.5px solid var(--control-border)' }}>
            {sel && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--on-accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
          </button>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold px-[7px] py-[2px] rounded-[4px] shrink-0 leading-none"
                style={{ background: isFM ? RADIO_COLORS.fmBg : RADIO_COLORS.amBg, color: isFM ? RADIO_COLORS.fm : RADIO_COLORS.am }}>
                {s.tipo}
              </span>
              <span className="text-[13px] font-semibold text-[var(--text-primary)] leading-none">
                {s.frequencia}
              </span>
              <span className="text-[11px] text-[var(--text-muted)] leading-none">{isFM ? 'MHz' : 'kHz'}</span>
              {aud > 0 && <span className="text-[11px] font-medium text-[var(--accent)] ml-auto shrink-0 leading-none">{formatAudience(aud)}</span>}
            </div>
            <div className="text-[12px] text-[var(--text-secondary)] leading-tight truncate">{s.municipio} — {s.uf}</div>
            {s.entidade && <div className="text-[11px] text-[var(--text-muted)] leading-tight truncate mt-0.5">{s.entidade}</div>}
          </div>
        </div>
      </div>
    </div>
  );
});

export default function StationList({ stations, cart, activeIdx, onFocus, onToggleCart, onClearCart, onSelectAll, totalCount }: Props) {
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
          <strong className="text-[var(--accent)] font-semibold">{totalCount.toLocaleString('pt-BR')}</strong> estações
          {cart.size > 0 && <span className="text-[var(--text-muted)]"> · <strong className="text-[var(--text-primary)] font-semibold">{cart.size}</strong> no plano</span>}
        </span>
        <span className="ml-auto" />
        <button onClick={onSelectAll} className="text-[11px] text-[var(--text-muted)] hover:text-[var(--accent)] cursor-pointer transition-colors font-medium whitespace-nowrap bg-transparent border-0 outline-none p-0">
          Sel. tudo</button>
        <span className="text-[var(--border-hover)]">·</span>
        <button onClick={onClearCart} className="text-[11px] text-[var(--text-muted)] hover:text-[var(--color-red-400)] cursor-pointer transition-colors whitespace-nowrap bg-transparent border-0 outline-none p-0">
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
