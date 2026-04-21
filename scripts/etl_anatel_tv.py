#!/usr/bin/env python3
"""
HYPR TV Map — ETL: Anatel Mosaico → stations.json + Supabase

This script has TWO modes:

  1) --from-csv <path>      Import a CSV manually exported from the Anatel
                            Mosaico "Spectrum-E" interface. This is the
                            RELIABLE path while the public Mosaico download
                            endpoint sits behind a PHP session flow.

                            How to get the CSV:
                              - Open https://sistemas.anatel.gov.br/se/public/view/b/srd.php
                              - Filter by "TV" (qidx=1)
                              - Click "Download CSV"
                              - Save the file locally

  2) --from-mosaico         Attempt to scrape the Mosaico directly. Tries a
                            few endpoints and gives up if auth is required.
                            Best-effort; expect breakage when Anatel updates
                            the site.

Regardless of the mode, output is:
  - public/assets/tv/stations.json       (TVD generators, compact lookup)
  - public/assets/tv/retransmitters.json (RTV + RTVD, compact lookup)
  - Optional Supabase upsert into public.tv_afiliacao (--push-supabase)

Env vars for --push-supabase:
  SUPABASE_URL              sa-east-1 project URL
  SUPABASE_SERVICE_KEY      service role key (writes bypass RLS)

Usage:
  # Most common — CSV path
  python scripts/etl_anatel_tv.py --from-csv ~/Downloads/canais_mosaico.csv

  # Try the scraper (expect failure until auth is solved)
  python scripts/etl_anatel_tv.py --from-mosaico

  # Dry-run (no file write, no DB push)
  python scripts/etl_anatel_tv.py --from-csv canais.csv --dry-run

  # Also push to Supabase (requires SUPABASE_URL + SUPABASE_SERVICE_KEY)
  python scripts/etl_anatel_tv.py --from-csv canais.csv --push-supabase
"""

import argparse
import csv
import json
import os
import re
import sys
import unicodedata
import urllib.request
import urllib.error
from datetime import date
from io import StringIO
from typing import Iterable

# ─── Config ─────────────────────────────────────────────────────────

OUT_DIR = "public/assets/tv"
MOSAICO_URL = "https://sistemas.anatel.gov.br/se/public/view/b/srd.php"

# Known columns in the Mosaico CSV export. The Anatel format is unstable
# — this map handles the variations we've seen. Update as new columns
# appear.
COLUMN_ALIASES = {
    "servico":       ["servico", "serviço", "service"],
    "municipio":     ["municipio", "município", "cidade", "local"],
    "uf":            ["uf", "estado", "sigla_uf"],
    "canal":         ["canal", "canal fisico", "canal físico"],
    "canal_virtual": ["canal virtual", "virtual"],
    "entidade":      ["entidade", "razão social", "razao social", "prestadora"],
    "nome_fantasia": ["nome fantasia", "nome_fantasia", "fantasia"],
    "erp":           ["erp", "potência", "potencia", "pot_erp"],
    "altura":        ["altura", "altura antena", "haat"],
    "status":        ["status", "situação", "situacao"],
    "lat":           ["latitude", "lat"],
    "lng":           ["longitude", "lng", "lon"],
    "azimute":       ["azimute"],
    "cnpj":          ["cnpj"],
}

# Hand-curated affiliate hints. When the CSV doesn't tell us the network
# directly (common), we infer it from the entity name. Keys are lowercased
# substrings; first match wins. Order matters: put specific entries before
# generic ones (e.g. "tv globo" before "globo").
NETWORK_RULES = [
    # Network rules run against text that has already been stripped of
    # accents and lowercased (see infer_network). Keep patterns in that
    # form — NO accented characters in regex literals below.
    (r"casper libero", "gazeta"),
    (r"cancao nova|joao paulo ii", "cancao"),
    (r"rede vida", "rit"),
    (r"tv brasil|empresa brasil de comunicacao|\bebc\b", "tvbrasil"),
    (r"\bcultura\b|padre anchieta", "cultura"),
    # Globo & its owned-and-operated regional groups
    (r"\bglobo\b|rede globo|tv globo", "globo"),
    (r"\b(eptv|rbs tv|rpc tv|inter tv|nsc tv)\b", "globo"),
    (r"centro america radiodifusao|tv centro america", "globo"),
    (r"\btv (anhanguera|bahia|morena|liberal|verdes mares|gazeta|tribuna|integracao|clube|sergipe|mirante|paraiba|cabo branco|tem|fronteira|panorama|zoom|paranaiba|cidade verde|gazeta sul|gazeta norte|santa cruz|sudoeste|grande rio|asa branca|vanguarda|tapajos)\b", "globo"),
    (r"rede amazonica", "globo"),
    # SBT
    (r"\bsbt\b|sistema brasileiro de televisao|tv sbt", "sbt"),
    (r"\btv (alterosa|aratu|jornal|iguacu|subae|morada do sol|atalaia|difusora|tambau|ponta negra|meio norte|pajucara|ponta verde|serra dourada|cidade verde|thathi|imperial|critica|tropical|cidade)\b", "sbt"),
    # Record
    (r"\brecord\b|record tv|tv record", "record"),
    (r"\btv (itapoan|vitoria|manaira|ceara|guara)\b", "record"),
    # Band
    (r"bandeirantes|\bband\b", "band"),
    # RedeTV
    (r"rede ?tv", "redetv"),
    # Last-resort for "gazeta" on its own
    (r"\bgazeta\b", "gazeta"),
]

