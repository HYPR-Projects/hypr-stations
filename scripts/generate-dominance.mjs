/**
 * Pre-compute H3 dominance hexagons from erb.json
 * Generates dominance.json with hex data at resolutions 3, 4, 5
 * Run: node scripts/generate-dominance.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
import { latLngToCell, cellToBoundary } from 'h3-js';

const erb = JSON.parse(readFileSync('public/assets/erb.json', 'utf8'));
const COLS = erb.meta.cols; // [id, op, num, uf, mun, lat, lng, techs, tech]
const OP_IDX = 1, LAT_IDX = 5, LNG_IDX = 6, TECHS_IDX = 7, TECH_IDX = 8;

const RESOLUTIONS = [3, 4, 5];

function computeHexagons(data, resolution, techFilter = null) {
  const hexMap = new Map();

  for (const row of data) {
    const lat = row[LAT_IDX], lng = row[LNG_IDX];
    const op = row[OP_IDX];
    const techs = row[TECHS_IDX];
    
    // Apply tech filter if specified
    if (techFilter && !techs.some(t => techFilter.includes(t))) continue;
    
    if (!lat || !lng) continue;
    
    try {
      const h3 = latLngToCell(lat, lng, resolution);
      if (!hexMap.has(h3)) hexMap.set(h3, {});
      const counts = hexMap.get(h3);
      counts[op] = (counts[op] || 0) + 1;
    } catch { /* invalid coords */ }
  }

  const hexagons = [];
  for (const [h3Index, counts] of hexMap) {
    let dominant = '', dominantCount = 0, total = 0;
    for (const [op, n] of Object.entries(counts)) {
      total += n;
      if (n > dominantCount) { dominant = op; dominantCount = n; }
    }
    
    // Get boundary coordinates [lng, lat] for GeoJSON
    const boundary = cellToBoundary(h3Index);
    const coords = boundary.map(([lat, lng]) => [
      Math.round(lng * 10000) / 10000,
      Math.round(lat * 10000) / 10000
    ]);
    coords.push(coords[0]); // close ring

    hexagons.push({
      h: h3Index,
      c: coords,
      d: dominant,
      p: Math.round(dominantCount / total * 100), // dominant pct
      t: total,
      // Per-operator counts (compact: only operators present)
      o: counts,
    });
  }

  return hexagons;
}

console.log(`Processing ${erb.meta.count} ERBs...`);

const result = {
  meta: {
    generated: new Date().toISOString(),
    source: erb.meta.source,
    totalErbs: erb.meta.count,
    resolutions: RESOLUTIONS,
  },
  // All techs combined
  all: {},
  // Per-tech breakdowns
  '5G': {},
  '4G': {},
};

for (const res of RESOLUTIONS) {
  console.log(`  Resolution ${res}...`);
  
  result.all[`r${res}`] = computeHexagons(erb.data, res);
  console.log(`    all: ${result.all[`r${res}`].length} hexagons`);
  
  result['5G'][`r${res}`] = computeHexagons(erb.data, res, ['5G']);
  console.log(`    5G: ${result['5G'][`r${res}`].length} hexagons`);
  
  result['4G'][`r${res}`] = computeHexagons(erb.data, res, ['4G']);
  console.log(`    4G: ${result['4G'][`r${res}`].length} hexagons`);
}

const outPath = 'public/assets/dominance.json';
writeFileSync(outPath, JSON.stringify(result, null, 0));

const sizeKB = Math.round(readFileSync(outPath).length / 1024);
console.log(`\nSaved ${outPath}: ${sizeKB} KB`);

// Verify
const verify = JSON.parse(readFileSync(outPath, 'utf8'));
console.log('Verification:');
for (const tech of ['all', '5G', '4G']) {
  for (const res of RESOLUTIONS) {
    const key = `r${res}`;
    console.log(`  ${tech} ${key}: ${verify[tech][key].length} hexagons`);
  }
}
