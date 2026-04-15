import { useState, useCallback, useRef, useMemo } from 'react';
import maplibregl from 'maplibre-gl';
import type { Map as MLMap, GeoJSONSource } from 'maplibre-gl';
import MapContainer from '../shared/MapContainer';
import SelectionBar from '../shared/SelectionBar';
import RadioFilters from './RadioFilters';
import StationList from './StationList';
import { stations as allStations, type RadioStation } from './radioData';
import { RADIO_COLORS } from '../../lib/constants';
import {
  formatAudience,
  estimateRadioAudience,
  estimateRadioRadius,
  getRadioERP,
} from '../../lib/audience';

export default function RadioMap() {
  const [filtered, setFiltered] = useState<RadioStation[]>(allStations);
  const [cart, setCart] = useState<Set<number>>(new Set());
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const mapRef = useRef<MLMap | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);

  const buildGeoJSON = useCallback((data: RadioStation[]) => ({
    type: 'FeatureCollection' as const,
    features: data.filter(s => s.lat != null && s.lng != null && s.lat !== 0 && s.lng !== 0).map((s, i) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [s.lng, s.lat] },
      properties: { idx: i, tipo: s.tipo, _sid: s._sid },
    })),
  }), []);

  const onMapReady = useCallback((map: MLMap) => {
    mapRef.current = map;
    const geojson = buildGeoJSON(filtered);

    ['cluster-count', 'clusters', 'points-fm', 'points-om'].forEach(id => {
      if (map.getLayer(id)) map.removeLayer(id);
    });
    if (map.getSource('stations')) map.removeSource('stations');

    map.addSource('stations', {
      type: 'geojson', data: geojson, cluster: true, clusterMaxZoom: 12, clusterRadius: 50,
    });

    map.addLayer({
      id: 'clusters', type: 'circle', source: 'stations', filter: ['has', 'point_count'],
      paint: {
        'circle-color': RADIO_COLORS.fm,
        'circle-radius': ['step', ['get', 'point_count'], 14, 50, 20, 200, 26],
        'circle-opacity': 0.2,
        'circle-stroke-width': 0.5,
        'circle-stroke-color': RADIO_COLORS.fm,
        'circle-stroke-opacity': 0.4,
      },
    });

    map.addLayer({
      id: 'cluster-count', type: 'symbol', source: 'stations', filter: ['has', 'point_count'],
      layout: { 'text-field': '{point_count_abbreviated}', 'text-font': ['Noto Sans Regular'], 'text-size': 10 },
      paint: { 'text-color': RADIO_COLORS.fm },
    });

    map.addLayer({
      id: 'points-fm', type: 'circle', source: 'stations',
      filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'tipo'], 'FM']],
      paint: { 'circle-radius': 3.5, 'circle-color': RADIO_COLORS.fm, 'circle-stroke-width': 0.5, 'circle-stroke-color': RADIO_COLORS.fm, 'circle-opacity': 0.8 },
    });

    map.addLayer({
      id: 'points-om', type: 'circle', source: 'stations',
      filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'tipo'], 'OM']],
      paint: { 'circle-radius': 3.5, 'circle-color': RADIO_COLORS.am, 'circle-stroke-width': 0.5, 'circle-stroke-color': RADIO_COLORS.am, 'circle-opacity': 0.8 },
    });

    map.on('click', 'clusters', (e) => {
      const features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] });
      if (!features.length) return;
      const src = map.getSource('stations') as GeoJSONSource;
      src.getClusterExpansionZoom(features[0].properties?.cluster_id).then((zoom: number) => {
        map.easeTo({ center: (features[0].geometry as GeoJSON.Point).coordinates as [number, number], zoom });
      });
    });

    ['points-fm', 'points-om'].forEach(layerId => {
      map.on('click', layerId, (e) => {
        if (!e.features?.length) return;
        const idx = e.features[0].properties?.idx;
        if (idx != null) {
          setActiveIdx(idx);
          openPopup(idx, (e.features[0].geometry as GeoJSON.Point).coordinates as [number, number]);
        }
      });
    });

    ['clusters', 'points-fm', 'points-om'].forEach(id => {
      map.on('mouseenter', id, () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', id, () => { map.getCanvas().style.cursor = ''; });
    });
  }, [filtered, buildGeoJSON]);

  const openPopup = useCallback((idx: number, coordinates: [number, number]) => {
    const s = filtered[idx];
    if (!s || !mapRef.current) return;
    if (popupRef.current) popupRef.current.remove();

    const erp = getRadioERP(s.erp, s.classe);
    const radius = Math.round(estimateRadioRadius(erp, s.tipo));
    const aud = estimateRadioAudience(s.erp, s.tipo, s.classe, s.uf);
    const unit = s.tipo === 'FM' ? 'MHz' : 'kHz';
    const color = s.tipo === 'FM' ? RADIO_COLORS.fm : RADIO_COLORS.am;

    const L = 'font-size:9px;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-muted);margin-bottom:1px';
    const V = 'font-size:11px;font-weight:500;color:var(--text-primary)';
    const C = 'background:var(--bg-surface2);border-radius:6px;padding:5px 8px';

    const html = `<div style="padding:12px 14px;min-width:220px;max-width:280px;font-family:Urbanist,sans-serif">
      <div style="display:flex;align-items:baseline;gap:6px;margin-bottom:10px">
        <span style="font-weight:700;font-size:15px;color:${color}">${s.frequencia}</span>
        <span style="font-size:10px;color:var(--text-muted)">${unit}</span>
        <span style="font-size:10px;color:var(--text-muted);margin-left:auto">${s.tipo}</span>
      </div>
      <div style="font-size:11px;font-weight:600;color:var(--text-primary);margin-bottom:2px">${s.municipio} — ${s.uf}</div>
      <div style="font-size:10px;color:var(--text-muted);margin-bottom:10px">${s._fantasy || (s.entidade ? s.entidade.toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase()).substring(0, 40) : '—')}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px">
        <div style="${C}"><div style="${L}">Classe</div><div style="${V}">${s.classe || '—'}</div></div>
        <div style="${C}"><div style="${L}">ERP</div><div style="${V}">${erp.toLocaleString('pt-BR')} W · ~${radius}km</div></div>
        <div style="${C}"><div style="${L}">Finalidade</div><div style="${V}">${s.finalidade || '—'}</div></div>
        <div style="${C}"><div style="${L}">Caráter</div><div style="${V}">${s.carater || '—'}</div></div>
      </div>
      ${aud > 0 ? `<div style="${C};margin-top:6px;text-align:center">
        <div style="${L}">Audiência estimada</div>
        <div style="font-weight:700;font-size:14px;color:var(--accent);margin-top:1px">${formatAudience(aud)} devices</div>
      </div>` : ''}
      <div style="font-size:9px;color:var(--text-muted);text-align:center;margin-top:8px;opacity:0.7">
        alcance × densidade × penetração × campanha 30d
      </div>
    </div>`;

    const popup = new maplibregl.Popup({ closeButton: true, closeOnClick: true, maxWidth: '300px', offset: 8 })
      .setLngLat(coordinates).setHTML(html).addTo(mapRef.current!);
    popupRef.current = popup;
    popup.on('close', () => { popupRef.current = null; });
  }, [filtered]);

  const onFilter = useCallback((newFiltered: RadioStation[]) => {
    setFiltered(newFiltered);
    if (mapRef.current) {
      const src = mapRef.current.getSource('stations') as GeoJSONSource | undefined;
      if (src) src.setData(buildGeoJSON(newFiltered));
    }
  }, [buildGeoJSON]);

  const focusStation = useCallback((idx: number) => {
    const s = filtered[idx];
    if (!s || !s.lat || !s.lng || !mapRef.current) return;
    mapRef.current.flyTo({ center: [s.lng, s.lat], zoom: Math.max(mapRef.current.getZoom(), 12), speed: 1.4 });
    setActiveIdx(idx);
    setTimeout(() => openPopup(idx, [s.lng, s.lat]), 400);
  }, [filtered, openPopup]);

  const toggleCart = useCallback((sid: number) => {
    setCart(prev => { const n = new Set(prev); n.has(sid) ? n.delete(sid) : n.add(sid); return n; });
  }, []);

  const clearCart = useCallback(() => setCart(new Set()), []);
  const selectAllFiltered = useCallback(() => {
    setCart(prev => { const n = new Set(prev); filtered.forEach(s => n.add(s._sid)); return n; });
  }, [filtered]);

  const selectionSummary = useMemo(() => {
    if (cart.size === 0) return null;
    const sel = [...cart].map(sid => allStations.find(s => s._sid === sid)).filter(Boolean) as RadioStation[];
    const aud = sel.reduce((s, e) => s + estimateRadioAudience(e.erp, e.tipo, e.classe, e.uf), 0);
    const ufs = [...new Set(sel.map(e => e.uf))];
    return (<span><strong className="text-[var(--text-primary)] font-semibold">{formatAudience(aud)}</strong> devices · {ufs.length} UF{ufs.length > 1 ? 's' : ''}</span>);
  }, [cart]);

  const fmCount = useMemo(() => filtered.filter(s => s.tipo === 'FM').length, [filtered]);
  const omCount = useMemo(() => filtered.length - fmCount, [filtered, fmCount]);

  return (
    <>
      <div className="flex flex-1 h-full min-h-0 overflow-hidden">
        <aside aria-label="Filtros e lista de estações"
               className="hidden md:flex w-[260px] flex-col bg-[var(--bg-surface)] border-r border-[var(--border)] shrink-0 overflow-hidden">
          <RadioFilters stations={allStations} onFilter={onFilter} />
          <StationList stations={filtered} cart={cart} activeIdx={activeIdx} onFocus={focusStation}
                       onToggleCart={toggleCart} onClearCart={clearCart} onSelectAll={selectAllFiltered} totalCount={filtered.length} />
        </aside>

        <MapContainer onMapReady={onMapReady}>
          <div className="absolute bottom-4 right-4 z-10 rounded-lg border px-3 py-2.5 pointer-events-none
                          bg-[var(--bg-surface)] border-[var(--border)]" aria-label="Legenda do mapa">
            <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-primary)] mb-1">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: RADIO_COLORS.fm }} aria-hidden="true" />
              FM — {fmCount.toLocaleString('pt-BR')}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-primary)]">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: RADIO_COLORS.am }} aria-hidden="true" />
              AM/OM — {omCount.toLocaleString('pt-BR')}
            </div>
            <div className="text-[9px] text-[var(--text-muted)] mt-1.5 opacity-70">Anatel/SRD · 2026</div>
          </div>
        </MapContainer>
      </div>

      <SelectionBar count={cart.size} summary={selectionSummary} onCheckout={() => {}} canDownload={false} />
    </>
  );
}