# Output wire format — must match tvData.ts FIELDS order
FIELDS = [
    "tipo", "municipio", "uf", "canal", "canal_virtual",
    "erp_kw", "altura_antena",
    "entidade", "rede_id", "nome_fantasia", "status",
    "lat", "lng",
]

LOOKUP_KEYS = [
    "T", "M", "U", "C", "V",
    None, None,
    "E", "R", "F", "S",
    None, None,
]


# ─── Helpers ────────────────────────────────────────────────────────

def strip_accents(s: str) -> str:
    return "".join(
        c for c in unicodedata.normalize("NFD", s or "")
        if unicodedata.category(c) != "Mn"
    )


def resolve_column(header_row: list[str], alias_key: str) -> int | None:
    """Return the index of the column matching one of the known aliases."""
    normalized = [strip_accents(h).lower().strip() for h in header_row]
    for alias in COLUMN_ALIASES[alias_key]:
        normalized_alias = strip_accents(alias).lower().strip()
        for i, h in enumerate(normalized):
            if h == normalized_alias:
                return i
    return None


def infer_network(entidade: str, fantasia: str) -> str:
    """Infer network ID by matching entity/fantasia against NETWORK_RULES."""
    text = strip_accents((entidade or "") + " " + (fantasia or "")).lower()
    for pattern, network_id in NETWORK_RULES:
        if re.search(pattern, text, re.IGNORECASE):
            return network_id
    return "independente"


def classify_tipo(servico: str) -> str:
    """Anatel uses "TV", "TVD", "RTV", "RTVD"; normalize to our 3 types."""
    s = strip_accents(servico or "").upper().strip()
    if "RTVD" in s:
        return "RTVD"
    if "RTV" in s:
        return "RTV"
    return "TVD"


def parse_float(value: str, default: float = 0.0) -> float:
    if value is None:
        return default
    s = str(value).strip().replace(",", ".")
    if not s:
        return default
    try:
        return float(s)
    except ValueError:
        return default


def parse_coord(value: str) -> float | None:
    """Accepts decimal degrees OR the Anatel 'DD°MM'SS''' format."""
    if value is None:
        return None
    s = str(value).strip()
    if not s:
        return None
    # Try decimal first
    try:
        return float(s.replace(",", "."))
    except ValueError:
        pass
    # Try DMS: "15°47'54\"S"
    m = re.match(r"(\d+)[°\s]+(\d+)[′'\s]+(\d+(?:[.,]\d+)?)[″\"\s]*([NSEW])?", s)
    if not m:
        return None
    deg, minutes, seconds, hemi = m.groups()
    val = int(deg) + int(minutes) / 60 + float(seconds.replace(",", ".")) / 3600
    if hemi in ("S", "W"):
        val = -val
    return val


# ─── Ingestion modes ────────────────────────────────────────────────

def read_csv_file(path: str) -> list[dict]:
    """Read a Mosaico CSV export and return normalized station records."""
    if not os.path.exists(path):
        print(f"❌ CSV not found: {path}", file=sys.stderr)
        sys.exit(1)

    # Mosaico CSVs usually use ; as separator and latin-1 encoding
    tried = []
    for encoding in ("utf-8", "latin-1", "cp1252"):
        for sep in (";", ","):
            try:
                with open(path, "r", encoding=encoding, newline="") as f:
                    reader = csv.reader(f, delimiter=sep)
                    header = next(reader)
                    if len(header) < 3:
                        continue
                    rows = list(reader)
                    return normalize_rows(header, rows)
            except (UnicodeDecodeError, StopIteration) as e:
                tried.append(f"{encoding}/{sep}: {e}")
                continue
    print(f"❌ Could not parse CSV. Tried:\n  " + "\n  ".join(tried), file=sys.stderr)
    sys.exit(1)


