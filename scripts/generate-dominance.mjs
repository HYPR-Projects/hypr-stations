/**
 * Pre-compute H3 dominance hexagons from erb.json (v4 columnar format)
 * Generates dominance.json in v2 compact format (no coordinates — client recomputes from h3-js)
 *
 * Run: node scripts/generate-dominance.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
import { latLngToCell } from 'h3-js';

const erb = JSON.parse(readFileSync('public/assets/erb.json', 'utf8'));

// Detect format version
const isV4 = erb.v >= 4;
let count, getRow;

if (isV4) {
  // v4 columnar: lookup tables + bitmask techs + int coords
  const { op, uf, mun } = erb.L;
  const { o, n, u, m, a, g, t, p } = erb.c;
  const TECH_FROM_BIT = { 8: '5G', 4: '4G', 2: '3G', 1: '2G' };
  const bitmaskToTechs = (mask) => [8, 4, 2, 1].filter(b => mask & b).map(b => TECH_FROM_BIT[b]);

  count = erb.meta.count;
  getRow = (i) => ({
    op: op[o[i]],
    lat: a[i] / 10000,
    lng: g[i] / 10000,
    techs: bitmaskToTechs(t[i]),
  });
} else {
  // v1 legacy: row arrays [id, op, num, uf, mun, lat, lng, techs, tech]
  count = erb.data.length;
  getRow = (i) => {
    const r = erb.data[i];
    return { op: r[1], lat: r[5], lng: r[6], techs: r[7] };
  };
}

const RESOLUTIONS = [3, 4, 5];

function computeHexagons(techFilter = null) {
  const results = {};

  for (const res of RESOLUTIONS) {
    const hexMap = new Map();

    for (let i = 0; i < count; i++) {
      const row = getRow(i);
      if (!row.lat || !row.lng) continue;
      if (techFilter && !row.techs.some(t => techFilter.includes(t))) continue;

      try {
        const h3 = latLngToCell(row.lat, row.lng, res);
        if (!hexMap.has(h3)) hexMap.set(h3, {});
        const counts = hexMap.get(h3);
        counts[row.op] = (counts[row.op] || 0) + 1;
      } catch { /* invalid coords */ }
    }

    const hexagons = [];
    for (const [h3Index, counts] of hexMap) {
      let dominant = '', dominantCount = 0, total = 0;
      for (const [op, n] of Object.entries(counts)) {
        total += n;
        if (n > dominantCount) { dominant = op; dominantCount = n; }
      }
      hexagons.push({
        h3: h3Index,
        dominant,
        pct: Math.round(dominantCount / total * 100),
        total,
        counts,
      });
    }

    results[`r${res}`] = hexagons;
    console.log(`  r${res}: ${hexagons.length} hexagons`);
  }

  return results;
}

// Collect all operator names
console.log(`Processing ${count} ERBs (format v${erb.v || 1})...`);

console.log('Computing all techs...');
const allResults = computeHexagons();
console.log('Computing 5G...');
const fiveGResults = computeHexagons(['5G']);
console.log('Computing 4G...');
const fourGResults = computeHexagons(['4G']);

// Build operator index
const opSet = new Set();
for (const results of [allResults, fiveGResults, fourGResults]) {
  for (const hexes of Object.values(results)) {
    for (const h of hexes) {
      opSet.add(h.dominant);
      for (const op of Object.keys(h.counts)) opSet.add(op);
    }
  }
}
const ops = [...opSet].sort();
const opIdx = Object.fromEntries(ops.map((v, i) => [v, i]));

// Convert to v2 compact format: [h3, dom_op_idx, pct, total, [op_idx, count, ...]]
function toCompact(results) {
  const out = {};
  for (const [rk, hexes] of Object.entries(results)) {
    out[rk] = hexes.map(h => {
      const oFlat = [];
      for (const [op, n] of Object.entries(h.counts)) {
        if (op in opIdx) oFlat.push(opIdx[op], n);
      }
      return [h.h3, opIdx[h.dominant], h.pct, h.total, oFlat];
    });
  }
  return out;
}

const result = {
  v: 2,
  meta: {
    generated: new Date().toISOString(),
    source: erb.meta.source,
    totalErbs: count,
    resolutions: RESOLUTIONS,
  },
  ops,
  all: toCompact(allResults),
  '5G': toCompact(fiveGResults),
  '4G': toCompact(fourGResults),
};

const outPath = 'public/assets/dominance.json';
const json = JSON.stringify(result);
writeFileSync(outPath, json);

const sizeKB = Math.round(json.length / 1024);
console.log(`\nSaved ${outPath}: ${sizeKB} KB (v2 compact, no coordinates)`);
console.log(`Operators: ${ops.join(', ')}`);

// Summary
let totalHexes = 0;
for (const tk of ['all', '5G', '4G']) {
  for (const rk of Object.keys(result[tk])) {
    totalHexes += result[tk][rk].length;
  }
}
console.log(`Total hexagons: ${totalHexes}`);
