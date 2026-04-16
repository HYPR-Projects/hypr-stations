#!/usr/bin/env python3
"""
Convert v1 data files to optimized v4/v2 formats.

Usage:
  python scripts/optimize-data.py

Reads:
  public/assets/erb.v1.json       (or erb.json if v1 doesn't exist)
  public/assets/dominance.v1.json  (or dominance.json)

Writes:
  public/assets/erb.json
  public/assets/dominance.json

ERB v4 format (columnar):
  - Lookup tables for operadoras, UFs, municípios
  - Coordinates as integers (×10000, ~5m precision)
  - Tech bitmask (5G=8 4G=4 3G=2 2G=1)
  - num_estacao as int

Dominance v2 format (no coordinates):
  - Coordinates stripped (recomputed from h3 via h3-js on client)
  - Operator names as indices
  - Flat operator count arrays
"""
import json, os, sys

ASSETS = os.path.join(os.path.dirname(__file__), '..', 'public', 'assets')
TECH_BITS = {'5G': 8, '4G': 4, '3G': 2, '2G': 1}


def optimize_erb():
    # Try v1 first, fall back to current
    v1_path = os.path.join(ASSETS, 'erb.v1.json')
    cur_path = os.path.join(ASSETS, 'erb.json')
    src = v1_path if os.path.exists(v1_path) else cur_path

    with open(src) as f:
        data = json.load(f)

    # Skip if already v4
    if isinstance(data.get('v'), int) and data['v'] >= 4:
        print(f'[erb] Already v4, skipping')
        return

    rows = data['data']

    ops = sorted(set(r[1] for r in rows))
    ufs = sorted(set(r[3] for r in rows))
    muns = sorted(set(r[4] for r in rows))
    op_idx = {v: i for i, v in enumerate(ops)}
    uf_idx = {v: i for i, v in enumerate(ufs)}
    mun_idx = {v: i for i, v in enumerate(muns)}

    out = {
        'v': 4,
        'meta': {
            'count': len(rows),
            'generated': data['meta']['generated'],
            'source': data['meta']['source'],
        },
        'L': {'op': ops, 'uf': ufs, 'mun': muns},
        'c': {
            'o': [op_idx[r[1]] for r in rows],
            'n': [int(r[2]) for r in rows],
            'u': [uf_idx[r[3]] for r in rows],
            'm': [mun_idx[r[4]] for r in rows],
            'a': [int(round(r[5] * 10000)) for r in rows],
            'g': [int(round(r[6] * 10000)) for r in rows],
            't': [sum(TECH_BITS.get(t, 0) for t in r[7]) for r in rows],
            'p': [TECH_BITS.get(r[8], 0) for r in rows],
        }
    }

    out_path = os.path.join(ASSETS, 'erb.json')
    with open(out_path, 'w') as f:
        json.dump(out, f, separators=(',', ':'), ensure_ascii=False)

    raw_mb = os.path.getsize(out_path) / 1024 / 1024
    print(f'[erb] {len(rows):,} rows → {raw_mb:.2f} MB ({len(ops)} ops, {len(ufs)} ufs, {len(muns)} muns)')


def optimize_dominance():
    v1_path = os.path.join(ASSETS, 'dominance.v1.json')
    cur_path = os.path.join(ASSETS, 'dominance.json')
    src = v1_path if os.path.exists(v1_path) else cur_path

    with open(src) as f:
        dom = json.load(f)

    # Skip if already v2
    if isinstance(dom.get('v'), int) and dom['v'] >= 2:
        print(f'[dominance] Already v2, skipping')
        return

    dom_ops = sorted(set(
        h['d'] for tk in ['all', '5G', '4G'] if tk in dom
        for rk in dom[tk] for h in dom[tk][rk]
    ))
    dom_op_idx = {v: i for i, v in enumerate(dom_ops)}

    def compact_hex(h):
        o_flat = []
        for op_name, count in h['o'].items():
            if op_name in dom_op_idx:
                o_flat.extend([dom_op_idx[op_name], count])
        return [h['h'], dom_op_idx[h['d']], h['p'], h['t'], o_flat]

    out = {
        'v': 2,
        'meta': dom['meta'],
        'ops': dom_ops,
    }

    total_hexes = 0
    for tk in ['all', '5G', '4G']:
        if tk not in dom:
            continue
        out[tk] = {}
        for rk in dom[tk]:
            out[tk][rk] = [compact_hex(h) for h in dom[tk][rk]]
            total_hexes += len(out[tk][rk])

    out_path = os.path.join(ASSETS, 'dominance.json')
    with open(out_path, 'w') as f:
        json.dump(out, f, separators=(',', ':'), ensure_ascii=False)

    raw_mb = os.path.getsize(out_path) / 1024 / 1024
    print(f'[dominance] {total_hexes:,} hexes → {raw_mb:.2f} MB ({len(dom_ops)} ops)')


if __name__ == '__main__':
    optimize_erb()
    optimize_dominance()
    print('Done.')
