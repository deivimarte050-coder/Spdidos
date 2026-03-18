import React, { useEffect, useMemo, useState, useRef } from 'react';
import { motion } from 'motion/react';
import { Package, MapPin, CheckCircle2, Navigation, Store, MessageCircle, Power, Search, ShieldAlert, LogOut, Clock, DollarSign, Map as MapIcon, ChevronRight } from 'lucide-react';
import FirebaseServiceV2 from '../services/FirebaseServiceV2';
import { soundService } from '../services/SoundService';
import { Order } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { LOGO_URL } from '../constants';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { SPM_CENTER } from '../constants';

// ─── Types ───────────────────────────────────────────────────────────────────
interface RouteStep { text: string; distance: number; type: string; }
interface RouteInfo { totalTime: number; totalDistance: number; steps: RouteStep[]; }

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmtDist = (m: number) => m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
const fmtTime = (s: number) => s >= 3600 ? `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m` : `${Math.ceil(s / 60)} min`;
const DELIVERY_PREP_STEPS = [
  { status: 'accepted', label: 'Aceptado' },
  { status: 'preparing', label: 'Preparando' },
  { status: 'ready', label: 'Listo' }
] as const;

const maneuverText = (type: string, modifier?: string): string => {
  const mod = modifier ? ` ${modifier === 'left' ? 'a la izquierda' : modifier === 'right' ? 'a la derecha' : modifier === 'straight' ? 'recto' : modifier}` : '';
  const m: Record<string, string> = {
    depart: 'Comienza el recorrido', arrive: 'Has llegado al destino',
    turn: `Gira${mod}`, 'new name': `Continúa${mod}`, continue: `Continúa${mod}`,
    merge: `Incorpora${mod}`, 'on ramp': 'Toma la incorporación',
    'off ramp': 'Sal por la salida', fork: `En el cruce, toma${mod}`,
    'end of road': `Al final, gira${mod}`, roundabout: 'En la rotonda, sigue',
    rotary: 'En la rotonda, sigue', notification: `Continúa${mod}`,
  };
  return m[type] || `Continúa${mod}`;
};

// ─── Turn arrow icon ─────────────────────────────────────────────────────────
const TurnArrow: React.FC<{ type: string; size?: number; color?: string }> = ({ type, size = 36, color = 'white' }) => {
  const t = (type || '').toLowerCase();
  if (t.includes('left') && (t.includes('sharp') || t.includes('uturn'))) return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" transform="scale(-1,1) translate(-24,0)"/></svg>
  );
  if (t.includes('slight') && t.includes('left')) return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><path d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6z" opacity="0.7"/><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" transform="rotate(-45,12,12) scale(0.6) translate(8,8)"/></svg>
  );
  if (t.includes('left')) return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
  );
  if (t.includes('right') && (t.includes('sharp') || t.includes('uturn'))) return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><path d="M4 11h12.17l-5.58-5.59L12 4l8 8-8 8-1.41-1.41L16.17 13H4v-2z" transform="scale(-1,1) translate(-24,0)"/></svg>
  );
  if (t.includes('slight') && t.includes('right')) return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z" opacity="0.7"/></svg>
  );
  if (t.includes('right')) return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><path d="M4 11h12.17l-5.58-5.59L12 4l8 8-8 8-1.41-1.41L16.17 13H4v-2z"/></svg>
  );
  if (t.includes('roundabout')) return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/></svg>
  );
  if (t.includes('destination') || t.includes('arrived')) return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
  );
  return <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/></svg>;
};

// ─── Auto-follow delivery person ──────────────────────────────────────────────
const MapFollower: React.FC<{ center: [number, number] }> = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom(), { animate: true, duration: 1 });
  }, [center[0], center[1]]);
  return null;
};

