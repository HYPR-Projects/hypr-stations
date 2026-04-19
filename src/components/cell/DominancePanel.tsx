import { useState, useMemo, useCallback } from 'react';
import { OPERADORA_COLORS } from '../../lib/constants';
import { getDominanceStats, getOperatorFocusStats } from './analysisLayers';
import type { DominanceOptions, DominanceStatus } from './analysisLayers';

interface Props {
  zoom: number;
  onOptionsChange: (opts: DominanceOptions) => void;
}

const TECH_OPTS: { value: 'all' | '5G' | '4G'; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: '5G', label: '5G' },
  { value: '4G', label: '4G' },
];

function isDark() {
  return !document.documentElement.classList.contains('light');
}

export default function DominancePanel({ zoom, onOptionsChange }: Props) {
  const [techFilter, setTechFilter] = useState<'all' | '5G' | '4G'>('all');
  const [focusOp, setFocusOp] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<Set<DominanceStatus>>(new Set());

  const dark = isDark();
  const bg = dark ? 'rgba(15, 20, 25, 0.97)' : 'rgba(255, 255, 255, 0.97)';
  const textPrimary = dark ? '#e8ecf0' : '#1a2530';
  const textSecondary = dark ? '#8899a6' : '#576773';
  const textFaint = dark ? '#3d4d58' : '#c5cdd6';
  const border = dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)';
  const pillBg = dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)';
  const hoverBg = dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)';
  const shadow = dark ? '0 8px 32px rgba(0,0,0,0.4)' : '0 8px 24px rgba(0,0,0,0.1)';

  const resKey = zoom < 6 ? 'r3' : zoom < 8 ? 'r4' : 'r5';
  const stats = useMemo(() => getDominanceStats(techFilter, resKey), [techFilter, resKey]);
  const focusStats = useMemo(() => focusOp ? getOperatorFocusStats(focusOp, techFilter, resKey) : null, [focusOp, techFilter, resKey]);

  const emit = useCallback((overrides: Partial<DominanceOptions> = {}) => {
    onOptionsChange({
      techFilter,
      focusOp,
      statusFilter: Array.from(statusFilter),
      ...overrides,
    });
  }, [techFilter, focusOp, statusFilter, onOptionsChange]);

  const handleTechChange = useCallback((t: 'all' | '5G' | '4G') => {
    setTechFilter(t);
    emit({ techFilter: t });
  }, [emit]);

  const handleFocusOp = useCallback((op: string) => {
    const next = focusOp === op ? null : op;
    setFocusOp(next);
    // Reset status filter when focus changes
    setStatusFilter(new Set());
    emit({ focusOp: next, statusFilter: [] });
  }, [focusOp, emit]);

  const toggleStatus = useCallback((s: DominanceStatus) => {
    const n = new Set(statusFilter);
    n.has(s) ? n.delete(s) : n.add(s);
    setStatusFilter(n);
    emit({ statusFilter: Array.from(n) });
  }, [statusFilter, emit]);

  if (!stats.byOperator.length) return null;

  // Status box config — same order, same colors, same labels (solo mode)
  const STATUS_CONFIG: { key: DominanceStatus; color: string; bgColor: string; label: string; count: number }[] = focusStats ? [
    { key: 'wins', color: '#5cb87a', bgColor: 'rgba(92,184,122,0.1)', label: 'Domina', count: focusStats.wins },
    { key: 'contested', color: '#e88a4a', bgColor: 'rgba(232,138,74,0.1)', label: 'Disputa', count: focusStats.contested },
    { key: 'absent', color: '#e85454', bgColor: 'rgba(232,84,84,0.1)', label: 'Ausente', count: focusStats.absent },
  ] : [];

  const hasStatusFilter = statusFilter.size > 0;

  return (
    <div className="absolute top-16 right-3.5 z-10 w-[250px] rounded-[12px] overflow-hidden"
      style={{ background: bg, boxShadow: shadow, border: `0.5px solid ${border}` }}>

      {/* Tech filter */}
      <div className="flex gap-1.5 p-2.5" style={{ borderBottom: `0.5px solid ${border}` }}>
        {TECH_OPTS.map(t => (
          <button key={t.value} onClick={() => handleTechChange(t.value)}
            className="flex-1 py-[6px] rounded-[7px] text-[11px] font-semibold cursor-pointer transition-all duration-150 border-0 outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent)]"
            style={techFilter === t.value
              ? { background: '#4db8d4', color: dark ? '#000' : '#fff' }
              : { background: pillBg, color: textSecondary }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Header */}
      <div className="px-3.5 py-2.5" style={{ borderBottom: `0.5px solid ${border}` }}>
        <div className="text-[10px] tracking-[0.04em] uppercase" style={{ color: textFaint }}>
          {focusOp ? `Foco: ${focusOp}` : 'Dominância por região'}
        </div>
        <div className="text-[11px] mt-0.5" style={{ color: textSecondary }}>
          {stats.totalHexes.toLocaleString('pt-BR')} regiões · {stats.totalErbs.toLocaleString('pt-BR')} ERBs
        </div>
      </div>

      {/* Operator list */}
      <div className="px-2 py-2 flex flex-col gap-0.5 max-h-[280px] overflow-y-auto">
        {stats.byOperator.map(o => {
          const color = OPERADORA_COLORS[o.op] || OPERADORA_COLORS['Outras'];
          const isFocused = focusOp === o.op;
          return (
            <button key={o.op} onClick={() => handleFocusOp(o.op)}
              className="flex items-center gap-2.5 px-2.5 py-[7px] rounded-[8px] cursor-pointer transition-all duration-150 w-full text-left border-0 outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent)]"
              data-focused={isFocused || undefined}
              style={{
                background: isFocused ? `${color}15` : 'transparent',
                border: isFocused ? `0.5px solid ${color}30` : '0.5px solid transparent',
                '--op-hover': hoverBg,
              } as React.CSSProperties}>
              <span className="w-[7px] h-[7px] rounded-full shrink-0" style={{ background: color }} />
              <span className="text-[12px] font-medium flex-1" style={{ color: isFocused ? color : textPrimary }}>
                {o.op}
              </span>
              <span className="text-[10px]" style={{ color: textFaint }}>{o.hexCount} reg.</span>
              <span className="text-[10px] font-semibold" style={{ color }}>{(o.pct * 100).toFixed(1)}%</span>
            </button>
          );
        })}
      </div>

      {/* Focus stats — 3 clickable status filters */}
      {focusStats && focusOp && (
        <div className="px-3 py-3" style={{ borderTop: `0.5px solid ${border}` }}>
          <div className="flex gap-1.5 mb-2.5">
            {STATUS_CONFIG.map(s => {
              const active = statusFilter.has(s.key);
              const dimmed = hasStatusFilter && !active;
              return (
                <button key={s.key}
                  onClick={() => toggleStatus(s.key)}
                  role="checkbox"
                  aria-checked={active}
                  aria-label={`Filtrar por ${s.label}: ${s.count} regiões`}
                  className="flex-1 rounded-[8px] py-2 text-center cursor-pointer border-0 outline-none
                             transition-all duration-150 focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                  style={{
                    background: s.bgColor,
                    border: active ? `1px solid ${s.color}` : '1px solid transparent',
                    opacity: dimmed ? 0.4 : 1,
                    boxShadow: active ? `0 0 0 2px ${s.color}20` : 'none',
                  }}>
                  <div className="text-[16px] font-bold leading-none" style={{ color: s.color }}>{s.count}</div>
                  <div className="text-[9px] tracking-[0.04em] uppercase mt-1" style={{ color: textFaint }}>{s.label}</div>
                </button>
              );
            })}
          </div>
          {hasStatusFilter && (
            <button
              type="button"
              onClick={() => { setStatusFilter(new Set()); emit({ statusFilter: [] }); }}
              className="text-[10px] font-medium mb-2.5 cursor-pointer bg-transparent border-0 outline-none p-0
                         hover:opacity-70 transition-opacity"
              style={{ color: textSecondary }}>
              Limpar filtro de status
            </button>
          )}
          <div className="text-[11px]" style={{ color: textSecondary }}>
            <strong style={{ color: textPrimary }}>{focusStats.pctDomination}%</strong> de domínio territorial
          </div>
          {focusStats.topRival && (
            <div className="text-[11px] mt-1" style={{ color: textSecondary }}>
              Maior rival: <span style={{ color: OPERADORA_COLORS[focusStats.topRival] || '#7a6e64', fontWeight: 600 }}>{focusStats.topRival}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 mt-3">
            <span className="text-[9px]" style={{ color: textFaint }}>Ausente</span>
            <div className="flex-1 h-[4px] rounded-full" style={{
              background: 'linear-gradient(to right, #e85454, #e88a4a, transparent, #5cb87a)'
            }} />
            <span className="text-[9px]" style={{ color: textFaint }}>Domina</span>
          </div>
        </div>
      )}

      {!focusOp && (
        <div className="px-3.5 py-2" style={{ borderTop: `0.5px solid ${border}` }}>
          <div className="text-[10px]" style={{ color: textFaint }}>
            Clique numa operadora para análise comparativa
          </div>
        </div>
      )}
    </div>
  );
}
