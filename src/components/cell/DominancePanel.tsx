import { useMemo } from 'react';
import { OPERADORA_COLORS } from '../../lib/constants';
import type { ERB } from './cellData';
import { computeDominanceStats } from './analysisLayers';

interface Props {
  erbs: ERB[];
  resolution: number;
}

export default function DominancePanel({ erbs, resolution }: Props) {
  const stats = useMemo(() => computeDominanceStats(erbs, resolution), [erbs, resolution]);

  if (!stats.byOperator.length) return null;

  const maxCount = Math.max(...stats.byOperator.map(o => o.count));

  return (
    <div className="absolute top-16 right-4 z-10 w-[220px] rounded-lg border
      bg-[var(--bg-surface)] border-[var(--border)] shadow-lg overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 border-b border-[var(--border)]">
        <div className="text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--text-muted)]">
          Dominância por região</div>
        <div className="text-[10px] text-[var(--text-muted)] mt-0.5">
          {stats.totalHexes.toLocaleString('pt-BR')} regiões · {stats.totalErbs.toLocaleString('pt-BR')} ERBs</div>
      </div>

      {/* Bars */}
      <div className="px-3 py-2 flex flex-col gap-2">
        {stats.byOperator.map(o => {
          const color = OPERADORA_COLORS[o.op] || OPERADORA_COLORS['Outras'];
          const barWidth = maxCount > 0 ? (o.count / maxCount) * 100 : 0;
          return (
            <div key={o.op}>
              <div className="flex items-center justify-between mb-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                  <span className="text-[11px] font-semibold" style={{ color }}>{o.op}</span>
                </div>
                <span className="text-[10px] text-[var(--text-muted)]">
                  {o.hexCount} regiões</span>
              </div>
              <div className="h-[6px] rounded-full bg-[var(--bg-surface2)] overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${barWidth}%`, background: color }} />
              </div>
              <div className="flex justify-between mt-0.5">
                <span className="text-[10px] text-[var(--text-muted)]">
                  {o.count.toLocaleString('pt-BR')} ERBs</span>
                <span className="text-[10px] font-semibold" style={{ color }}>
                  {(o.pct * 100).toFixed(1)}%</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-3 py-1.5 border-t border-[var(--border)]">
        <div className="text-[9px] text-[var(--text-muted)] opacity-60">
          Hex: resolução H3 {resolution} · Cor = operadora com mais ERBs na região</div>
      </div>
    </div>
  );
}
