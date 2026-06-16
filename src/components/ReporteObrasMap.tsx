import React, { useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { RD_CENTER, RD_DEFAULT_ZOOM } from '../data/provinciasRD';
import type { ObraUbicacionGps } from '../types/database';

const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

const ESTADO_COLORS: Record<string, string> = {
  ACTIVA: '#4361EE',
  INAUGURADA: '#3A86FF',
  TERMINADA: '#22C55E',
  DETENIDA: '#FB8500',
  PRELIMINARES: '#8338EC',
  'INTERVENIDA MANTENIMIENTO': '#FF006E',
  'NO ESPECIFICADO': '#94A3B8',
};

function parseCoord(value: string | null | undefined): number | null {
  if (value == null || String(value).trim() === '') return null;
  const n = parseFloat(String(value).trim());
  return Number.isFinite(n) ? n : null;
}

export function parseGpsCoords(
  latitud: string | null | undefined,
  longitud: string | null | undefined,
): [number, number] | null {
  const lat = parseCoord(latitud);
  const lng = parseCoord(longitud);
  if (lat == null || lng == null) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return [lat, lng];
}

function getEstadoColor(estado: string): string {
  return ESTADO_COLORS[estado.toUpperCase()] || '#757575';
}

interface ReporteObrasMapProps {
  obras: ObraUbicacionGps[];
  height?: string;
}

function MapBounds({ coords }: { coords: [number, number][] }) {
  const map = useMap();

  useEffect(() => {
    if (coords.length === 0) return;
    if (coords.length === 1) {
      map.setView(coords[0], 14);
      return;
    }
    const bounds = L.latLngBounds(coords);
    map.fitBounds(bounds.pad(0.15), { maxZoom: 12 });
  }, [map, coords]);

  return null;
}

const ReporteObrasMap: React.FC<ReporteObrasMapProps> = ({ obras = [], height = '320px' }) => {
  const markers = useMemo(() => {
    return obras
      .map((obra) => {
        const coords = parseGpsCoords(obra.latitud, obra.longitud);
        if (!coords) return null;
        return { ...obra, coords, color: getEstadoColor(obra.estado) };
      })
      .filter(Boolean) as (ObraUbicacionGps & { coords: [number, number]; color: string })[];
  }, [obras]);

  return (
    <div
      className="relative w-full rounded-xl border border-gray-200 shadow-lg overflow-hidden bg-white"
      style={{ minHeight: height, height }}
    >
      <MapContainer
        center={RD_CENTER}
        zoom={RD_DEFAULT_ZOOM}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
        zoomControl={true}
        dragging={true}
        doubleClickZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {markers.length > 0 && <MapBounds coords={markers.map((m) => m.coords)} />}
        {markers.map((obra) => (
          <CircleMarker
            key={obra.id}
            center={obra.coords}
            radius={7}
            pathOptions={{
              fillColor: obra.color,
              color: '#ffffff',
              weight: 1.5,
              opacity: 0.95,
              fillOpacity: 0.85,
            }}
          >
            <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
              <strong>{obra.nombre}</strong>
              {obra.provincia ? (
                <>
                  <br />
                  {obra.provincia}
                </>
              ) : null}
            </Tooltip>
            <Popup>
              <div className="text-left min-w-[160px]">
                <strong className="block text-gray-800 mb-1">{obra.nombre}</strong>
                {(obra.codigo || obra.id) && (
                  <span className="block text-xs text-gray-500 font-mono mb-1">
                    {obra.codigo || obra.id}
                  </span>
                )}
                <span className="block text-sm" style={{ color: obra.color }}>
                  {obra.estado}
                </span>
                {obra.provincia && (
                  <span className="block text-xs text-gray-600 mt-1">{obra.provincia}</span>
                )}
                <span className="block text-xs text-gray-400 mt-1">
                  {obra.coords[0].toFixed(5)}, {obra.coords[1].toFixed(5)}
                </span>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
      {markers.length === 0 && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-white/80 text-gray-600 text-sm text-center px-4 z-[1000]"
          style={{ pointerEvents: 'none' }}
        >
          <span>
            No hay obras con coordenadas GPS en el resultado filtrado.
          </span>
        </div>
      )}
    </div>
  );
};

export default ReporteObrasMap;
