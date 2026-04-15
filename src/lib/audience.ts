// ═══════════════════════════════════════════════════
// HYPR Station — Audience & Coverage Models
// Shared between Radio Map and Cell Map
// ═══════════════════════════════════════════════════

// Population density by UF (devices per km²)
export const UF_DENSITY: Record<string, number> = {
  AC: 2.1, AL: 8.5, AM: 1.3, AP: 1.5, BA: 7.2, CE: 12.0,
  DF: 85.0, ES: 15.0, GO: 6.5, MA: 5.0, MG: 8.0, MS: 3.2,
  MT: 2.0, PA: 2.5, PB: 9.0, PE: 14.0, PI: 4.5, PR: 10.0,
  RJ: 45.0, RN: 8.5, RO: 2.8, RR: 1.0, RS: 9.0, SC: 12.0,
  SE: 10.0, SP: 35.0, TO: 2.0,
};

// ── Radio coverage model ──

const ERP_FALLBACK: Record<string, number> = {
  A: 100, A1: 30, A2: 19, A3: 14, A4: 5,
  B: 50, B1: 3, B2: 1, C: 1,
  E1: 48, E2: 65, E3: 38,
};

const CLASS_MULTIPLIER: Record<string, number> = {
  A: 1.8, A1: 1.5, A2: 1.3, A3: 1.1, A4: 0.9,
  B: 1.6, B1: 0.7, B2: 0.5, C: 0.4,
  E1: 1.2, E2: 1.3, E3: 1.0,
};

export function getRadioERP(erp: number, classe: string): number {
  return erp > 0 ? erp : (ERP_FALLBACK[classe] || 5);
}

export function estimateRadioRadius(erp: number, tipo: string): number {
  if (erp <= 0) return 0;
  const base = tipo === 'FM' ? 4.0 : 6.0;
  return base * Math.sqrt(erp);
}

export function estimateRadioAudience(
  erp: number, tipo: string, classe: string, uf: string
): number {
  const effectiveErp = getRadioERP(erp, classe);
  const rKm = estimateRadioRadius(effectiveErp, tipo);
  if (rKm <= 0) return 0;
  const area = Math.PI * rKm * rKm;
  const baseDensity = UF_DENSITY[uf] || 3;
  const density = baseDensity * (CLASS_MULTIPLIER[classe] || 1);
  const pen = tipo === 'FM' ? 0.40 : 0.20;
  const campMult = 1.5;
  return Math.round(area * density * pen * campMult);
}

// ── Cell coverage model ──

// Estimated radius (km) by technology + frequency band
const CELL_RADIUS: Record<string, Record<string, number>> = {
  '5G': { '3500': 0.5, '2600': 0.8, '2100': 1.0, '700': 3.0, default: 0.8 },
  '4G': { '700': 15, '1800': 5, '2100': 4, '2600': 3, default: 5 },
  '3G': { '850': 12, '900': 10, '2100': 5, default: 8 },
  '2G': { '850': 35, '900': 30, '1800': 15, default: 25 },
};

export function estimateCellRadius(tech: string, freqMhz?: number): number {
  const techMap = CELL_RADIUS[tech] || CELL_RADIUS['4G'];
  if (freqMhz) {
    const key = String(freqMhz);
    if (techMap[key]) return techMap[key];
    // Find closest
    const freqs = Object.keys(techMap).filter(k => k !== 'default').map(Number);
    const closest = freqs.reduce((a, b) => Math.abs(b - freqMhz) < Math.abs(a - freqMhz) ? b : a);
    return techMap[String(closest)] || techMap.default;
  }
  return techMap.default;
}

export function estimateCellAudience(tech: string, uf: string, freqMhz?: number): number {
  const rKm = estimateCellRadius(tech, freqMhz);
  const area = Math.PI * rKm * rKm;
  const baseDensity = UF_DENSITY[uf] || 3;
  const mobilePen = 0.85; // mobile penetration rate
  const campMult = 1.2;
  return Math.round(area * baseDensity * mobilePen * campMult);
}

// ── Formatting ──

export function formatAudience(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toString();
}
