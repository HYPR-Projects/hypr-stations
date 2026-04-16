// HYPR Station — Radio Map Data (lazy-loaded)
// Source: Anatel/SRD · ~3890 stations
// Data loaded from /assets/radio-stations.json

export interface RadioStation {
  _sid: number;
  tipo: string;
  municipio: string;
  uf: string;
  frequencia: string;
  classe: string;
  categoria: string;
  erp: number;
  entidade: string;
  carater: string;
  finalidade: string;
  lat: number;
  lng: number;
  _mun: string;
  _ent: string;
  _nome: string;
  _fantasy: string;
}

interface RawData {
  _L: Record<string, string[]>;
  _D: number[][];
  _F: Record<string, string[]>;
}

export interface RadioData {
  stations: RadioStation[];
  allUFs: string[];
  allClasses: string[];
  allFinalidades: string[];
}

const FIELDS = ["tipo","municipio","uf","frequencia","classe","categoria","erp","entidade","carater","finalidade","lat","lng"] as const;
const LOOKUP_KEYS = ["T","M","U","Q","C","F",null,"E","K","R",null,null];

function buildStations(raw: RawData): RadioData {
  const fnKeys = Object.keys(raw._F);

  const stations = raw._D.map((r, i) => {
    const s: Record<string, unknown> = {};
    FIELDS.forEach((f, fi) => {
      const lk = LOOKUP_KEYS[fi];
      s[f] = lk ? raw._L[lk][r[fi]] : r[fi];
    });
    const station = s as unknown as RadioStation;
    station._sid = i;
    station._mun = station.municipio.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    station._ent = station.entidade ? station.entidade.toLowerCase() : "";
    station._nome = station._ent + " " + (station.frequencia || "");
    station._fantasy = "";

    const ent = station._ent;
    if (ent) {
      const aliases: string[] = [];
      for (const fk of fnKeys) {
        for (const kw of raw._F[fk]) {
          if (ent.includes(kw)) { aliases.push(fk); break; }
        }
      }
      if (aliases.length) {
        station._nome += " " + aliases.join(" ");
        station._fantasy = aliases.map(a => a.replace(/\b\w/g, c => c.toUpperCase())).join(" / ");
      }
    }
    return station;
  });

  return {
    stations,
    allUFs: [...new Set(stations.map(s => s.uf))].sort(),
    allClasses: [...new Set(stations.map(s => s.classe).filter(Boolean))].sort(),
    allFinalidades: [...new Set(stations.map(s => s.finalidade).filter(Boolean))].sort(),
  };
}

let cached: RadioData | null = null;

export async function loadRadioData(): Promise<RadioData> {
  if (cached) return cached;

  const res = await fetch('/assets/radio-stations.json');
  if (!res.ok) throw new Error(`Failed to load radio data: ${res.status}`);
  const raw: RawData = await res.json();
  cached = buildStations(raw);
  return cached;
}
