import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix para los iconos de Leaflet en React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import iconRetina from 'leaflet/dist/images/marker-icon-2x.png';

// Configurar iconos por defecto de Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: icon,
  iconRetinaUrl: iconRetina,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface ObraMapProps {
  latitud: string | null | undefined;
  longitud: string | null | undefined;
  nombre?: string;
  height?: string;
}

// Componente para ajustar el zoom cuando cambian las coordenadas y actualizar el tamaño
function MapUpdater({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  
  useEffect(() => {
    map.setView([lat, lng], map.getZoom());
    // Asegurar que el mapa se renderice correctamente después de que el diálogo se abre
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 100);
    
    return () => clearTimeout(timer);
  }, [lat, lng, map]);
  
  // También invalidar el tamaño cuando el componente se monta
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 300);
    
    return () => clearTimeout(timer);
  }, [map]);
  
  return null;
}

const ObraMap: React.FC<ObraMapProps> = ({ 
  latitud, 
  longitud, 
  nombre = 'Ubicación de la obra',
  height = '400px'
}) => {
  // Convertir coordenadas a números
  const lat = latitud ? parseFloat(latitud) : null;
  const lng = longitud ? parseFloat(longitud) : null;

  // Si no hay coordenadas válidas, mostrar mensaje
  if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
    return (
      <div 
        className="flex items-center justify-center rounded border border-gray-300 bg-gray-100"
        style={{ height }}
      >
        <p className="text-sm text-gray-600">
          No hay coordenadas disponibles para esta obra
        </p>
      </div>
    );
  }

  // Coordenadas por defecto (República Dominicana)
  const defaultCenter: [number, number] = [18.4861, -69.9312];
  const center: [number, number] = [lat, lng];

  return (
    <div 
      className="w-full rounded border border-gray-300 shadow-sm relative overflow-hidden"
      style={{ height }}
    >
      <MapContainer
        center={center}
        zoom={15}
        style={{ height: '100%', width: '100%', zIndex: 0 }}
        scrollWheelZoom={true}
        zoomControl={true}
        dragging={true}
        touchZoom={true}
        doubleClickZoom={true}
        boxZoom={true}
        keyboard={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapUpdater lat={lat} lng={lng} />
        <Marker position={center}>
          <Popup>
            <div style={{ margin: 0, padding: 0 }}>
              <strong style={{ display: 'block', marginBottom: '4px' }}>{nombre}</strong>
              <span style={{ fontSize: '12px', color: '#666' }}>
                Lat: {lat.toFixed(6)}, Lng: {lng.toFixed(6)}
              </span>
            </div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
};

export default ObraMap;

