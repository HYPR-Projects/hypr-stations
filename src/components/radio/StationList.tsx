import { RADIO_COLORS } from '../../lib/constants';
import { formatAudience, estimateRadioAudience } from '../../lib/audience';
import type { RadioStation } from './radioData';

interface StationListProps {
  stations: RadioStation[];
  cart: Set<number>;
  activeIdx: number | null;
  onFocus: (idx: number) => void;
  onToggleCart: (sid: number) => void;
  onClearCart: () => void;
  onSelectAll: () => void;
  totalCount: number;
}

export default function StationList({
  stations, cart, activeIdx, onFocus, onToggleCart, onClearCart, onSelectAll, totalCount,
}: StationListProps) {
  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Count + actions */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border)] shrink-0">
        <span className="text-[11px] text-[var(--text-muted)]">
          <strong className="text-[var(--accent)] font-semibold">{totalCount.toLocaleString('pt-BR')}</strong> estações
        </span>
        <div className="flex gap-2">
          <button onClick={onSelectAll} className="text-[10px] text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors cursor-pointer">
            Selecionar tudo
          </button>
          <span className="text-[var(--border)]">·</span>
          <button onClick={onClearCart} className="text-[10px] text-[var(--text-muted)] hover:text-[var(--color-red-400)] transition-colors cursor-pointer">
            Limpar
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto" role="list" aria-label="Lista de estações">
        {stations.slice(0, 200).map((s, i) => {
          const isSelected = cart.has(s._sid);
          const isActive = activeIdx === i;
          const aud = estimateRadioAudience(s.erp, s.tipo, s.classe, s.uf);

          return (
            <div
              key={s._sid}
              role="listitem"
              tabIndex={0}
              onClick={() => onFocus(i)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onFocus(i); } }}
              className={`px-4 py-2 cursor-pointer border-l-2 transition-all duration-100
                          outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent)] focus-visible:ring-inset
                ${isSelected
                  ? 'bg-[var(--accent-muted)] border-l-[var(--accent)]'
                  : isActive
                    ? 'bg-[var(--bg-surface2)] border-l-[var(--accent)]'
                    : 'border-l-transparent hover:bg-[var(--bg-surface2)]'
                }`}
            >
              {/* Row 1: type dot + freq + fantasy + checkbox */}
              <div className="flex items-center gap-1.5">
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: s.tipo === 'FM' ? RADIO_COLORS.fm : RADIO_COLORS.am }}
                  aria-hidden="true"
                />
                <span className="text-xs font-semibold text-[var(--text-primary)]">
                  {s.frequencia} {s.tipo === 'FM' ? 'MHz' : 'kHz'}
                </span>
                {s._fantasy && (
                  <span className="text-[10px] text-[var(--accent)] truncate">
                    {s._fantasy}
                  </span>
                )}

                <span className="ml-auto" />

                {aud > 0 && (
                  <span className="text-[10px] text-[var(--text-muted)] shrink-0">
                    {formatAudience(aud)}
                  </span>
                )}

                <button
                  onClick={(e) => { e.stopPropagation(); onToggleCart(s._sid); }}
                  aria-label={isSelected ? `Remover ${s.frequencia}` : `Adicionar ${s.frequencia}`}
                  className={`w-4 h-4 rounded border flex items-center justify-center
                              shrink-0 transition-all cursor-pointer
                              ${isSelected
                                ? 'bg-[var(--accent)] border-[var(--accent)]'
                                : 'border-[var(--border-hover)] hover:border-[var(--accent)]'
                              }`}
                >
                  {isSelected && (
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="var(--on-accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              </div>

              {/* Row 2: municipality + entity */}
              <div className="flex items-center gap-1.5 mt-0.5 ml-3">
                <span className="text-[10px] text-[var(--text-muted)] truncate">
                  {s.municipio} — {s.uf}
                </span>
                {s.entidade && (
                  <>
                    <span className="text-[var(--border)]">·</span>
                    <span className="text-[10px] text-[var(--text-muted)] truncate capitalize">
                      {s.entidade.toLowerCase()}
                    </span>
                  </>
                )}
              </div>
            </div>
          );
        })}

        {stations.length > 200 && (
          <div className="px-4 py-4 text-[11px] text-[var(--text-muted)] text-center">
            Mostrando 200 de {stations.length.toLocaleString('pt-BR')} — refine com os filtros
          </div>
        )}
      </div>
    </div>
  );
}
