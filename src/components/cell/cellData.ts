import { supabase } from '../../lib/supabase';

export interface ERB {
  id: number;
  prestadora_norm: string;
  num_estacao: string;
  uf: string;
  municipio: string;
  lat: number;
  lng: number;
  tecnologias: string[];
  tech_principal: string;
  // Optional — only available from detail fetch
  cod_municipio?: number | null;
  logradouro?: string | null;
  coord_source?: string;
  freq_mhz?: number[];
  faixas?: string[];
  azimutes?: number[];
}

// Cols: [id, op, num, uf, mun, lat, lng, techs, tech]
interface CompactData {
  meta: { count: number; generated: string; source: string; cols: string[] };
  data: [number, string, string, string, string, number, number, string[], string][];
}

let _cache: ERB[] | null = null;

export async function fetchERBs(onProgress?: (loaded: number) => void): Promise<ERB[]> {
  if (_cache) return _cache;

  try {
    const resp = await fetch('/assets/erb.json');
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

    const raw: CompactData = await resp.json();
    onProgress?.(raw.meta.count);

    // Expand compact arrays to objects
    const erbs: ERB[] = new Array(raw.data.length);
    for (let i = 0; i < raw.data.length; i++) {
      const r = raw.data[i];
      erbs[i] = {
        id: r[0],
        prestadora_norm: r[1],
        num_estacao: r[2],
        uf: r[3],
        municipio: r[4],
        lat: r[5],
        lng: r[6],
        tecnologias: r[7],
        tech_principal: r[8],
      };
    }

    _cache = erbs;
    console.log(`[CellData] Loaded ${erbs.length} ERBs from static JSON (${raw.meta.source})`);
    return erbs;
  } catch (err) {
    console.error('[CellData] Static JSON failed, falling back to Supabase:', err);
    return fetchFromSupabase(onProgress);
  }
}

async function fetchFromSupabase(onProgress?: (loaded: number) => void): Promise<ERB[]> {
  const cols = 'id,prestadora_norm,num_estacao,uf,municipio,lat,lng,tecnologias,tech_principal';
  const pageSize = 1000;
  const all: ERB[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from('erb')
      .select(cols)
      .range(from, from + pageSize - 1)
      .order('id');

    if (error) { console.error('ERB fetch error:', error.message); break; }
    if (!data || data.length === 0) break;
    all.push(...(data as ERB[]));
    onProgress?.(all.length);
    if (data.length < pageSize) break;
    from += pageSize;
  }

  _cache = all;
  console.log(`[CellData] Loaded ${all.length} ERBs from Supabase (fallback)`);
  return all;
}

export async function fetchERBDetail(id: number): Promise<ERB | null> {
  const { data, error } = await supabase
    .from('erb')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return data as ERB;
}

export function getFilterOptions(erbs: ERB[]) {
  const ufs = new Set<string>();
  const operadoras = new Set<string>();

  for (const e of erbs) {
    ufs.add(e.uf);
    operadoras.add(e.prestadora_norm);
  }

  return {
    ufs: [...ufs].sort(),
    operadoras: [...operadoras].sort(),
    faixas: [] as string[], // Not available in compact data
  };
}

// UF list (fallback for before data loads)
export const ALL_UFS = [
  'AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT',
  'PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO',
];
