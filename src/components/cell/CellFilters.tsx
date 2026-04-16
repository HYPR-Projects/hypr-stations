import { useState, useCallback, useId } from 'react';
import MultiSelect from '../shared/MultiSelect';
import ToggleGroup from '../shared/ToggleGroup';
import { OPERADORA_COLORS, TECH_COLORS } from '../../lib/constants';
import type { ERB } from './cellData';

interface Props {
  erbs: ERB[];
  onFilter: (filtered: ERB[]) => void;
  filterOptions: { ufs: string[]; operadoras: string[]; faixas: string[] };
}

export interface CellFilterState {
  techs: Set<string>;
  operadoras: Set<string>;
  ufs: Set<string>;
  faixas: Set<string>;
  cidade: string;
}

const TECH_OPTS = [
  { value: '5G', label: '5G', color: TECH_COLORS['5G'] },
  { value: '4G', label: '4G', color: TECH_COLORS['4G'] },
  { value: '3G', label: '3G', color: TECH_COLORS['3G'] },
  { value: '2G', label: '2G', color: TECH_COLORS['2G'] },
];

const labelCls = "text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--text-muted)]";
const inputCls = "w-full h-8 px-2.5 rounded-lg text-[12px] bg-[var(--bg-surface2)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent)] transition-colors";

const INITIAL: CellFilterState = {
  techs: new Set(['5G', '4G', '3G', '2G']),
  operadoras: new Set(),
  ufs: new Set(),
  faixas: new Set(),
  cidade: '',
};

export default function CellFilters({ erbs, onFilter, filterOptions }: Props) {
  const uid = useId();
  const [f, setF] = useState<CellFilterState>(INITIAL);
  const [collapsed, setCollapsed] = useState(false);

  const apply = useCallback((fl: CellFilterState) => {
    const cn = fl.cidade.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    onFilter(erbs.filter(e => {
      // Tech: station must have at least one matching tech
      if (!e.tecnologias.some(t => fl.techs.has(t))) return false;
      if (fl.operadoras.size && !fl.operadoras.has(e.prestadora_norm)) return false;
      if (fl.ufs.size && !fl.ufs.has(e.uf)) return false;
      if (fl.faixas.size && !e.faixas.some(b => fl.faixas.has(b))) return false;
      if (cn) {
        const mun = e.municipio.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (!mun.includes(cn)) return false;
      }
      return true;
    }));
  }, [erbs, onFilter]);

  const upd = useCallback((p: Partial<CellFilterState>) => {
    setF(prev => { const n = { ...prev, ...p }; apply(n); return n; });
  }, [apply]);

  const reset = useCallback(() => {
    setF(INITIAL);
    apply(INITIAL);
  }, [apply]);

  // Build operadora options with colors
  const opOpts = filterOptions.operadoras.map(op => ({
    value: op,
    label: `${op}`,
    color: OPERADORA_COLORS[op] || OPERADORA_COLORS['Outras'],
  }));

  return (
    <div className="flex flex-col border-b border-[var(--border)] shrink-0">
      <div className="flex items-center justify-between px-4 h-10 border-b border-[var(--border)]">
        <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--text-muted)]">Filtros</span>
        <button onClick={() => setCollapsed(!collapsed)} aria-expanded={!collapsed}
          className="text-[10px] text-[var(--text-muted)] hover:text-[var(--accent)] cursor-pointer transition-colors">
          {collapsed ? '▼ Expandir' : '▲ Recolher'}</button>
      </div>
      <div className={`px-4 py-3 flex flex-col gap-3 transition-all duration-200 overflow-hidden ${collapsed ? 'max-h-0 opacity-0 !py-0' : 'max-h-[700px] opacity-100'}`}>

        {/* Technology toggle */}
        <div className="flex flex-col gap-1.5">
          <span className={labelCls}>Tecnologia</span>
          <ToggleGroup label="Tecnologia" options={TECH_OPTS} active={f.techs} onChange={techs => upd({ techs })} />
        </div>

        {/* Operator multi-select with color dots */}
        <div className="flex flex-col gap-1">
          <span className={labelCls}>Operadora</span>
          <div className="flex flex-wrap gap-1.5">
            {filterOptions.operadoras.map(op => {
              const on = f.operadoras.size === 0 || f.operadoras.has(op);
              const c = OPERADORA_COLORS[op] || OPERADORA_COLORS['Outras'];
              return (
                <button key={op} type="button" onClick={() => {
                  const n = new Set(f.operadoras);
                  if (f.operadoras.size === 0) {
                    // First click: select only this one
                    filterOptions.operadoras.forEach(o => { if (o !== op) n.add(o); });
                    n.delete(op);
                    // Actually we want to SELECT this one. So set = {op}
                    upd({ operadoras: new Set([op]) });
                  } else if (n.has(op)) {
                    n.delete(op);
                    upd({ operadoras: n.size === 0 ? new Set() : n });
                  } else {
                    n.add(op);
                    // If all selected, clear (= show all)
                    upd({ operadoras: n.size === filterOptions.operadoras.length ? new Set() : n });
                  }
                }}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer border
                    ${on ? 'border-current' : 'border-[var(--border)] opacity-40'}`}
                  style={on ? { color: c, background: c + '15' } : { color: 'var(--text-muted)' }}>
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: c }} />
                  {op}
                </button>
              );
            })}
          </div>
        </div>

        {/* UF */}
        <MultiSelect label="Estado (UF)" placeholder="Todos os estados" options={filterOptions.ufs}
          selected={f.ufs} onChange={ufs => upd({ ufs })} />

        {/* Cidade */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`cc-${uid}`} className={labelCls}>Cidade</label>
          <input id={`cc-${uid}`} value={f.cidade} onChange={e => upd({ cidade: e.target.value })}
            placeholder="Buscar município..." className={inputCls} />
        </div>

        {/* Faixa de frequência */}
        <MultiSelect label="Faixa (MHz)" placeholder="Todas" options={filterOptions.faixas}
          selected={f.faixas} onChange={faixas => upd({ faixas })} searchable={false} />

        <button onClick={reset}
          className="text-[11px] text-[var(--text-muted)] hover:text-[var(--accent)] cursor-pointer transition-colors py-1">
          ↺ Limpar filtros</button>
      </div>
    </div>
  );
}
