import { useState, useCallback, useId } from 'react';
import MultiSelect from '../shared/MultiSelect';
import ToggleGroup from '../shared/ToggleGroup';
import { RADIO_COLORS } from '../../lib/constants';
import { ALL_UFS, ALL_CLASSES, ALL_FINALIDADES, type RadioStation } from './radioData';

interface RadioFiltersProps {
  stations: RadioStation[];
  onFilter: (filtered: RadioStation[]) => void;
}

export interface RadioFilterState {
  types: Set<string>;
  ufs: Set<string>;
  classes: Set<string>;
  finalidades: Set<string>;
  cidade: string;
  entidade: string;
  nome: string;
}

const TYPE_OPTIONS = [
  { value: 'FM', label: 'FM', color: RADIO_COLORS.fm },
  { value: 'OM', label: 'AM/OM', color: RADIO_COLORS.am },
];

const inputCls = `w-full px-2.5 py-1.5 rounded-lg text-[11px]
  bg-[var(--bg-surface2)] border border-[var(--border)]
  text-[var(--text-primary)] placeholder:text-[var(--text-muted)]
  outline-none focus:border-[var(--accent)] transition-colors`;

const labelCls = "text-[10px] font-medium text-[var(--text-muted)] tracking-wide";

export default function RadioFilters({ stations, onFilter }: RadioFiltersProps) {
  const uid = useId();
  const [filters, setFilters] = useState<RadioFilterState>({
    types: new Set(['FM', 'OM']),
    ufs: new Set(), classes: new Set(), finalidades: new Set(),
    cidade: '', entidade: '', nome: '',
  });
  const [collapsed, setCollapsed] = useState(false);

  const apply = useCallback((f: RadioFilterState) => {
    const cidadeNorm = f.cidade.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const entNorm = f.entidade.toLowerCase();
    const nomeNorm = f.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const result = stations.filter((s) => {
      if (!f.types.has(s.tipo)) return false;
      if (f.ufs.size && !f.ufs.has(s.uf)) return false;
      if (cidadeNorm && !s._mun.includes(cidadeNorm)) return false;
      if (f.classes.size && !f.classes.has(s.classe)) return false;
      if (f.finalidades.size && !f.finalidades.has(s.finalidade)) return false;
      if (entNorm && !s._ent.includes(entNorm)) return false;
      if (nomeNorm && !s._nome.includes(nomeNorm)) return false;
      return true;
    });
    onFilter(result);
  }, [stations, onFilter]);

  const update = useCallback((patch: Partial<RadioFilterState>) => {
    setFilters((prev) => { const next = { ...prev, ...patch }; apply(next); return next; });
  }, [apply]);

  const reset = useCallback(() => {
    const fresh: RadioFilterState = {
      types: new Set(['FM', 'OM']), ufs: new Set(), classes: new Set(),
      finalidades: new Set(), cidade: '', entidade: '', nome: '',
    };
    setFilters(fresh);
    apply(fresh);
  }, [apply]);

  return (
    <div className="flex flex-col border-b border-[var(--border)] shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)]">
        <span className="text-[11px] font-semibold text-[var(--text-secondary)]">Filtros</span>
        <button
          onClick={() => setCollapsed(!collapsed)}
          aria-expanded={!collapsed}
          className="text-[10px] text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors cursor-pointer"
        >
          {collapsed ? 'Expandir' : 'Recolher'}
        </button>
      </div>

      {/* Body */}
      <div className={`px-4 py-3 flex flex-col gap-2.5 transition-all duration-200 overflow-hidden
                       ${collapsed ? 'max-h-0 opacity-0 !py-0' : 'max-h-[600px] opacity-100'}`}>

        {/* Type */}
        <div className="flex flex-col gap-1">
          <span className={labelCls}>Tipo</span>
          <ToggleGroup label="Tipo de estação" options={TYPE_OPTIONS} active={filters.types} onChange={(types) => update({ types })} />
        </div>

        {/* Location */}
        <MultiSelect label="Estado" placeholder="Todos" options={ALL_UFS} selected={filters.ufs} onChange={(ufs) => update({ ufs })} />

        <div className="flex flex-col gap-1">
          <label htmlFor={`cidade-${uid}`} className={labelCls}>Cidade</label>
          <input id={`cidade-${uid}`} type="text" value={filters.cidade} onChange={(e) => update({ cidade: e.target.value })} placeholder="Buscar cidade..." className={inputCls} />
        </div>

        {/* Classification */}
        <MultiSelect label="Classe" placeholder="Todas" options={ALL_CLASSES} selected={filters.classes} onChange={(classes) => update({ classes })} />
        <MultiSelect label="Finalidade" placeholder="Todas" options={ALL_FINALIDADES} selected={filters.finalidades} onChange={(finalidades) => update({ finalidades })} searchable={false} />

        {/* Search */}
        <div className="flex flex-col gap-1">
          <label htmlFor={`ent-${uid}`} className={labelCls}>Entidade</label>
          <input id={`ent-${uid}`} type="text" value={filters.entidade} onChange={(e) => update({ entidade: e.target.value })} placeholder="Buscar entidade..." className={inputCls} />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor={`nome-${uid}`} className={labelCls}>Nome da rádio</label>
          <input id={`nome-${uid}`} type="text" value={filters.nome} onChange={(e) => update({ nome: e.target.value })} placeholder="Jovem Pan, Band, CBN..." className={inputCls} />
        </div>

        <button onClick={reset} className="w-full py-1.5 rounded-lg text-[11px] text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors cursor-pointer">
          Limpar filtros
        </button>
      </div>
    </div>
  );
}
