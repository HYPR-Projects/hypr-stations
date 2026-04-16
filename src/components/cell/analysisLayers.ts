import type { Map as MLMap } from 'maplibre-gl';
import { latLngToCell, cellToBoundary } from 'h3-js';
import { OPERADORA_COLORS } from '../../lib/constants';
import type { ERB } from './cellData';

// ─── Heatmap Layer ───────────────────────────────

const HEATMAP_SOURCE = 'erb-heatmap';
const HEATMAP_LAYER = 'erb-heatmap-layer';

export function addHeatmapLayer(map: MLMap, erbs: ERB[]) {
  removeHeatmapLayer(map);

  const geojson: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: erbs.filter(e => e.lat && e.lng).map(e => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [e.lng, e.lat] },
      properties: { weight: 1 },
    })),
  };

  map.addSource(HEATMAP_SOURCE, { type: 'geojson', data: geojson });

  map.addLayer({
    id: HEATMAP_LAYER,
    type: 'heatmap',
    source: HEATMAP_SOURCE,
    paint: {
      'heatmap-weight': ['interpolate', ['linear'], ['zoom'], 0, 0.3, 9, 1],
      'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 0.5, 9, 2],
      'heatmap-color': [
        'interpolate', ['linear'], ['heatmap-density'],
        0, 'rgba(0,0,0,0)',
        0.1, 'rgba(33,102,172,0.4)',
        0.3, 'rgba(51,151,185,0.6)',
        0.5, 'rgba(102,194,165,0.7)',
        0.7, 'rgba(237,217,0,0.8)',
        0.9, 'rgba(245,39,43,0.85)',
        1, 'rgba(180,4,38,0.9)',
      ],
      'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 8, 4, 15, 7, 25, 10, 40, 14, 60],
      'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 12, 0.8, 15, 0.3],
    },
  });
}

export function removeHeatmapLayer(map: MLMap) {
  if (map.getLayer(HEATMAP_LAYER)) map.removeLayer(HEATMAP_LAYER);
  if (map.getSource(HEATMAP_SOURCE)) map.removeSource(HEATMAP_SOURCE);
}

// ─── Dominance Layer (H3 Hexagons) ──────────────

const DOMINANCE_SOURCE = 'erb-dominance';
const DOMINANCE_FILL = 'erb-dominance-fill';
const DOMINANCE_LINE = 'erb-dominance-line';
const DOMINANCE_LABEL = 'erb-dominance-label';

interface HexData {
  h3Index: string;
  counts: Record<string, number>;
  total: number;
  dominant: string;
  dominantCount: number;
  dominantPct: number;
}

function getH3Resolution(zoom: number): number {
  if (zoom < 4) return 2;
  if (zoom < 6) return 3;
  if (zoom < 8) return 4;
  if (zoom < 10) return 5;
  if (zoom < 12) return 6;
  return 7;
}

export function computeDominance(erbs: ERB[], resolution: number): HexData[] {
  const hexMap = new Map<string, Record<string, number>>();

  for (const e of erbs) {
    if (!e.lat || !e.lng) continue;
    try {
      const h3 = latLngToCell(e.lat, e.lng, resolution);
      const counts = hexMap.get(h3) || {};
      counts[e.prestadora_norm] = (counts[e.prestadora_norm] || 0) + 1;
      hexMap.set(h3, counts);
    } catch { /* invalid coords */ }
  }

  const result: HexData[] = [];
  for (const [h3Index, counts] of hexMap) {
    let dominant = '';
    let dominantCount = 0;
    let total = 0;
    for (const [op, n] of Object.entries(counts)) {
      total += n;
      if (n > dominantCount) { dominant = op; dominantCount = n; }
    }
    result.push({ h3Index, counts, total, dominant, dominantCount, dominantPct: total > 0 ? dominantCount / total : 0 });
  }

  return result;
}

function h3ToPolygonCoords(h3Index: string): number[][] {
  const boundary = cellToBoundary(h3Index);
  const coords = boundary.map(([lat, lng]) => [lng, lat]);
  coords.push(coords[0]);
  return coords;
}

// Cache to avoid recomputing on every zoom
let _domCache: { resolution: number; geojson: GeoJSON.FeatureCollection } | null = null;

