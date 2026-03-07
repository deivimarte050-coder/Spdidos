import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-routing-machine';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';
import { RESTAURANTS, SPM_CENTER } from '../constants';
import { OrderService } from '../services/OrderService';
import { AdminService } from '../services/AdminService';
import { Order, Restaurant } from '../types';

// Fix for default marker icons in Leaflet using CDN to avoid TS/Vite import issues
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

const UserLocationMarker = () => {
  const [position, setPosition] = useState<L.LatLng | null>(null);
  const map = useMap();

  useEffect(() => {
    const onLocationFound = (e: any) => {
      setPosition(e.latlng);
      map.flyTo(e.latlng, map.getZoom());
    };
    
    map.locate().on("locationfound", onLocationFound);
    
    return () => {
      try {
        map.stopLocate();
        map.off("locationfound", onLocationFound);
      } catch (e) {
        // Ignore cleanup errors
      }
    };
  }, [map]);

  return position === null ? null : (
    <>
      <Marker position={position} />
      <Circle center={position} radius={100} pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.1 }} />
    </>
  );
};

const Routing = ({ from, to }: { from: [number, number], to: [number, number] }) => {
  const map = useMap();
  const routingRef = useRef<any>(null);

  useEffect(() => {
    if (!map || !from || !to) return;

    // Check if L.Routing is available
    if (!(L as any).Routing || !(L as any).Routing.control) {
      console.warn("Leaflet Routing Machine not loaded yet");
      return;
    }

    try {
      routingRef.current = (L as any).Routing.control({
        waypoints: [
          L.latLng(from[0], from[1]),
          L.latLng(to[0], to[1])
        ],
        routeWhileDragging: false,
        addWaypoints: false,
        draggableWaypoints: false,
        fitSelectedRoutes: true,
        show: false,
        createMarker: () => null, // Don't create extra markers
        lineOptions: {
          styles: [{ color: '#3b82f6', weight: 6, opacity: 0.8 }],
          extendToWaypoints: true,
          missingRouteTolerance: 0
        }
      }).addTo(map);
    } catch (e) {
      console.warn("Routing init error:", e);
    }

    return () => {
      if (routingRef.current) {
        const control = routingRef.current;
        try {
          if (map && control && control.getPlan() && control.getPlan()._map) {
            map.removeControl(control);
          } else if (map && control && (control as any)._map) {
            map.removeControl(control);
          }
        } catch (e) {
          // Ignore cleanup errors as they often happen during unmount
        } finally {
          routingRef.current = null;
        }
      }
    };
  }, [map]);

  // Update waypoints when from/to changes
  useEffect(() => {
    if (routingRef.current && from && to) {
      try {
        routingRef.current.setWaypoints([
          L.latLng(from[0], from[1]),
          L.latLng(to[0], to[1])
        ]);
      } catch (e) {
        // Ignore update errors
      }
    }
  }, [from, to]);

  return null;
};

const DeliveryMarker = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  
  useEffect(() => {
    return OrderService.subscribe(setOrders);
  }, []);

  const activeOrder = orders.find(o => (o.status === 'picked_up' || o.status === 'delivered') && o.clientLocation && o.businessLocation);
  
  if (!activeOrder) return null;

  return (
    <>
      {/* Route Line */}
      {activeOrder.deliveryLocation && activeOrder.clientLocation && (
        <Routing from={activeOrder.deliveryLocation} to={activeOrder.clientLocation} />
      )}

      {/* Delivery Rider */}
      {activeOrder.deliveryLocation && (
        <Marker 
          position={activeOrder.deliveryLocation}
          icon={L.icon({
            iconUrl: 'https://cdn-icons-png.flaticon.com/512/2972/2972185.png',
            iconSize: [40, 40],
            iconAnchor: [20, 40],
          })}
        />
      )}

      {/* Client Location */}
      {activeOrder.clientLocation && (
        <Marker 
          position={activeOrder.clientLocation}
          icon={L.icon({
            iconUrl: 'https://cdn-icons-png.flaticon.com/512/1216/1216844.png',
            iconSize: [35, 35],
            iconAnchor: [17, 35],
          })}
        >
          <Popup>Lugar de entrega (Cliente)</Popup>
        </Marker>
      )}

      {/* Business Location */}
      {activeOrder.businessLocation && (
        <Marker 
          position={activeOrder.businessLocation}
          icon={L.icon({
            iconUrl: 'https://cdn-icons-png.flaticon.com/512/610/610120.png',
            iconSize: [35, 35],
            iconAnchor: [17, 35],
          })}
        >
          <Popup>Restaurante</Popup>
        </Marker>
      )}
    </>
  );
};

interface MapProps {
  showRestaurants?: boolean;
  trackingMode?: boolean;
}

const FollowRider = () => {
  const map = useMap();
  const [orders, setOrders] = useState<Order[]>([]);
  
  useEffect(() => {
    return OrderService.subscribe(setOrders);
  }, []);

  const activeOrder = orders.find(o => (o.status === 'picked_up' || o.status === 'delivered') && o.deliveryLocation);
  
  useEffect(() => {
    if (activeOrder?.deliveryLocation) {
      map.panTo(activeOrder.deliveryLocation, { animate: true });
    }
  }, [activeOrder?.deliveryLocation, map]);

  return null;
};

const Map: React.FC<MapProps> = ({ showRestaurants = true, trackingMode = false }) => {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);

  useEffect(() => {
    return AdminService.subscribe((data) => {
      setRestaurants(data.restaurants);
    });
  }, []);

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden shadow-inner border border-black/5">
      <MapContainer 
        center={SPM_CENTER} 
        zoom={16} 
        scrollWheelZoom={true}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {!trackingMode && <UserLocationMarker />}
        {trackingMode && <DeliveryMarker />}
        {trackingMode && <FollowRider />}

        {showRestaurants && restaurants.map(restaurant => (
          <Marker key={restaurant.id} position={restaurant.location}>
            <Popup>
              <div className="p-1">
                <h3 className="font-bold text-sm">{restaurant.name}</h3>
                <p className="text-xs text-gray-500">{restaurant.cuisine}</p>
                <p className="text-xs font-semibold text-emerald-600 mt-1">{restaurant.deliveryTime}</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default Map;
