import React, { useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { PROVINCIAS_RD_CENTROIDES, RD_CENTER, RD_DEFAULT_ZOOM } from '../data/provinciasRD';

// Iconos por defecto de Leaflet (evitar 404 en bundler)
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

const provinciasKeys = Object.keys(PROVINCIAS_RD_CENTROIDES);
const getCoordsForProvincia = (nombre: string): [number, number] | undefined => {
  const n = String(nombre || '').trim();
  if (!n) return undefined;
  if (PROVINCIAS_RD_CENTROIDES[n]) return PROVINCIAS_RD_CENTROIDES[n];
  const lower = n.toLowerCase();
  const key = provinciasKeys.find((k) => k.toLowerCase() === lower);
  return key ? PROVINCIAS_RD_CENTROIDES[key] : undefined;
};

export interface ObraPorProvincia {
  provincia: string;
  cantidad: number;
}

interface DashboardMapProps {
  obrasPorProvincia: ObraPorProvincia[];
  onProvinciaClick?: (provincia: string) => void;
  height?: string;
}

function MapBounds({ obrasPorProvincia }: { obrasPorProvincia: ObraPorProvincia[] }) {
  const map = useMap();
  const coords = useMemo(() => {
    const positions: [number, number][] = [];
    obrasPorProvincia.forEach(({ provincia }) => {
      const c = getCoordsForProvincia(provincia);
      if (c) positions.push(c);
    });
    return positions;
  }, [obrasPorProvincia]);

  useEffect(() => {
    if (coords.length < 2) return;
    const bounds = L.latLngBounds(coords);
    map.fitBounds(bounds.pad(0.2), { maxZoom: 10 });
  }, [map, coords]);

  return null;
}

const DashboardMap: React.FC<DashboardMapProps> = ({
  obrasPorProvincia = [],
  onProvinciaClick,
  height = '420px',
}) => {
  const maxCantidad = useMemo(() => {
    if (obrasPorProvincia.length === 0) return 1;
    return Math.max(...obrasPorProvincia.map((p) => p.cantidad), 1);
  }, [obrasPorProvincia]);

  const markers = useMemo(() => {
    return obrasPorProvincia
      .filter((p) => p && p.provincia && p.cantidad > 0)
      .map((item) => {
        const coords = getCoordsForProvincia(item.provincia);
        if (!coords) return null;
        return { ...item, coords };
      })
      .filter(Boolean) as (ObraPorProvincia & { coords: [number, number] })[];
  }, [obrasPorProvincia]);

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
        {markers.length > 0 && <MapBounds obrasPorProvincia={obrasPorProvincia} />}
        {markers.map((item) => {
          const radius = Math.max(10, Math.min(28, (item.cantidad / maxCantidad) * 22 + 10));
          return (
            <CircleMarker
              key={item.provincia}
              center={item.coords}
              radius={radius}
              pathOptions={{
                fillColor: '#42A5F5',
                color: '#1976D2',
                weight: 2,
                opacity: 0.9,
                fillOpacity: 0.65,
              }}
              eventHandlers={{
                click: () => onProvinciaClick?.(item.provincia),
              }}
            >
              <Tooltip direction="top" offset={[0, -radius]} opacity={0.95} permanent={false}>
                <strong>{item.provincia}</strong>
                <br />
                {item.cantidad} {item.cantidad === 1 ? 'obra' : 'obras'}
              </Tooltip>
              <Popup>
                <div className="text-center min-w-[140px]">
                  <strong className="block text-gray-800 mb-1">{item.provincia}</strong>
                  <span className="text-[#42A5F5] font-semibold">
                    {item.cantidad} {item.cantidad === 1 ? 'obra' : 'obras'}
                  </span>
                  {onProvinciaClick && (
                    <button
                      type="button"
                      className="mt-2 block w-full py-1 px-2 text-xs bg-[#42A5F5] text-white rounded hover:bg-[#1976D2]"
                      onClick={() => onProvinciaClick(item.provincia)}
                    >
                      Ver en lista →
                    </button>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
      {markers.length === 0 && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-white/80 text-gray-600 text-sm text-center px-4 z-[1000]"
          style={{ pointerEvents: 'none' }}
        >
          <span>
            No hay obras con provincia asignada. Asigna provincia a las obras para ver el mapa.
          </span>
        </div>
      )}
    </div>
  );
};

export default DashboardMap;
