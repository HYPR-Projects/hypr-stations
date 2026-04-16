import { useState, useMemo, useCallback } from 'react';
import { OPERADORA_COLORS } from '../../lib/constants';
import { getDominanceStats, getOperatorFocusStats } from './analysisLayers';
import type { DominanceOptions } from './analysisLayers';

interface Props {
  zoom: number;
  onOptionsChange: (opts: DominanceOptions) => void;
}

const TECH_OPTS: { value: 'all' | '5G' | '4G'; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: '5G', label: '5G' },
  { value: '4G', label: '4G' },
];

export default function DominancePanel({ zoom, onOptionsChange }: Props) {
  const [techFilter, setTechFilter] = useState<'all' | '5G' | '4G'>('all');
  const [focusOp, setFocusOp] = useState<string | null>(null);

  const resKey = zoom < 6 ? 'r3' : zoom < 8 ? 'r4' : 'r5';
  const stats = useMemo(() => getDominanceStats(techFilter, resKey), [techFilter, resKey]);
  const focusStats = useMemo(() => focusOp ? getOperatorFocusStats(focusOp, techFilter, resKey) : null, [focusOp, techFilter, resKey]);

  const handleTechChange = useCallback((t: 'all' | '5G' | '4G') => {
    setTechFilter(t);
    onOptionsChange({ techFilter: t, focusOp });
  }, [focusOp, onOptionsChange]);

  const handleFocusOp = useCallback((op: string) => {
    const next = focusOp === op ? null : op;
    setFocusOp(next);
    onOptionsChange({ techFilter, focusOp: next });
  }, [focusOp, techFilter, onOptionsChange]);

  if (!stats.byOperator.length) return null;

  return (
    <div className="absolute top-16 right-3.5 z-10 w-[240px] rounded-[12px] overflow-hidden
                    border-[0.5px] border-[var(--border)] overlay-panel">
      {/* Tech filter */}
      <div className="flex gap-1 p-2 border-b border-[var(--border)]">
        {TECH_OPTS.map(t => (
          <button key={t.value} onClick={() => handleTechChange(t.value)}
            className={`flex-1 py-[5px] rounded-[7px] text-[11px] font-medium cursor-pointer transition-all duration-150 border-0 outline-none
              ${techFilter === t.value
                ? 'bg-[var(--accent)] text-[var(--on-accent)]'
                : 'bg-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--hover-bg)]'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Header */}
      <div className="px-3.5 py-2.5 border-b border-[var(--border)]">
        <div className="text-[10px] tracking-[0.04em] uppercase text-[var(--text-faint)]">
          {focusOp ? `Foco: ${focusOp}` : 'Dominância por região'}
        </div>
        <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
          {stats.totalHexes.toLocaleString('pt-BR')} regiões · {stats.totalErbs.toLocaleString('pt-BR')} ERBs
        </div>
      </div>

      {/* Operator list */}
      <div className="px-2 py-2 flex flex-col gap-0.5 max-h-[260px] overflow-y-auto">
        {stats.byOperator.map(o => {
          const color = OPERADORA_COLORS[o.op] || OPERADORA_COLORS['Outras'];
          const isFocused = focusOp === o.op;
          return (
            <button key={o.op} onClick={() => handleFocusOp(o.op)}
              className={`flex items-center gap-2.5 px-2.5 py-2 rounded-[8px] cursor-pointer transition-all duration-150 w-full text-left border-0 outline-none
                ${isFocused
                  ? 'bg-[var(--accent-muted)] border-[0.5px] border-[var(--accent-glow)]'
                  : 'bg-transparent hover:bg-[var(--hover-bg)]'}`}
              style={isFocused ? { borderColor: `${color}30` , background: `${color}0a` } : {}}>
              <span className="w-[7px] h-[7px] rounded-full shrink-0" style={{ background: color }} />
              <span className="text-[12px] font-medium flex-1" style={{ color: isFocused ? color : 'var(--text-primary)' }}>
                {o.op}
              </span>
              <span className="text-[10px] text-[var(--text-faint)]">{o.hexCount} reg.</span>
              <span className="text-[10px] font-medium" style={{ color }}>{(o.pct * 100).toFixed(1)}%</span>
            </button>
          );
        })}
      </div>

      {/* Focus stats */}
      {focusStats && focusOp && (
        <div className="px-3.5 py-3 border-t border-[var(--border)]">
          <div className="flex gap-2 mb-2">
            <div className="flex-1 rounded-[8px] py-2 px-2.5 text-center" style={{ background: 'rgba(92,184,122,0.08)' }}>
              <div className="text-[16px] font-semibold" style={{ color: '#5cb87a' }}>{focusStats.wins}</div>
              <div className="text-[9px] tracking-[0.04em] uppercase text-[var(--text-faint)]">Ganha</div>
            </div>
            <div className="flex-1 rounded-[8px] py-2 px-2.5 text-center" style={{ background: 'rgba(232,84,84,0.08)' }}>
              <div className="text-[16px] font-semibold" style={{ color: '#e85454' }}>{focusStats.losses}</div>
              <div className="text-[9px] tracking-[0.04em] uppercase text-[var(--text-faint)]">Perde</div>
            </div>
          </div>
          <div className="text-[11px] text-[var(--text-secondary)]">
            <strong className="text-[var(--text-primary)]">{focusStats.pctDomination}%</strong> de domínio territorial
          </div>
          {focusStats.topRival && (
            <div className="text-[11px] text-[var(--text-muted)] mt-1">
              Maior rival: <span style={{ color: OPERADORA_COLORS[focusStats.topRival] || '#7a6e64', fontWeight: 600 }}>{focusStats.topRival}</span>
            </div>
          )}
          {/* Legend */}
          <div className="flex items-center gap-1.5 mt-3">
            <span className="text-[9px] text-[var(--text-faint)]">Perde</span>
            <div className="flex-1 h-[4px] rounded-full" style={{
              background: 'linear-gradient(to right, #e85454, rgba(232,84,84,0.15), transparent, rgba(92,184,122,0.15), #5cb87a)'
            }} />
            <span className="text-[9px] text-[var(--text-faint)]">Ganha</span>
          </div>
        </div>
      )}

      {/* Footer */}
      {!focusOp && (
        <div className="px-3.5 py-2 border-t border-[var(--border)]">
          <div className="text-[10px] text-[var(--text-faint)]">
            Clique numa operadora para ver onde ganha e perde
          </div>
        </div>
      )}
    </div>
  );
}
