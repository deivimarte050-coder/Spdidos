import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { MapPin } from 'lucide-react';
import { SPM_CENTER } from '../constants';

const markerIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const isValidCoords = (coords: unknown): coords is [number, number] => {
  return (
    Array.isArray(coords)
    && coords.length === 2
    && Number.isFinite(coords[0])
    && Number.isFinite(coords[1])
  );
};

const RecenterMap: React.FC<{ center: [number, number] }> = ({ center }) => {
  const map = useMap();

  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);

  return null;
};

const ClickCapture: React.FC<{ editable: boolean; onSelect: (coords: [number, number]) => void }> = ({ editable, onSelect }) => {
  useMapEvents({
    click(event) {
      if (!editable) return;
      onSelect([event.latlng.lat, event.latlng.lng]);
    },
  });

  return null;
};

interface BusinessLocationPickerProps {
  value?: [number, number] | null;
  onChange?: (coords: [number, number]) => void;
  editable?: boolean;
}

const BusinessLocationPicker: React.FC<BusinessLocationPickerProps> = ({
  value,
  onChange,
  editable = true,
}) => {
  const initialCenter = useMemo<[number, number]>(() => {
    if (isValidCoords(value)) return value;
    return SPM_CENTER;
  }, [value]);

  const [position, setPosition] = useState<[number, number]>(initialCenter);

  useEffect(() => {
    if (isValidCoords(value)) {
      setPosition(value);
    }
  }, [value]);

  const handleChange = (coords: [number, number]) => {
    setPosition(coords);
    onChange?.(coords);
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Tu navegador no soporta geolocalización.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (positionData) => {
        handleChange([positionData.coords.latitude, positionData.coords.longitude]);
      },
      () => {
        alert('No se pudo obtener tu ubicación actual. Revisa permisos de ubicación.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="space-y-2">
      <div className="w-full h-64 rounded-2xl overflow-hidden border border-gray-200">
        <MapContainer center={position} zoom={16} className="h-full w-full" scrollWheelZoom>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <RecenterMap center={position} />
          <ClickCapture editable={editable} onSelect={handleChange} />

          <Marker
            position={position}
            icon={markerIcon}
            draggable={editable}
            eventHandlers={{
              dragend: (event) => {
                const marker = event.target;
                const nextPos = marker.getLatLng();
                handleChange([nextPos.lat, nextPos.lng]);
              },
            }}
          >
            <Popup>
              Ubicación del negocio<br />
              {position[0].toFixed(6)}, {position[1].toFixed(6)}
            </Popup>
          </Marker>
        </MapContainer>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-gray-600">
        <span className="inline-flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5" />
          Lat: {position[0].toFixed(6)} · Lng: {position[1].toFixed(6)}
        </span>
        {editable && (
          <button
            type="button"
            onClick={useCurrentLocation}
            className="px-3 py-1.5 rounded-full bg-primary/10 text-primary font-bold hover:bg-primary/20"
          >
            Usar mi ubicación actual
          </button>
        )}
      </div>

      {editable && (
        <p className="text-[11px] text-gray-500">
          Toca el mapa o arrastra el pin para marcar la ubicación exacta del negocio.
        </p>
      )}
    </div>
  );
};

export default BusinessLocationPicker;