// ─── OSRM route polyline (reliable, no leaflet-routing-machine) ───────────────
const RoutePolylineLayer: React.FC<{
  from: [number, number];
  to: [number, number];
  navMode?: boolean;
  onRouteFound?: (info: RouteInfo) => void;
}> = ({ from, to, navMode = false, onRouteFound }) => {
  const map = useMap();
  const layersRef = useRef<L.Layer[]>([]);

  const clearLayers = () => {
    layersRef.current.forEach(l => { try { map.removeLayer(l); } catch {} });
    layersRef.current = [];
  };

  useEffect(() => {
    const color = navMode ? '#00d4ff' : '#4f46e5';
    const glow  = navMode ? '#0090b8' : '#6b21a8';
    const w = navMode ? 7 : 5;
    let cancelled = false;

    const draw = async () => {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson&steps=true`;
        const res = await fetch(url);
        const data = await res.json();
        if (cancelled || data.code !== 'Ok' || !data.routes?.[0]) throw new Error('no route');

        const route = data.routes[0];
        const coords: [number, number][] = route.geometry.coordinates.map(
          ([lng, lat]: number[]) => [lat, lng] as [number, number]
        );
        clearLayers();
        layersRef.current.push(
          L.polyline(coords, { color: glow, weight: w + 6, opacity: 0.18 }).addTo(map),
          L.polyline(coords, { color, weight: w, opacity: 1 }).addTo(map)
        );
        if (onRouteFound) {
          onRouteFound({
            totalTime: route.duration,
            totalDistance: route.distance,
            steps: (route.legs[0]?.steps || []).map((s: any) => ({
              text: maneuverText(s.maneuver?.type || 'continue', s.maneuver?.modifier),
              distance: s.distance,
              type: s.maneuver?.type || 'continue'
            }))
          });
        }
      } catch {
        if (cancelled) return;
        clearLayers();
        layersRef.current.push(
          L.polyline([from, to], { color, weight: w, opacity: 0.6, dashArray: '10,7' }).addTo(map)
        );
      }
    };

    draw();
    return () => { cancelled = true; clearLayers(); };
  }, [from[0], from[1], to[0], to[1]]);

  return null;
};

// ─── Card view map (light tiles, indigo route) ────────────────────────────────
const DeliveryTrackingMap: React.FC<{ deliveryLoc: [number, number]; clientLoc?: [number, number]; businessLoc?: [number, number] }> = ({ deliveryLoc, clientLoc, businessLoc }) => (
  <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm" style={{ height: 300 }}>
    <MapContainer center={deliveryLoc} zoom={16} className="h-full w-full" scrollWheelZoom={false} zoomControl={false}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="" />
      <MapFollower center={deliveryLoc} />
      {clientLoc && <RoutePolylineLayer from={deliveryLoc} to={clientLoc} />}
      <Marker position={deliveryLoc} icon={L.divIcon({
        className: '', iconSize: [38, 38], iconAnchor: [19, 38],
        html: `<div style="width:38px;height:38px;background:#4f46e5;border:3px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(79,70,229,.5)"><svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg></div>`
      })}><Popup>Tu ubicación</Popup></Marker>
      {clientLoc && (
        <Marker position={clientLoc} icon={L.divIcon({
          className: '', iconSize: [36, 44], iconAnchor: [18, 44],
          html: `<div style="display:flex;flex-direction:column;align-items:center"><div style="width:32px;height:32px;background:#dc2626;border:3px solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 8px rgba(220,38,38,.5)"></div></div>`
        })}><Popup>📦 Entrega aquí</Popup></Marker>
      )}
      {businessLoc && (
        <Marker position={businessLoc} icon={L.divIcon({
          className: '', iconSize: [36, 44], iconAnchor: [18, 44],
          html: `<div style="display:flex;flex-direction:column;align-items:center"><div style="width:32px;height:32px;background:#f59e0b;border:3px solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 8px rgba(245,158,11,.5)"></div></div>`
        })}><Popup>?? Negocio</Popup></Marker>
      )}
    </MapContainer>
  </div>
);

// ─── Full-screen navigation map (dark tiles, cyan route) ──────────────────────
const WazeNavMap: React.FC<{
  deliveryLoc: [number, number];
  clientLoc: [number, number];
  onRouteFound: (info: RouteInfo) => void;
}> = ({ deliveryLoc, clientLoc, onRouteFound }) => (
  <MapContainer center={deliveryLoc} zoom={17} className="h-full w-full" scrollWheelZoom={false} zoomControl={false}>
    <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution="" />
    <MapFollower center={deliveryLoc} />
    <RoutePolylineLayer from={deliveryLoc} to={clientLoc} navMode onRouteFound={onRouteFound} />
    {/* Navigation arrow */}
    <Marker position={deliveryLoc} icon={L.divIcon({
      className: '', iconSize: [40, 48], iconAnchor: [20, 24],
      html: `<svg width="40" height="48" viewBox="0 0 40 48" style="filter:drop-shadow(0 3px 10px rgba(0,212,255,.7))">
               <polygon points="20,2 38,44 20,34 2,44" fill="#00d4ff" stroke="white" stroke-width="2.5" stroke-linejoin="round"/>
             </svg>`
    })}><Popup>Tu posición</Popup></Marker>
    {/* Destination red pin */}
    <Marker position={clientLoc} icon={L.divIcon({
      className: '', iconSize: [36, 44], iconAnchor: [18, 44],
      html: `<div style="display:flex;flex-direction:column;align-items:center">
               <div style="width:32px;height:32px;background:#ef4444;border:3px solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 12px rgba(239,68,68,.7)"></div>
               <div style="width:4px;height:10px;background:#ef4444;border-radius:2px;margin-top:-2px"></div>
             </div>`
    })}><Popup>📦 Entrega aquí</Popup></Marker>
  </MapContainer>
);

const Radar = () => (
  <div className="relative flex items-center justify-center w-56 h-56 mx-auto">
    {[1, 2, 3].map(i => (
      <motion.div key={i} initial={{ scale: 0.5, opacity: 0.5 }} animate={{ scale: 2, opacity: 0 }}
        transition={{ duration: 2, repeat: Infinity, delay: i * 0.6, ease: 'easeOut' }}
        className="absolute w-full h-full border-2 border-emerald-500 rounded-full" />
    ))}
    <div className="relative z-10 bg-emerald-500 p-5 rounded-full shadow-lg shadow-emerald-500/30">
      <Search className="w-10 h-10 text-white animate-pulse" />
    </div>
  </div>
);

const DeliveryView: React.FC = () => {
  const { user, logout } = useAuth();
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [myOrder, setMyOrder] = useState<Order | null>(null);
  const [completedOrders, setCompletedOrders] = useState<Order[]>([]);
  const [cancelledOrders, setCancelledOrders] = useState<Order[]>([]);
  const [isAvailable, setIsAvailable] = useState(true);
  const [isNavigating, setIsNavigating] = useState(false);
  const [earningsNow, setEarningsNow] = useState(() => Date.now());
  const [showEarningsHistory, setShowEarningsHistory] = useState(false);
  const [earningsEntries, setEarningsEntries] = useState<Array<{ id: string; orderId?: string; amount?: number; deliveredAt?: string; dateKey?: string }>>([]);
  const [myLocation, setMyLocation] = useState<[number, number]>(SPM_CENTER);
  const [clientLiveLocation, setClientLiveLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const gpsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setEarningsNow(Date.now());
    }, 60_000);
    return () => clearInterval(timer);
  }, []);
  // Subscribe to available orders — sound is handled globally in App.tsx
  useEffect(() => {
    const unsub = FirebaseServiceV2.subscribeToDeliveryOrders((orders) => {
      const availableStatuses = new Set(['accepted', 'preparing', 'ready']);
      const available = orders.filter((o) => availableStatuses.has(o.status) && !o.deliveryId);
      const mine = orders.find(
        o => o.deliveryId === user?.id && ['accepted', 'preparing', 'ready', 'on_the_way', 'arrived'].includes(o.status)
      );
      const completed = orders
        .filter((o) => o.deliveryId === user?.id && o.status === 'delivered')
        .sort((a, b) => new Date((b.deliveredAt || b.createdAt) as string).getTime() - new Date((a.deliveredAt || a.createdAt) as string).getTime());
      const cancelled = orders
        .filter((o) => o.deliveryId === user?.id && o.status === 'cancelled')
        .sort((a, b) => new Date((b.cancelledAt || b.createdAt) as string).getTime() - new Date((a.cancelledAt || a.createdAt) as string).getTime());
      setAvailableOrders(available);
      setMyOrder(mine || null);
      setCompletedOrders(completed);
      setCancelledOrders(cancelled);
    });
    return unsub;
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) {
      setEarningsEntries([]);
      return;
    }
    const unsub = FirebaseServiceV2.subscribeToDeliveryEarnings(user.id, (entries) => {
      setEarningsEntries(Array.isArray(entries) ? entries : []);
    });
    return unsub;
  }, [user?.id]);

  // Subscribe to client real-time location when on active delivery
  useEffect(() => {
    if (!myOrder?.id) return;
    // Try from order first
    const ol = (myOrder as any).clientLocation;
    if (ol?.lat) setClientLiveLocation(ol);
    const unsub = FirebaseServiceV2.subscribeToClientLocation(myOrder.id, (loc) => {
      if (loc) setClientLiveLocation(loc);
    });
    return unsub;
  }, [myOrder?.id]);

  // Get GPS position
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        setMyLocation([pos.coords.latitude, pos.coords.longitude]);
      });
    }
  }, []);

  // Send GPS to Firebase every 4 seconds when order is ready, on its way, or arrived
  useEffect(() => {
    if (myOrder?.id && ['ready', 'on_the_way', 'arrived'].includes(myOrder.status)) {
      gpsIntervalRef.current = setInterval(() => {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(pos => {
            const loc: [number, number] = [pos.coords.latitude, pos.coords.longitude];
            setMyLocation(loc);
            FirebaseServiceV2.updateDeliveryLocation(myOrder.id, loc[0], loc[1]);
          });
        }
      }, 4000);
    }
    return () => { if (gpsIntervalRef.current) clearInterval(gpsIntervalRef.current); };
  }, [myOrder?.id, myOrder?.status]);

  const handleAcceptOrder = async (order: Order) => {
    soundService.stopRinging(); // stop ringing for this delivery person
    try {
      const payload: Record<string, any> = {
        deliveryId: user?.id,
        deliveryName: user?.name
      };
      if (order.status === 'ready') {
        payload.status = 'on_the_way';
      }
      await FirebaseServiceV2.updateOrder(order.id, payload);
      await FirebaseServiceV2.updateDeliveryLocation(order.id, myLocation[0], myLocation[1]);
    } catch (err) { console.error('Error aceptando pedido:', err); }
  };

  const handleStartDelivery = async () => {
    if (!myOrder || myOrder.status !== 'ready') return;
    try {
      await FirebaseServiceV2.updateOrder(myOrder.id, { status: 'on_the_way' });
      await FirebaseServiceV2.updateDeliveryLocation(myOrder.id, myLocation[0], myLocation[1]);
    } catch (err) { console.error('Error iniciando entrega:', err); }
  };

  const handleArrive = async () => {
    if (!myOrder) return;
    try {
      await FirebaseServiceV2.updateOrder(myOrder.id, { status: 'arrived' });
      await FirebaseServiceV2.updateDeliveryLocation(myOrder.id, myLocation[0], myLocation[1]);
    } catch (err) { console.error('Error marcando llegada:', err); }
  };

  const handleComplete = async () => {
    if (!myOrder) return;
    try {
      const createdAtMs = new Date(myOrder.createdAt as any).getTime();
      const nowMs = Date.now();
      const deliveryDurationMinutes = Number.isFinite(createdAtMs)
        ? Math.max(1, Math.round((nowMs - createdAtMs) / 60000))
        : undefined;
      const deliveredAt = new Date(nowMs).toISOString();

      await FirebaseServiceV2.updateOrder(myOrder.id, {
        status: 'delivered',
        deliveredAt,
        deliveryDurationMinutes
      });

      const deliveredOrder: Order = {
        ...myOrder,
        status: 'delivered',
        deliveredAt,
        deliveryDurationMinutes,
      };

      await FirebaseServiceV2.upsertDeliveryEarningEntry(
        user?.id || deliveredOrder.deliveryId || '',
        deliveredOrder.id,
        getOrderEarning(deliveredOrder),
        deliveredAt
      );

      setCompletedOrders((prev) => [deliveredOrder, ...prev.filter((o) => o.id !== deliveredOrder.id)]);
      setMyOrder(null);
      setIsNavigating(false);
    } catch (err) { console.error('Error completando pedido:', err); }
  };

  const getClientCoords = (): { lat: number; lng: number } | null => {
    if (clientLiveLocation) return clientLiveLocation;
    const ol = (myOrder as any)?.clientLocation;
    if (ol?.lat) return { lat: ol.lat, lng: ol.lng };
    return null;
  };

  // Normalize clientLocation to [lat, lng] tuple for the map
  const getClientLocTuple = (): [number, number] | undefined => {
    const c = getClientCoords();
    return c ? [c.lat, c.lng] : undefined;
  };

  const getBusinessCoords = (order?: Order | null): { lat: number; lng: number } | null => {
    const target = order || myOrder;
    if (!target) return null;

    if (Array.isArray((target as any).businessLocation) && (target as any).businessLocation.length === 2) {
      const lat = Number((target as any).businessLocation[0]);
      const lng = Number((target as any).businessLocation[1]);
      if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
    }

    const lat = Number((target as any).businessLat ?? (target as any).latitude);
    const lng = Number((target as any).businessLng ?? (target as any).longitude);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };

    return null;
  };

  const getBusinessLocTuple = (order?: Order | null): [number, number] | undefined => {
    const b = getBusinessCoords(order);
    return b ? [b.lat, b.lng] : undefined;
  };

  const openInWaze = () => {
    const coords = getClientCoords();
    if (coords) {
      window.open(`https://waze.com/ul?ll=${coords.lat},${coords.lng}&navigate=yes`, '_blank');
    } else if (myOrder?.deliveryAddress) {
      window.open(`https://www.waze.com/ul?q=${encodeURIComponent(myOrder.deliveryAddress)}&navigate=yes`, '_blank');
    }
  };

  const openInGoogleMaps = () => {
    const coords = getClientCoords();
    if (coords) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}`, '_blank');
    } else if (myOrder?.deliveryAddress) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(myOrder.deliveryAddress)}`, '_blank');
    }
  };

  const openBusinessInGoogleMaps = (order?: Order | null) => {
    const coords = getBusinessCoords(order);
    if (coords) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}`, '_blank');
      return;
    }

    const target = order || myOrder;
    if (target?.businessName) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(target.businessName)}`, '_blank');
    }
  };

  const formatPaymentMethod = (paymentMethod?: string) => {
    const method = String(paymentMethod || '').toLowerCase();
    if (method.includes('card') || method.includes('tarjeta')) return 'Tarjeta';
    if (method.includes('cash') || method.includes('efectivo')) return 'Efectivo';
    return paymentMethod || 'No especificado';
  };

  const getPrepStatusLabel = (status?: string) => {
    if (status === 'accepted') return 'Aceptado por negocio';
    if (status === 'preparing') return 'Preparando pedido';
    if (status === 'ready') return 'Listo para recoger';
    return 'Estado no disponible';
  };

  const getClientNotes = (order: Order) => {
    const orderNotes = (order.deliveryInstructions || '').trim();
    const itemNotes = (order.items || [])
      .map((item) => (item.notes || '').trim())
      .filter(Boolean);
    return [orderNotes, ...itemNotes];
  };

  const formatOrderDateTime = (order: Order, type: 'completed' | 'cancelled') => {
    const sourceDate = type === 'completed'
      ? (order.deliveredAt || order.createdAt)
      : (order.cancelledAt || order.createdAt);
    const date = new Date(sourceDate as string);
    if (!Number.isFinite(date.getTime())) return 'Fecha no disponible';
    const day = date.toLocaleDateString();
    const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `${day} · ${time}`;
  };

  const renderDeliveryHistory = () => (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-black uppercase tracking-wide text-emerald-700">Pedidos completados</h4>
          <span className="text-xs font-bold px-2 py-1 rounded-full bg-emerald-50 text-emerald-700">{completedOrders.length}</span>
        </div>
        {completedOrders.length === 0 ? (
          <p className="text-sm text-gray-500">Aún no tienes pedidos completados.</p>
        ) : (
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {completedOrders.slice(0, 20).map((order) => (
              <div key={order.id} className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
                <p className="text-xs font-black text-emerald-700">Pedido #{order.id.slice(-8).toUpperCase()}</p>
                <p className="text-sm font-bold text-gray-800 mt-1">{formatOrderDateTime(order, 'completed')}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white p-4 rounded-2xl border border-rose-100 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-black uppercase tracking-wide text-rose-700">Pedidos cancelados</h4>
          <span className="text-xs font-bold px-2 py-1 rounded-full bg-rose-50 text-rose-700">{cancelledOrders.length}</span>
        </div>
        {cancelledOrders.length === 0 ? (
          <p className="text-sm text-gray-500">No hay pedidos cancelados asignados a ti.</p>
        ) : (
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {cancelledOrders.slice(0, 20).map((order) => (
              <div key={order.id} className="rounded-xl border border-rose-100 bg-rose-50/50 p-3">
                <p className="text-xs font-black text-rose-700">Pedido #{order.id.slice(-8).toUpperCase()}</p>
                <p className="text-sm font-bold text-gray-800 mt-1">{formatOrderDateTime(order, 'cancelled')}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const getDateKey = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getOrderEarning = (order: Order) => {
    const fee = Number(order.deliveryFee);
    if (Number.isFinite(fee) && fee >= 0) return fee;

    const total = Number(order.total);
    const subtotal = Number(order.subtotal);
    if (Number.isFinite(total) && Number.isFinite(subtotal)) {
      return Math.max(0, total - subtotal);
    }

    return 0;
  };

  useEffect(() => {
    if (!user?.id) return;
    const deliveredByMe = (Array.isArray(completedOrders) ? completedOrders : []).filter((o) => o?.deliveryId === user.id);
    deliveredByMe.forEach((order) => {
      const deliveredAt = String(order.deliveredAt || order.createdAt || new Date().toISOString());
      const amount = getOrderEarning(order);
      FirebaseServiceV2.upsertDeliveryEarningEntry(user.id, order.id, amount, deliveredAt).catch((err) => {
        console.error('Error sincronizando ganancia en Firebase:', err);
      });
    });
  }, [completedOrders, user?.id]);

  const earningsData = useMemo(() => {
    try {
      const now = new Date(earningsNow);
      const todayKey = getDateKey(now);
      const dailyMap = new Map<string, { total: number; deliveries: number }>();

      (Array.isArray(earningsEntries) ? earningsEntries : []).forEach((entry) => {
        if (!entry) return;
        const deliveredDate = new Date((entry.deliveredAt || '') as string);
        if (!Number.isFinite(deliveredDate.getTime())) return;

        const amount = Number(entry.amount);
        const earning = Number.isFinite(amount) ? Math.max(0, amount) : 0;
        const key = getDateKey(deliveredDate);
        const prev = dailyMap.get(key) || { total: 0, deliveries: 0 };
        dailyMap.set(key, { total: prev.total + earning, deliveries: prev.deliveries + 1 });
      });

      const dailyHistory = Array.from(dailyMap.entries())
        .map(([dateKey, value]) => {
          const date = new Date(`${dateKey}T00:00:00`);
          return {
            dateKey,
            label: date.toLocaleDateString(),
            total: value.total,
            deliveries: value.deliveries,
          };
        })
        .sort((a, b) => (a.dateKey < b.dateKey ? 1 : -1));

      const today = dailyMap.get(todayKey)?.total || 0;
      const total = dailyHistory.reduce((sum, day) => sum + day.total, 0);

      return {
        today,
        total,
        dailyHistory,
      };
    } catch (error) {
      console.error('Error calculando ganancias del repartidor:', error);
      return {
        today: 0,
        total: 0,
        dailyHistory: [] as { dateKey: string; label: string; total: number; deliveries: number }[],
      };
    }
  }, [earningsEntries, earningsNow]);

  const renderEarningsPanel = () => (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-black text-gray-900 uppercase tracking-wide">Ganancias</h3>
        <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700">Repartidor</span>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Hoy</p>
          <p className="text-2xl font-black text-emerald-800 mt-1">RD$ {earningsData.today.toFixed(0)}</p>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => setShowEarningsHistory((prev) => !prev)}
          className="px-3 py-2 rounded-xl text-xs font-black bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
        >
          {showEarningsHistory ? 'Ocultar historial de ganancias' : 'Historial de ganancias'}
        </button>
      </div>

      {showEarningsHistory && (
        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-black uppercase tracking-wide text-gray-700">Historial diario</h4>
            <span className="text-sm font-black text-gray-900">Total: RD$ {earningsData.total.toFixed(0)}</span>
          </div>
          {earningsData.dailyHistory.length === 0 ? (
            <p className="text-sm text-gray-500">Aún no hay ganancias guardadas.</p>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {earningsData.dailyHistory.map((entry) => (
                <div key={entry.dateKey} className="bg-white border border-gray-100 rounded-xl p-3">
                  <p className="text-xs font-bold text-gray-500">{entry.label}</p>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-sm text-gray-600">{entry.deliveries} pedidos</p>
                    <p className="text-sm font-black text-gray-900">RD$ {entry.total.toFixed(0)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40 p-4 flex items-center justify-between">
        <button onClick={() => window.location.reload()} className="flex items-center gap-3">
          <img src={LOGO_URL} alt="Logo" className="h-9 w-auto object-contain" referrerPolicy="no-referrer" />
          <div>
            <h2 className="text-xl font-black font-display text-primary italic">Spdidos</h2>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Panel de Repartidor</p>
          </div>
        </button>
        <div className="flex items-center gap-2">
          <button onClick={() => setIsAvailable(p => !p)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl font-bold text-xs transition-all ${isAvailable ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
            <Power className="w-3.5 h-3.5" />
            {isAvailable ? 'ACTIVO' : 'INACTIVO'}
          </button>
          <button onClick={logout} className="flex items-center gap-2 px-3 py-2 rounded-xl font-bold text-xs bg-red-50 text-red-600">
            <LogOut className="w-3.5 h-3.5" /> Salir
          </button>
        </div>
      </header>

      <div className="p-4 space-y-5">
        {renderEarningsPanel()}
        {!isAvailable ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="bg-white p-10 rounded-3xl border border-gray-100 text-center space-y-5 shadow-sm mt-4">
            <div className="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
              <ShieldAlert className="w-10 h-10 text-gray-400" />
            </div>
            <div>
              <h3 className="text-xl font-black text-gray-900">Fuera de línea</h3>
              <p className="text-gray-500 text-sm mt-1">Actívate para recibir pedidos y ganar dinero.</p>
            </div>
            <button onClick={() => setIsAvailable(true)}
              className="bg-emerald-500 text-white px-8 py-3 rounded-xl font-bold hover:bg-emerald-600 transition-all">
              Conectarme ahora
            </button>
          </motion.div>
        ) : myOrder ? (
          /* ── PEDIDO ACTIVO ── */
          isNavigating && getClientLocTuple() ? (
            /* ══ WAZE-STYLE NAVIGATION ══ */
            <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#0d1117' }}>

              {/* Top instruction panel */}
              <div style={{ background: '#151b2e', borderBottom: '1px solid rgba(0,212,255,0.15)' }} className="px-5 pt-5 pb-4">
                <div className="flex items-center gap-4">
                  <div style={{ background: 'rgba(0,212,255,0.12)', border: '2px solid rgba(0,212,255,0.35)', borderRadius: 14, padding: 10, flexShrink: 0 }}>
                    <TurnArrow type={routeInfo?.steps[0]?.type || 'Head'} size={34} color="#00d4ff" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div style={{ color: '#00d4ff', fontSize: 38, fontWeight: 900, lineHeight: 1 }}>
                      {routeInfo?.steps[0] ? fmtDist(routeInfo.steps[0].distance) : '...'}
                    </div>
                    <p className="text-sm font-bold mt-1 truncate" style={{ color: 'rgba(255,255,255,0.7)' }}>
                      {routeInfo?.steps[0]?.text || 'Calculando ruta...'}
                    </p>
                  </div>
                  <button onClick={() => setIsNavigating(false)}
                    style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12, padding: '8px 14px' }}
                    className="text-white font-bold text-sm flex-shrink-0">
                    ✕
                  </button>
                </div>

                {/* y luego */}
                {routeInfo?.steps[1] && (
                  <div className="flex items-center gap-2 mt-3" style={{ opacity: 0.55 }}>
                    <span className="text-xs font-bold" style={{ color: '#9ca3af' }}>y luego</span>
                    <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 6, padding: '3px 6px', display: 'flex', alignItems: 'center' }}>
                      <TurnArrow type={routeInfo.steps[1].type} size={14} color="white" />
                    </div>
                    <span className="text-xs truncate" style={{ color: '#d1d5db' }}>{routeInfo.steps[1].text}</span>
                  </div>
                )}
              </div>

              {/* Map — fills remaining space */}
              <div className="flex-1 relative overflow-hidden">
                <WazeNavMap deliveryLoc={myLocation} clientLoc={getClientLocTuple()!} onRouteFound={setRouteInfo} />
              </div>

              {/* Bottom bar */}
              <div style={{ background: '#151b2e', borderTop: '1px solid rgba(255,255,255,0.08)' }} className="px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2">
                      <span style={{ color: '#00d4ff', fontSize: 26, fontWeight: 900 }}>
                        {routeInfo ? fmtTime(routeInfo.totalTime) : '--'}
                      </span>
                      <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>•</span>
                      <span className="font-bold" style={{ color: 'rgba(255,255,255,0.85)', fontSize: 15 }}>
                        {routeInfo ? fmtDist(routeInfo.totalDistance) : '--'}
                      </span>
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{myOrder.clientName || 'Cliente'}</p>
                  </div>
                  <button onClick={() => setIsNavigating(false)}
                    style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 22, padding: '9px 16px' }}
                    className="text-white font-bold text-sm whitespace-nowrap">
                    Vista general
                  </button>
                  {myOrder.status === 'ready' ? (
                    <button onClick={handleStartDelivery}
                      style={{ background: '#2563eb', borderRadius: 22, padding: '9px 16px' }}
                      className="text-white font-bold text-sm flex items-center gap-2 whitespace-nowrap">
                      <Navigation className="w-4 h-4" /> Iniciar ruta
                    </button>
                  ) : myOrder.status === 'on_the_way' ? (
                    <button onClick={handleArrive}
                      style={{ background: '#0d9488', borderRadius: 22, padding: '9px 16px' }}
                      className="text-white font-bold text-sm flex items-center gap-2 whitespace-nowrap">
                      <MapPin className="w-4 h-4" /> Ya llegué
                    </button>
                  ) : (
                    <button onClick={handleComplete}
                      style={{ background: '#22c55e', borderRadius: 22, padding: '9px 16px' }}
                      className="text-white font-bold text-sm flex items-center gap-2 whitespace-nowrap">
                      <CheckCircle2 className="w-4 h-4" /> Marcar Entregado
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-5 border-b border-gray-50 flex items-center justify-between">
                <span className={`text-xs font-black px-3 py-1 rounded-full uppercase ${myOrder.status === 'arrived' ? 'text-teal-700 bg-teal-50' : 'text-blue-600 bg-blue-50'}`}>
                  {myOrder.status === 'arrived' ? '¡Has llegado!' : 'Entrega en curso'}
                </span>
                <span className="text-sm font-bold text-gray-400">#{myOrder.id.slice(-6).toUpperCase()}</span>
              </div>
              <div className="p-5 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="bg-orange-100 p-3 rounded-2xl flex-shrink-0">
                    <Store className="w-5 h-5 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-900">{myOrder.businessName}</p>
                    <div className="flex items-center gap-1.5 text-sm text-gray-500 mt-0.5">
                      <MapPin className="w-3 h-3" />
                      <span>{myOrder.deliveryAddress || 'Dirección del cliente'}</span>
                    </div>
                    {myOrder.clientAddressDescription && (
                      <div className="text-sm text-gray-600 mt-1 bg-blue-50 rounded-lg p-2">
                        <span className="font-black text-blue-700">Descripción:</span> {myOrder.clientAddressDescription}
                      </div>
                    )}
                    {getBusinessLocTuple() && (
                      <button
                        type="button"
                        onClick={() => openBusinessInGoogleMaps()}
                        className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-amber-700 hover:text-amber-800"
                      >
                        <MapPin className="w-3 h-3" />
                        Ver ubicación del negocio
                      </button>
                    )}
                    <p className="text-sm font-bold text-emerald-600 mt-1">
                      <DollarSign className="w-3 h-3 inline" /> Ganancia: RD$ {myOrder.deliveryFee || 150}
                    </p>
                  </div>
                  <button onClick={() => setIsNavigating(true)} className="bg-blue-600 text-white p-3 rounded-2xl shadow">
                    <Navigation className="w-5 h-5" />
                  </button>
                </div>

                <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Pedido #{myOrder.id}</p>
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Productos</p>
                    <ul className="mt-1 text-sm text-gray-700 space-y-1">
                      {(myOrder.items || []).map((item) => (
                        <li key={`${item.id}-${item.notes || ''}`}>• {item.quantity}x {item.name}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-white rounded-lg p-2 border border-gray-100">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Total</p>
                      <p className="font-black text-gray-900">RD$ {myOrder.total?.toFixed(0)}</p>
                    </div>
                    <div className="bg-white rounded-lg p-2 border border-gray-100">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Pago</p>
                      <p className="font-black text-gray-900">{formatPaymentMethod(myOrder.paymentMethod)}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Notas del cliente</p>
                    <p className="text-sm text-gray-700 mt-1">{getClientNotes(myOrder).join(' · ') || 'Sin notas'}</p>
                  </div>
                </div>

                <DeliveryTrackingMap deliveryLoc={myLocation} clientLoc={getClientLocTuple()} businessLoc={getBusinessLocTuple()} />

                {/* Live location badge */}
                {clientLiveLocation && (
                  <div className="flex items-center gap-2 p-2.5 bg-blue-50 rounded-xl border border-blue-100">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse flex-shrink-0" />
                    <span className="text-xs font-bold text-blue-700">Ubicación del cliente en tiempo real</span>
                    <span className="ml-auto text-xs text-blue-500">{clientLiveLocation.lat.toFixed(4)}, {clientLiveLocation.lng.toFixed(4)}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <button onClick={openInGoogleMaps}
                    className="flex items-center justify-center gap-2 p-3 bg-blue-600 text-white rounded-xl font-bold text-sm">
                    <MapIcon className="w-4 h-4" /> Google Maps
                  </button>
                  <button onClick={openInWaze}
                    className="flex items-center justify-center gap-2 p-3 bg-[#33ccff] text-white rounded-xl font-bold text-sm">
                    <img src="https://cdn-icons-png.flaticon.com/512/732/732258.png" className="w-4 h-4" alt="Waze" /> Waze
                  </button>
                  {getBusinessLocTuple() && (
                    <button onClick={() => openBusinessInGoogleMaps()}
                      className="flex items-center justify-center gap-2 p-3 bg-amber-500 text-white rounded-xl font-bold text-sm">
                      <MapPin className="w-4 h-4" /> Ir al negocio
                    </button>
                  )}
                </div>

                {myOrder.status === 'arrived' && (
                  <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 text-center space-y-1">
                    <p className="text-teal-700 font-black text-lg">📍 ¡Llegaste al destino!</p>
                    <p className="text-teal-600 text-xs">Entrega el pedido al cliente y marca como entregado</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  {myOrder.clientWhatsapp && (
                    <a href={`https://wa.me/${myOrder.clientWhatsapp.replace(/\D/g,'')}`} target="_blank" rel="noreferrer"
                      className="flex items-center justify-center gap-2 p-3 bg-emerald-50 rounded-xl text-emerald-600 font-bold text-sm">
                      <MessageCircle className="w-4 h-4" /> WhatsApp
                    </a>
                  )}
                  {myOrder.status === 'ready' && (
                    <button onClick={handleStartDelivery}
                      className={`flex items-center justify-center gap-2 p-3 bg-blue-600 text-white rounded-xl font-bold text-sm ${myOrder.clientWhatsapp ? '' : 'col-span-2'}`}>
                      <Navigation className="w-4 h-4" /> Iniciar ruta
                    </button>
                  )}
                  {myOrder.status === 'on_the_way' && (
                    <button onClick={handleArrive}
                      className={`flex items-center justify-center gap-2 p-3 bg-teal-600 text-white rounded-xl font-bold text-sm ${myOrder.clientWhatsapp ? '' : 'col-span-2'}`}>
                      <MapPin className="w-4 h-4" /> Ya llegué
                    </button>
                  )}
                </div>

                {myOrder.status === 'arrived' && (
                  <button onClick={handleComplete}
                    className="w-full flex items-center justify-center gap-3 p-4 bg-emerald-600 text-white rounded-xl font-black text-lg shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all">
                    <CheckCircle2 className="w-6 h-6" /> Marcar como Entregado
                  </button>
                )}
              </div>
            </motion.div>
            {renderDeliveryHistory()}
            </>
          )
        ) : (
          /* ── PEDIDOS DISPONIBLES ── */
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black font-display text-gray-900 uppercase tracking-tight">Pedidos disponibles</h3>
              <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-black uppercase">
                {availableOrders.length} disponibles
              </span>
            </div>

            {availableOrders.length === 0 ? (
              <div className="py-10 space-y-6">
                <Radar />
                <div className="text-center">
                  <p className="text-xl font-black font-display text-gray-900">Buscando pedidos...</p>
                  <p className="text-gray-500 text-sm mt-1">Mantén la app abierta</p>
                </div>
              </div>
            ) : (
              availableOrders.map(order => (
                <motion.div key={order.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-orange-100 p-3 rounded-2xl">
                        <Store className="w-5 h-5 text-orange-600" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{order.businessName}</p>
                        <p className="text-sm text-gray-500 flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {order.deliveryAddress || 'San Pedro de Macorís'}
                        </p>
                        {getBusinessLocTuple(order) && (
                          <button
                            type="button"
                            onClick={() => openBusinessInGoogleMaps(order)}
                            className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-amber-700 hover:text-amber-800"
                          >
                            <MapPin className="w-3 h-3" />
                            Ver ubicación del negocio
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-emerald-600 text-lg">RD$ {order.deliveryFee || 150}</p>
                      <p className="text-xs text-gray-400 flex items-center gap-1 justify-end">
                        <Clock className="w-3 h-3" /> {order.eta || '20-35 min'}
                      </p>
                      <span className="inline-flex mt-1 text-[10px] font-black px-2 py-1 rounded-full bg-blue-50 text-blue-700 uppercase">
                        {getPrepStatusLabel(order.status)}
                      </span>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Pedido #{order.id}</p>
                    <div className="grid grid-cols-3 gap-1.5">
                      {DELIVERY_PREP_STEPS.map((step) => {
                        const currentIndex = DELIVERY_PREP_STEPS.findIndex((s) => s.status === order.status);
                        const stepIndex = DELIVERY_PREP_STEPS.findIndex((s) => s.status === step.status);
                        const isCurrent = step.status === order.status;
                        const isDone = currentIndex > stepIndex;
                        return (
                          <div
                            key={`${order.id}-${step.status}`}
                            className={`rounded-lg px-2 py-1 text-[10px] font-black text-center uppercase ${
                              isCurrent ? 'bg-blue-100 text-blue-700' : isDone ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-gray-400 border border-gray-200'
                            }`}
                          >
                            {step.label}
                          </div>
                        );
                      })}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Productos</p>
                      <ul className="mt-1 text-sm text-gray-700 space-y-1">
                        {(order.items || []).map((item) => (
                          <li key={`${item.id}-${item.notes || ''}`}>• {item.quantity}x {item.name}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="bg-white rounded-lg p-2 border border-gray-100">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Total</p>
                        <p className="font-black text-gray-900">RD$ {order.total?.toFixed(0)}</p>
                      </div>
                      <div className="bg-white rounded-lg p-2 border border-gray-100">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Pago</p>
                        <p className="font-black text-gray-900">{formatPaymentMethod(order.paymentMethod)}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Notas del cliente</p>
                      <p className="text-sm text-gray-700 mt-1">{getClientNotes(order).join(' · ') || 'Sin notas'}</p>
                    </div>
                    {order.clientName && (
                      <p className="text-xs text-gray-500">Para: <span className="font-bold text-gray-700">{order.clientName}</span></p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button onClick={() => handleAcceptOrder(order)}
                      className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20">
                      Aceptar Pedido
                    </button>
                    {getBusinessLocTuple(order) && (
                      <button
                        onClick={() => openBusinessInGoogleMaps(order)}
                        className="w-full bg-amber-100 text-amber-700 py-3 rounded-xl font-bold hover:bg-amber-200 transition-all border border-amber-200"
                      >
                        Ir al negocio
                      </button>
                    )}
                  </div>
                </motion.div>
              ))
            )}
            {renderDeliveryHistory()}
          </div>
        )}
      </div>
    </div>
  );
};

export default DeliveryView;