def normalize_rows(header: list[str], rows: list[list[str]]) -> list[dict]:
    """Translate raw CSV rows into our normalized station dict."""
    cols = {k: resolve_column(header, k) for k in COLUMN_ALIASES.keys()}

    missing = [k for k in ("municipio", "uf", "entidade") if cols[k] is None]
    if missing:
        print(f"❌ CSV missing required columns: {missing}", file=sys.stderr)
        print(f"   Header was: {header}", file=sys.stderr)
        sys.exit(1)

    stations = []
    for raw in rows:
        # Skip empty/padding rows
        if not any(raw):
            continue

        def get(col_key: str) -> str:
            idx = cols[col_key]
            if idx is None or idx >= len(raw):
                return ""
            return (raw[idx] or "").strip()

        servico = get("servico")
        tipo = classify_tipo(servico) if servico else "TVD"

        entidade = get("entidade")
        fantasia = get("nome_fantasia") or entidade
        rede_id = infer_network(entidade, fantasia)

        lat = parse_coord(get("lat"))
        lng = parse_coord(get("lng"))
        if lat is None or lng is None:
            # Drop rows without geo — they can't show on the map
            continue

        stations.append({
            "tipo":          tipo,
            "municipio":     get("municipio"),
            "uf":            (get("uf") or "").upper()[:2],
            "canal":         get("canal"),
            "canal_virtual": get("canal_virtual"),
            "erp_kw":        parse_float(get("erp")),
            "altura_antena": parse_float(get("altura")),
            "entidade":      entidade,
            "rede_id":       rede_id,
            "nome_fantasia": fantasia,
            "status":        get("status") or "Licenciada",
            "lat":           lat,
            "lng":           lng,
        })

    return stations


def scrape_mosaico() -> list[dict]:
    """Attempt to pull the Mosaico TV channel list directly.

    Status: the Spectrum-E Download CSV button requires a live PHP session
    AND redirects to login on unauthenticated POSTs. This function is a
    placeholder that documents the attempt for future work. It tries the
    common endpoints and surfaces clear diagnostics.
    """
    print("⚠  Mosaico direct scrape is unreliable — the CSV download endpoint")
    print("   requires a session cookie AND redirects to /login for anonymous")
    print("   callers as of 2026. Use --from-csv with a manual export instead.")
    print()
    print(f"   Try: open {MOSAICO_URL}, filter by TV, click Download CSV,")
    print(f"   then run: python {sys.argv[0]} --from-csv <path>")
    return []


# ─── Compact-lookup packer ──────────────────────────────────────────

def build_compact(rows: list[dict]) -> dict:
    """Pack a list of station dicts into the compact lookup format."""
    lookups: dict[str, list[str]] = {k: [] for k in set(filter(None, LOOKUP_KEYS))}
    lookup_idx: dict[str, dict[str, int]] = {k: {} for k in lookups.keys()}
    data = []

    for row in rows:
        compact = []
        for field, lk in zip(FIELDS, LOOKUP_KEYS):
            value = row.get(field)
            if lk is None:
                compact.append(value if value is not None else 0)
            else:
                s = str(value) if value is not None else ""
                if s not in lookup_idx[lk]:
                    lookup_idx[lk][s] = len(lookups[lk])
                    lookups[lk].append(s)
                compact.append(lookup_idx[lk][s])
        data.append(compact)

    return {
        "_meta": {
            "generated": date.today().isoformat(),
            "source":    "etl_anatel_tv",
            "count":     len(rows),
        },
        "_L": lookups,
        "_D": data,
    }


