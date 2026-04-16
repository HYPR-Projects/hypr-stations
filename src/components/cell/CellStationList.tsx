import { OPERADORA_COLORS, TECH_COLORS } from '../../lib/constants';
import { formatAudience, estimateCellAudience } from '../../lib/audience';
import type { ERB } from './cellData';

interface Props {
  erbs: ERB[];
  cart: Set<number>;
  activeIdx: number | null;
  onFocus: (i: number) => void;
  onToggleCart: (id: number) => void;
  onClearCart: () => void;
  onSelectAll: () => void;
  totalCount: number;
}

export default function CellStationList({
  erbs, cart, activeIdx, onFocus, onToggleCart, onClearCart, onSelectAll, totalCount,
}: Props) {
  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Count + actions */}
      <div className="flex items-center gap-2 px-4 h-9 border-b border-[var(--border)] shrink-0">
        <span className="text-[11px] text-[var(--text-muted)]">
          Exibindo <strong className="text-[var(--accent)] font-bold">{totalCount.toLocaleString('pt-BR')}</strong> ERBs
        </span>
        <span className="ml-auto" />
        <button onClick={onSelectAll}
          className="text-[10px] text-[var(--text-muted)] hover:text-[var(--accent)] cursor-pointer transition-colors whitespace-nowrap">
          ✓ Selecionar</button>
        <button onClick={onClearCart}
          className="text-[10px] text-[var(--text-muted)] hover:text-[var(--color-red-400)] cursor-pointer transition-colors whitespace-nowrap">
          ✕ Limpar</button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto" role="list" aria-label="ERBs">
        {erbs.slice(0, 300).map((e, i) => {
          const sel = cart.has(e.id);
          const act = activeIdx === i;
          const opColor = OPERADORA_COLORS[e.prestadora_norm] || OPERADORA_COLORS['Outras'];
          const techColor = TECH_COLORS[e.tech_principal] || TECH_COLORS['2G'];
          const aud = estimateCellAudience(e.tech_principal, e.uf, e.freq_mhz[0]);

          return (
            <div key={e.id} role="listitem" tabIndex={0}
              onClick={() => onFocus(i)}
              onKeyDown={ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); onFocus(i); } }}
              className={`px-4 py-2 cursor-pointer border-l-[3px] transition-all duration-100
                outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent)] focus-visible:ring-inset
                ${sel ? 'bg-[var(--accent-muted)] border-l-[var(--accent)]'
                  : act ? 'bg-[var(--bg-surface2)] border-l-[var(--accent)]'
                  : 'border-l-transparent hover:bg-[var(--bg-surface2)]'}`}>
              {/* Row 1: operator badge + tech badge + audience + checkbox */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded leading-none shrink-0"
                  style={{ background: opColor + '20', color: opColor }}>
                  {e.prestadora_norm}</span>
                <span className="text-[9px] font-bold px-1 py-0.5 rounded leading-none shrink-0"
                  style={{ background: techColor + '20', color: techColor }}>
                  {e.tech_principal}</span>
                {aud > 0 && (
                  <span className="text-[11px] font-semibold text-[var(--accent)] ml-auto shrink-0">
                    {formatAudience(aud)}</span>)}
                <button onClick={ev => { ev.stopPropagation(); onToggleCart(e.id); }}
                  aria-label={sel ? 'Remover' : 'Adicionar'}
                  className={`w-[22px] h-[22px] rounded-md border-[1.5px] flex items-center justify-center shrink-0 cursor-pointer transition-all
                    ${sel ? 'bg-[var(--accent)] border-[var(--accent)]' : 'border-[var(--border-hover)] hover:border-[var(--accent)]'}`}>
                  {sel && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--on-accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
                </button>
              </div>
              {/* Row 2: location */}
              <div className="text-[11px] text-[var(--text-muted)] mt-0.5 truncate">
                {e.municipio} — {e.uf}</div>
              {/* Row 3: freq bands */}
              <div className="text-[10px] text-[var(--text-muted)] truncate opacity-60">
                {e.faixas.map(f => f + ' MHz').join(' · ') || 'Freq. não informada'}</div>
            </div>
          );
        })}
        {erbs.length > 300 && (
          <div className="px-4 py-4 text-[11px] text-[var(--text-muted)] text-center">
            Mostrando 300 de {erbs.length.toLocaleString('pt-BR')} — refine com os filtros</div>)}
      </div>
    </div>
  );
}
