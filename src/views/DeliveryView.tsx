import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'motion/react';
import { Package, MapPin, CheckCircle2, Navigation, Store, MessageCircle, Power, Search, ShieldAlert, LogOut, Clock, DollarSign, Map, ChevronRight } from 'lucide-react';
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
const DeliveryTrackingMap: React.FC<{ deliveryLoc: [number, number]; clientLoc?: [number, number] }> = ({ deliveryLoc, clientLoc }) => (
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
  const [isAvailable, setIsAvailable] = useState(true);
  const [isNavigating, setIsNavigating] = useState(false);
  const [myLocation, setMyLocation] = useState<[number, number]>(SPM_CENTER);
  const [clientLiveLocation, setClientLiveLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const gpsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevReadyIds = useRef<Set<string>>(new Set());
  const isFirstDeliveryLoad = useRef(true);

  // Subscribe to available (ready) orders + ring when new ones arrive
  useEffect(() => {
    const unsub = FirebaseServiceV2.subscribeToDeliveryOrders((orders) => {
      const available = orders.filter(o => o.status === 'ready');
      const mine = orders.find(o => o.deliveryId === user?.id && (o.status === 'on_the_way' || o.status === 'arrived'));

      if (!isFirstDeliveryLoad.current) {
        const newReady = available.filter(o => !prevReadyIds.current.has(o.id));
        if (newReady.length > 0) {
          soundService.startRinging();
        }
        // Stop ringing if no more ready orders
        if (available.length === 0 && soundService.isRinging) {
          soundService.stopRinging();
        }
      } else {
        available.forEach(o => prevReadyIds.current.add(o.id));
        isFirstDeliveryLoad.current = false;
      }
      available.forEach(o => prevReadyIds.current.add(o.id));
      setAvailableOrders(available);
      setMyOrder(mine || null);
    });
    return () => { unsub(); soundService.stopRinging(); };
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

  // Send GPS to Firebase every 4 seconds when on active delivery
  useEffect(() => {
    if (myOrder?.id && myOrder.status === 'on_the_way') {
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
      await FirebaseServiceV2.updateOrder(order.id, {
        status: 'on_the_way',
        deliveryId: user?.id,
        deliveryName: user?.name
      });
      await FirebaseServiceV2.updateDeliveryLocation(order.id, myLocation[0], myLocation[1]);
    } catch (err) { console.error('Error aceptando pedido:', err); }
  };

  const handleArrive = async () => {
    if (!myOrder) return;
    try {
      await FirebaseServiceV2.updateOrder(myOrder.id, { status: 'arrived' });
    } catch (err) { console.error('Error marcando llegada:', err); }
  };

  const handleComplete = async () => {
    if (!myOrder) return;
    try {
      await FirebaseServiceV2.updateOrder(myOrder.id, { status: 'delivered' });
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
                  <button onClick={handleComplete}
                    style={{ background: '#22c55e', borderRadius: 22, padding: '9px 16px' }}
                    className="text-white font-bold text-sm flex items-center gap-2 whitespace-nowrap">
                    <CheckCircle2 className="w-4 h-4" /> Entregado
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-5 border-b border-gray-50 flex items-center justify-between">
                <span className="text-xs font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase">Entrega en curso</span>
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
                    <p className="text-sm font-bold text-emerald-600 mt-1">
                      <DollarSign className="w-3 h-3 inline" /> Ganancia: RD$ {myOrder.deliveryFee || 150}
                    </p>
                  </div>
                  <button onClick={() => setIsNavigating(true)} className="bg-blue-600 text-white p-3 rounded-2xl shadow">
                    <Navigation className="w-5 h-5" />
                  </button>
                </div>

                <DeliveryTrackingMap deliveryLoc={myLocation} clientLoc={getClientLocTuple()} />

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
                    <Map className="w-4 h-4" /> Google Maps
                  </button>
                  <button onClick={openInWaze}
                    className="flex items-center justify-center gap-2 p-3 bg-[#33ccff] text-white rounded-xl font-bold text-sm">
                    <img src="https://cdn-icons-png.flaticon.com/512/732/732258.png" className="w-4 h-4" alt="Waze" /> Waze
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {myOrder.clientWhatsapp && (
                    <a href={`https://wa.me/${myOrder.clientWhatsapp.replace(/\D/g,'')}`} target="_blank" rel="noreferrer"
                      className="flex items-center justify-center gap-2 p-3 bg-emerald-50 rounded-xl text-emerald-600 font-bold text-sm">
                      <MessageCircle className="w-4 h-4" /> WhatsApp
                    </a>
                  )}
                  {myOrder.status === 'on_the_way' ? (
                    <button onClick={handleArrive}
                      className={`flex items-center justify-center gap-2 p-3 bg-teal-600 text-white rounded-xl font-bold text-sm ${myOrder.clientWhatsapp ? '' : 'col-span-2'}`}>
                      <MapPin className="w-4 h-4" /> Ya llegué
                    </button>
                  ) : (
                    <button onClick={handleComplete}
                      className={`flex items-center justify-center gap-2 p-3 bg-emerald-600 text-white rounded-xl font-bold text-sm ${myOrder.clientWhatsapp ? '' : 'col-span-2'}`}>
                      <CheckCircle2 className="w-4 h-4" /> Marcar Entregado
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
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
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-emerald-600 text-lg">RD$ {order.deliveryFee || 150}</p>
                      <p className="text-xs text-gray-400 flex items-center gap-1 justify-end">
                        <Clock className="w-3 h-3" /> {order.eta || '20-35 min'}
                      </p>
                    </div>
                  </div>
                  <div className="text-xs text-gray-600 bg-gray-50 rounded-xl p-3">
                    <span className="font-bold">{order.items?.length || 0} items</span> · Total RD$ {order.total?.toFixed(0)}
                    {order.clientName && <span> · Para: {order.clientName}</span>}
                  </div>
                  <button onClick={() => handleAcceptOrder(order)}
                    className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20">
                    Aceptar Pedido
                  </button>
                </motion.div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DeliveryView;