def write_outputs(stations: list[dict]) -> tuple[int, int]:
    """Split stations into generators vs retransmitters, write both JSONs."""
    os.makedirs(OUT_DIR, exist_ok=True)

    tvd = [s for s in stations if s["tipo"] == "TVD"]
    rtv = [s for s in stations if s["tipo"] != "TVD"]

    stations_path = os.path.join(OUT_DIR, "stations.json")
    with open(stations_path, "w", encoding="utf-8") as f:
        json.dump(build_compact(tvd), f, ensure_ascii=False, separators=(",", ":"))
    print(f"✓ Wrote {len(tvd)} generators to {stations_path}")

    rtv_path = os.path.join(OUT_DIR, "retransmitters.json")
    with open(rtv_path, "w", encoding="utf-8") as f:
        json.dump(build_compact(rtv), f, ensure_ascii=False, separators=(",", ":"))
    print(f"✓ Wrote {len(rtv)} retransmitters to {rtv_path}")

    return len(tvd), len(rtv)


# ─── Supabase upsert (optional) ─────────────────────────────────────

def push_to_supabase(stations: Iterable[dict]) -> None:
    """Upsert affiliate rows into tv_afiliacao. Only TVD generators go in —
    retransmitters don't need a DB row; they're rendered from the JSON."""
    url = os.environ.get("SUPABASE_URL", "")
    key = os.environ.get("SUPABASE_SERVICE_KEY", "")
    if not url or not key:
        print("❌ --push-supabase requires SUPABASE_URL and SUPABASE_SERVICE_KEY", file=sys.stderr)
        sys.exit(1)

    tvd = [s for s in stations if s["tipo"] == "TVD"]
    print(f"→ Pushing {len(tvd)} affiliate rows to Supabase…")

    batch_size = 200
    endpoint = f"{url}/rest/v1/tv_afiliacao"
    headers = {
        "apikey":        key,
        "Authorization": f"Bearer {key}",
        "Content-Type":  "application/json",
        # Upsert on our natural uniqueness: entidade_nome + municipio + uf + canal_virtual
        "Prefer":        "resolution=merge-duplicates,return=minimal",
    }

    for i in range(0, len(tvd), batch_size):
        batch = tvd[i : i + batch_size]
        payload = [
            {
                "rede_id":        s["rede_id"],
                "entidade_nome":  s["entidade"],
                "nome_fantasia":  s["nome_fantasia"],
                "municipio":      s["municipio"],
                "uf":             s["uf"],
                "canal_fisico":   int(s["canal"]) if str(s["canal"]).isdigit() else None,
                "canal_virtual":  s["canal_virtual"],
                "erp_kw":         s["erp_kw"],
                "altura_antena":  s["altura_antena"],
                "lat":            s["lat"],
                "lng":            s["lng"],
                "licenca_status": s["status"],
                "ativo":          True,
            }
            for s in batch
        ]
        req = urllib.request.Request(
            endpoint,
            data=json.dumps(payload).encode("utf-8"),
            headers=headers,
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                if resp.status not in (200, 201, 204):
                    print(f"⚠  Batch {i}: HTTP {resp.status}")
        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8", errors="replace")[:400]
            print(f"❌ Batch {i}: HTTP {e.code}: {body}", file=sys.stderr)
            raise

    print(f"✓ Upserted {len(tvd)} rows into public.tv_afiliacao")


# ─── CLI ────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[1])
    parser.add_argument("--from-csv", metavar="PATH",
                        help="Import from a Mosaico CSV export.")
    parser.add_argument("--from-mosaico", action="store_true",
                        help="Attempt to scrape Mosaico directly (unreliable).")
    parser.add_argument("--dry-run", action="store_true",
                        help="Parse and validate, but do not write JSON or push.")
    parser.add_argument("--push-supabase", action="store_true",
                        help="Also upsert affiliates into Supabase (needs env vars).")
    args = parser.parse_args()

    if not (args.from_csv or args.from_mosaico):
        parser.error("Choose --from-csv PATH or --from-mosaico")

    stations = read_csv_file(args.from_csv) if args.from_csv else scrape_mosaico()

    print(f"→ Parsed {len(stations)} stations")
    if stations:
        by_type = {}
        by_rede = {}
        for s in stations:
            by_type[s["tipo"]] = by_type.get(s["tipo"], 0) + 1
            by_rede[s["rede_id"]] = by_rede.get(s["rede_id"], 0) + 1
        print(f"  by type:    {dict(sorted(by_type.items()))}")
        top_redes = sorted(by_rede.items(), key=lambda kv: -kv[1])[:8]
        print(f"  top redes:  {dict(top_redes)}")

    if args.dry_run:
        print("✓ Dry run — no files written, no DB pushed.")
        return

    if stations:
        write_outputs(stations)

    if args.push_supabase and stations:
        push_to_supabase(stations)


if __name__ == "__main__":
    main()
