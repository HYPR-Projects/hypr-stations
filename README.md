# HYPR Station

Plataforma de mapas de cobertura de mídia — rádio, celular e TV.

**URL:** `stations.hypr.mobi`

## Stack

- **Astro 6** — meta-framework, static pages + selective hydration
- **React 19** — interactive islands (maps, filters, checkout)
- **Tailwind CSS v4** — styling com design tokens HYPR
- **MapLibre GL JS** — renderização de mapas
- **h3-js** — geometria de hexágonos H3 (dominance layer)
- **Supabase** — dados ERBs (Cell Map, fallback)
- **Vercel** — deploy, domínio, preview branches

## Estrutura

```
src/
├── layouts/         Astro layouts (BaseLayout)
├── pages/           Rotas (index, radio, cell)
├── components/
│   ├── shared/      Header, ThemeToggle, Auth, Checkout, MultiSelect,
│   │                ToggleGroup, SelectionBar, MapContainer, LoginButton
│   ├── hub/         MapCard, HubSearch, HubStats
│   ├── radio/       RadioMap, RadioFilters, StationList, radioData
│   └── cell/        CellMap, CellFilters, CellStationList, ViewModeSelector,
│                    DominancePanel, analysisLayers, coverageLayer, cellData
├── lib/             Supabase client, constants, audience helpers
└── styles/          global.css (Tailwind + design tokens V3)
```

## Design System V3

Paleta dark-first com cores dessaturadas. Escala tipográfica em 4 tamanhos primários (11/13/15/20px). Border-radius em 5 níveis (5-6/8/10/12/14px). Animações de entrada (fadeUp, slideIn, barIn, dotPulse).

Tokens definidos em `src/styles/global.css` via `@theme`. Cores de operadora e tecnologia em `src/lib/constants.ts`.

## Dev

```bash
npm install
npm run dev        # localhost:4321
npm run build      # static output → dist/
npm run preview    # preview build
```

## Data Formats

### erb.json (v4 — columnar)

~109K ERBs em formato columnar com lookup tables. Coords como inteiros (×10000, ~5m precisão). Techs como bitmask (5G=8, 4G=4, 3G=2, 2G=1).

```
{ v: 4, meta: {...}, L: { op, uf, mun }, c: { o, n, u, m, a, g, t, p } }
```

Loader: `src/components/cell/cellData.ts`

### dominance.json (v2 — sem coordenadas)

Hexágonos H3 pré-computados por operadora e tecnologia (resolutions 3/4/5). Coordenadas não armazenadas — recomputadas pelo client via `h3-js cellToBoundary()`.

```
{ v: 2, meta: {...}, ops: [...], all: { r3: [...], r4, r5 }, '5G': {...}, '4G': {...} }
```

Cada hex: `[h3_index, dom_op_idx, pct, total, [op_idx, count, ...]]`

Loader: `src/components/cell/analysisLayers.ts`

### Regenerar dados

```bash
# ETL Anatel → erb.json (v1) → optimize → erb.json (v4)
python scripts/etl_anatel_erb.py
python scripts/optimize-data.py

# Dominance hexagons (lê erb.json v4, gera dominance.json v2)
node scripts/generate-dominance.mjs
```

## Deploy

Push para `main` → Vercel auto-deploy em `stations.hypr.mobi`.
