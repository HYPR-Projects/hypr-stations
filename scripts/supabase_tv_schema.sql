-- HYPR Station — TV Map Supabase Schema
-- Region: sa-east-1 (São Paulo)
--
-- Three tables power the TV map's editable data layer:
--   tv_redes:       canonical network list (Globo, SBT, Record…)
--   tv_afiliacao:   praça × rede × emissora mapping (curadoria HYPR)
--   tv_seac_mensal: TV paga penetration by município × operadora × tech
--
-- Station/contour geometric data stays in /public/assets/tv/*.json
-- (served via CDN, immutable between monthly data refreshes). Only
-- editorial/volatile data lives in Supabase.
--
-- Run this file via Supabase SQL editor OR:
--   psql "$SUPABASE_DB_URL" -f scripts/supabase_tv_schema.sql
--
-- Idempotent: re-running is safe (uses IF NOT EXISTS).

-- ─── Extensions ─────────────────────────────────────────────────────
create extension if not exists pgcrypto;

-- ─── tv_redes ───────────────────────────────────────────────────────
-- Canonical network list. Primary key is a short slug used in JSON
-- payloads and UI lookups. `order_hint` controls legend/filter ordering.
create table if not exists public.tv_redes (
  id            text primary key,
  nome          text not null,
  nome_curto    text,
  cor_hex       text check (cor_hex ~ '^#[0-9a-fA-F]{6}$'),
  tipo          text not null default 'comercial'
                  check (tipo in ('comercial', 'publica', 'educativa', 'religiosa', 'legislativa')),
  order_hint    smallint not null default 100,
  ativa         boolean not null default true,
  site_oficial  text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.tv_redes is
  'Canonical list of Brazilian TV networks. Slugs match TV_NETWORK_COLORS keys in src/lib/constants.ts.';

-- Seed the canonical networks. Safe to re-run — upsert via on conflict.
insert into public.tv_redes (id, nome, nome_curto, cor_hex, tipo, order_hint, site_oficial) values
  ('globo',        'TV Globo',                'Globo',      '#4286f4', 'comercial',   10, 'https://globoplay.globo.com'),
  ('sbt',          'SBT',                     'SBT',        '#e05050', 'comercial',   20, 'https://www.sbt.com.br'),
  ('record',       'Record TV',               'Record',     '#d4c74a', 'comercial',   30, 'https://recordtv.r7.com'),
  ('band',         'Band',                    'Band',       '#9b6fc0', 'comercial',   40, 'https://www.band.uol.com.br'),
  ('redetv',       'RedeTV!',                 'RedeTV!',    '#3aab8c', 'comercial',   50, 'https://www.redetv.uol.com.br'),
  ('cultura',      'TV Cultura',              'Cultura',    '#e07050', 'educativa',   60, 'https://tvcultura.com.br'),
  ('tvbrasil',     'TV Brasil',               'TV Brasil',  '#5ba3e6', 'publica',     70, 'https://tvbrasil.ebc.com.br'),
  ('rit',          'Rede Vida',               'Rede Vida',  '#c58fbf', 'religiosa',   80, 'https://www.redevida.com.br'),
  ('gazeta',       'TV Gazeta',               'Gazeta',     '#aa8f5e', 'comercial',   90, 'https://www.tvgazeta.com.br'),
  ('cancao',       'Canção Nova',             'Canção Nova','#7fa87f', 'religiosa',  100, 'https://cancaonova.com'),
  ('independente', 'Emissora Independente',   'Indep.',     '#8a8580', 'comercial',  900, null),
  ('outras',       'Outras Redes',            'Outras',     '#7a6e64', 'comercial', 1000, null)
on conflict (id) do update set
  nome        = excluded.nome,
  nome_curto  = excluded.nome_curto,
  cor_hex     = excluded.cor_hex,
  tipo        = excluded.tipo,
  order_hint  = excluded.order_hint,
  updated_at  = now();


-- ─── tv_afiliacao ───────────────────────────────────────────────────
-- Each row represents "emissora X (entidade jurídica) in município Y
-- operates as an affiliate of rede Z". A station is unique by
-- (entidade + município + rede). The Anatel Mosaico CNPJ/licença_id
-- could be stored here too once the ETL supplies it.
create table if not exists public.tv_afiliacao (
  id                uuid primary key default gen_random_uuid(),
  rede_id           text not null references public.tv_redes(id) on update cascade,
  entidade_cnpj     text,
  entidade_nome     text not null,
  nome_fantasia     text not null,
  municipio         text not null,
  uf                char(2) not null,
  canal_fisico      smallint,
  canal_virtual     text,
  erp_kw            numeric(10,2),
  altura_antena     numeric(8,2),
  lat               numeric(10,7),
  lng               numeric(10,7),
  anatel_id         text,                      -- "Spectrum-E" ID, when available
  licenca_status    text default 'Licenciada',
  observacao        text,
  ativo             boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  -- Defensive: prevent accidental duplicates when an ETL re-runs
  unique (entidade_nome, municipio, uf, canal_virtual)
);

create index if not exists idx_tv_afiliacao_rede on public.tv_afiliacao (rede_id);
create index if not exists idx_tv_afiliacao_uf   on public.tv_afiliacao (uf);
create index if not exists idx_tv_afiliacao_mun  on public.tv_afiliacao (municipio);

comment on table public.tv_afiliacao is
  'Curated affiliate mapping: each TV generator station tied to its network. '
  'Editable via Supabase dashboard; drives /tv network coloring and lookups.';


-- ─── tv_seac_mensal ─────────────────────────────────────────────────
-- Anatel publishes SeAC (TV por Assinatura) access counts monthly per
-- município × prestadora × tecnologia. This table stores the canonical
-- time series. Marco 3 uses it for the audience choropleth (penetração
-- TV paga, operadora dominante, cord-cutter detection).
--
-- Tecnologia values we'll see in the source: DTH, CABO, IPTV, MMDS, OUTRAS.
-- Operadora: normalize to canonical names (Sky, Claro, Oi, Vivo, outros).
create table if not exists public.tv_seac_mensal (
  id                uuid primary key default gen_random_uuid(),
  ibge_municipio    integer not null,          -- 7-digit IBGE code
  municipio         text not null,
  uf                char(2) not null,
  operadora         text not null,             -- "Sky", "Claro", "Oi", "Vivo", "Outros"
  tecnologia        text not null
                      check (tecnologia in ('DTH', 'CABO', 'IPTV', 'MMDS', 'OUTRAS')),
  referencia_mes    date not null,             -- first day of reference month
  acessos           integer not null check (acessos >= 0),
  domicilios        integer,                   -- IBGE denominator for density calc
  densidade         numeric(6,3),              -- acessos / domicilios * 100
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (ibge_municipio, operadora, tecnologia, referencia_mes)
);

create index if not exists idx_tv_seac_mes      on public.tv_seac_mensal (referencia_mes desc);
create index if not exists idx_tv_seac_mun      on public.tv_seac_mensal (ibge_municipio);
create index if not exists idx_tv_seac_mun_mes  on public.tv_seac_mensal (ibge_municipio, referencia_mes desc);
create index if not exists idx_tv_seac_uf_mes   on public.tv_seac_mensal (uf, referencia_mes desc);

comment on table public.tv_seac_mensal is
  'Monthly TV por Assinatura (SeAC) access counts from Anatel "Meu Município". '
  'One row per município × operadora × tecnologia × mês. '
  'Loaded by scripts/etl_anatel_seac.py (future).';


-- ─── Updated-at triggers ────────────────────────────────────────────
-- Keep updated_at honest so we can tell when a row last changed without
-- relying on the ETL remembering to set it.
create or replace function public.tv_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_tv_redes_updated_at on public.tv_redes;
create trigger trg_tv_redes_updated_at
  before update on public.tv_redes
  for each row execute function public.tv_touch_updated_at();

drop trigger if exists trg_tv_afiliacao_updated_at on public.tv_afiliacao;
create trigger trg_tv_afiliacao_updated_at
  before update on public.tv_afiliacao
  for each row execute function public.tv_touch_updated_at();

drop trigger if exists trg_tv_seac_updated_at on public.tv_seac_mensal;
create trigger trg_tv_seac_updated_at
  before update on public.tv_seac_mensal
  for each row execute function public.tv_touch_updated_at();


-- ─── Row-Level Security ─────────────────────────────────────────────
-- /tv is a public page. Anon users read via the anon key. Writes require
-- service role (used only by the ETL / admin dashboard).
alter table public.tv_redes        enable row level security;
alter table public.tv_afiliacao    enable row level security;
alter table public.tv_seac_mensal  enable row level security;

-- Drop-then-create so re-runs don't accumulate duplicate policies.
drop policy if exists "tv_redes read anon"       on public.tv_redes;
drop policy if exists "tv_afiliacao read anon"   on public.tv_afiliacao;
drop policy if exists "tv_seac_mensal read anon" on public.tv_seac_mensal;

create policy "tv_redes read anon"
  on public.tv_redes for select to anon using (true);

create policy "tv_afiliacao read anon"
  on public.tv_afiliacao for select to anon using (ativo);

create policy "tv_seac_mensal read anon"
  on public.tv_seac_mensal for select to anon using (true);


-- ─── Helper views ───────────────────────────────────────────────────
-- Latest SeAC month available — convenient for the UI's "data atualizada" badge.
create or replace view public.v_tv_seac_ultimo_mes as
  select
    max(referencia_mes) as referencia_mes,
    count(distinct ibge_municipio) as municipios_cobertos,
    sum(acessos) as total_acessos
  from public.tv_seac_mensal
  where referencia_mes = (select max(referencia_mes) from public.tv_seac_mensal);

-- Affiliate count per rede — fuels the legend "Globo — 47 emissoras".
create or replace view public.v_tv_afiliacao_por_rede as
  select
    r.id          as rede_id,
    r.nome        as rede_nome,
    r.cor_hex     as cor_hex,
    r.order_hint,
    count(a.id)   as qtd_emissoras,
    count(distinct a.uf)  as qtd_ufs
  from public.tv_redes r
  left join public.tv_afiliacao a on a.rede_id = r.id and a.ativo
  group by r.id, r.nome, r.cor_hex, r.order_hint
  order by r.order_hint;


-- ─── Done ───────────────────────────────────────────────────────────
-- Seed counts sanity check (non-blocking, just informational):
do $$
declare
  redes_count int;
begin
  select count(*) into redes_count from public.tv_redes;
  raise notice 'tv_redes has % rows', redes_count;
end $$;
