import { supabase } from '../../lib/supabase';

// ─── Types ───────────────────────────────────────
export interface ERB {
  id: number;
  prestadora_norm: string;
  num_estacao: string;
  uf: string;
  municipio: string;
  cod_municipio: number | null;
  logradouro: string | null;
  lat: number;
  lng: number;
  coord_source: string;
  tecnologias: string[];
  tech_principal: string;
  freq_mhz: number[];
  faixas: string[];
  azimutes: number[];
}

// ─── Fetch all ERBs ──────────────────────────────
let _cache: ERB[] | null = null;

export async function fetchERBs(): Promise<ERB[]> {
  if (_cache) return _cache;
  if (!supabase) {
    console.warn('Supabase not configured');
    return [];
  }

  const cols = 'id,prestadora_norm,num_estacao,uf,municipio,cod_municipio,logradouro,lat,lng,coord_source,tecnologias,tech_principal,freq_mhz,faixas,azimutes';

  // Supabase REST has a default limit of 1000 — paginate
  const all: ERB[] = [];
  let from = 0;
  const pageSize = 5000;

  while (true) {
    const { data, error } = await supabase
      .from('erb')
      .select(cols)
      .range(from, from + pageSize - 1)
      .order('id');

    if (error) {
      console.error('ERB fetch error:', error.message);
      break;
    }
    if (!data || data.length === 0) break;
    all.push(...(data as ERB[]));
    if (data.length < pageSize) break;
    from += pageSize;
  }

  _cache = all;
  console.log(`[CellData] Loaded ${all.length} ERBs`);
  return all;
}

// ─── Derived filter options ──────────────────────
export function getFilterOptions(erbs: ERB[]) {
  const ufs = new Set<string>();
  const operadoras = new Set<string>();
  const faixas = new Set<string>();

  for (const e of erbs) {
    ufs.add(e.uf);
    operadoras.add(e.prestadora_norm);
    for (const f of e.faixas) faixas.add(f);
  }

  return {
    ufs: [...ufs].sort(),
    operadoras: [...operadoras].sort(),
    faixas: [...faixas].sort((a, b) => Number(a) - Number(b)),
  };
}

// UF list (fallback for before data loads)
export const ALL_UFS = [
  'AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT',
  'PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO',
];