export function addDominanceLayer(map: MLMap, erbs: ERB[]) {
  removeDominanceLayer(map);

  const zoom = map.getZoom();
  const resolution = getH3Resolution(zoom);

  let geojson: GeoJSON.FeatureCollection;

  if (_domCache && _domCache.resolution === resolution) {
    geojson = _domCache.geojson;
  } else {
    const hexData = computeDominance(erbs, resolution);
    if (hexData.length === 0) return;

    geojson = {
      type: 'FeatureCollection',
      features: hexData.map(h => {
        const coords = h3ToPolygonCoords(h.h3Index);
        const color = OPERADORA_COLORS[h.dominant] || OPERADORA_COLORS['Outras'];
        return {
          type: 'Feature' as const,
          geometry: { type: 'Polygon' as const, coordinates: [coords] },
          properties: {
            dominant: h.dominant,
            dominantPct: Math.round(h.dominantPct * 100),
            total: h.total,
            color,
            ...h.counts,
          },
        };
      }),
    };
    _domCache = { resolution, geojson };
  }

  map.addSource(DOMINANCE_SOURCE, { type: 'geojson', data: geojson });

  map.addLayer({
    id: DOMINANCE_FILL,
    type: 'fill',
    source: DOMINANCE_SOURCE,
    paint: {
      'fill-color': ['get', 'color'],
      'fill-opacity': [
        'interpolate', ['linear'], ['get', 'dominantPct'],
        50, 0.15, 70, 0.3, 90, 0.45, 100, 0.55,
      ],
    },
  });

  map.addLayer({
    id: DOMINANCE_LINE,
    type: 'line',
    source: DOMINANCE_SOURCE,
    paint: {
      'line-color': ['get', 'color'],
      'line-width': 0.6,
      'line-opacity': 0.3,
    },
  });

  map.addLayer({
    id: DOMINANCE_LABEL,
    type: 'symbol',
    source: DOMINANCE_SOURCE,
    minzoom: 8,
    layout: {
      'text-field': ['concat', ['get', 'dominant'], '\n', ['to-string', ['get', 'total']]],
      'text-size': 10,
      'text-font': ['Noto Sans Regular'],
      'text-allow-overlap': false,
    },
    paint: {
      'text-color': ['get', 'color'],
      'text-halo-color': '#0f1419',
      'text-halo-width': 1.5,
    },
  });
}

export function removeDominanceLayer(map: MLMap) {
  if (map.getLayer(DOMINANCE_LABEL)) map.removeLayer(DOMINANCE_LABEL);
  if (map.getLayer(DOMINANCE_LINE)) map.removeLayer(DOMINANCE_LINE);
  if (map.getLayer(DOMINANCE_FILL)) map.removeLayer(DOMINANCE_FILL);
  if (map.getSource(DOMINANCE_SOURCE)) map.removeSource(DOMINANCE_SOURCE);
}

// Debounced zoom update — only recalculate if resolution actually changed
let _domDebounce: ReturnType<typeof setTimeout> | null = null;

export function updateDominanceForZoom(map: MLMap, erbs: ERB[]) {
  if (_domDebounce) clearTimeout(_domDebounce);
  _domDebounce = setTimeout(() => {
    const zoom = map.getZoom();
    const newRes = getH3Resolution(zoom);
    // Only rebuild if resolution changed
    if (_domCache && _domCache.resolution === newRes) return;
    addDominanceLayer(map, erbs);
  }, 300);
}

// Clear cache when switching away from dominance
export function clearDominanceCache() {
  _domCache = null;
}

// ─── Dominance Stats Panel ──────────────────────

export interface DominanceStats {
  byOperator: { op: string; count: number; pct: number; hexCount: number }[];
  totalErbs: number;
  totalHexes: number;
}

export function computeDominanceStats(erbs: ERB[], resolution: number): DominanceStats {
  const hexData = computeDominance(erbs, resolution);

  const opStats: Record<string, { count: number; hexesWon: number }> = {};
  let totalErbs = 0;

  for (const h of hexData) {
    totalErbs += h.total;
    for (const [op, n] of Object.entries(h.counts)) {
      if (!opStats[op]) opStats[op] = { count: 0, hexesWon: 0 };
      opStats[op].count += n;
    }
    if (!opStats[h.dominant]) opStats[h.dominant] = { count: 0, hexesWon: 0 };
    opStats[h.dominant].hexesWon++;
  }

  const byOperator = Object.entries(opStats)
    .map(([op, s]) => ({
      op,
      count: s.count,
      pct: totalErbs > 0 ? s.count / totalErbs : 0,
      hexCount: s.hexesWon,
    }))
    .sort((a, b) => b.count - a.count);

  return { byOperator, totalErbs, totalHexes: hexData.length };
}
