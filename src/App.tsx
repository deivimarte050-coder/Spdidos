import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Clock, Star, CheckCircle2, ShoppingBag, MapPin, Truck, ChefHat, Package, Navigation, Bell, X, User, Volume2, LogOut, Save, Heart, Phone, MessageCircle, Mail, List, LayoutGrid } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import Layout from './components/Layout';
import HomeView from './components/HomeView';
import BusinessList from './components/BusinessList';
import CartDrawer from './components/CartDrawer';
import Auth from './components/Auth';
import DeliveryView from './views/DeliveryView';
import BusinessView from './views/BusinessView';
import AdminView from './views/AdminView';
import { CartItem, View, Order, BusinessDayKey, MenuItem } from './types';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import DataService, { Business } from './services/DataService';
import FirebaseServiceV2, { HomeAnnouncement } from './services/FirebaseServiceV2';
import EventService from './services/EventService';
import { soundService } from './services/SoundService';
import { initFCMToken, listenFCMForeground } from './services/FCMService';
import { LOGO_URL, SPM_CENTER } from './constants';

const ORDER_STEPS = [
  { status: 'pending',    label: 'Pedido recibido',   icon: Package },
  { status: 'accepted',   label: 'Aceptado',           icon: CheckCircle2 },
  { status: 'preparing',  label: 'Preparando',         icon: ChefHat },
  { status: 'ready',      label: 'Listo para envío',   icon: ShoppingBag },
  { status: 'on_the_way', label: 'En camino',          icon: Truck },
  { status: 'arrived',    label: '¡Repartidor llegó!',  icon: MapPin },
  { status: 'delivered',  label: 'Entregado',          icon: CheckCircle2 },
];

const SplashScreen: React.FC = () => (
  <motion.div
    key="splash"
    initial={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.45 }}
    className="fixed inset-0 z-[9999] bg-primary flex items-center justify-center"
  >
    <motion.div
      initial={{ opacity: 0, scale: 0.88, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.75, ease: 'easeOut' }}
      className="flex flex-col items-center"
    >
      <motion.img
        src={LOGO_URL}
        alt="Spdidos"
        className="w-28 h-28 object-contain drop-shadow-xl"
        animate={{ scale: [1, 1.04, 1] }}
        transition={{ duration: 1.7, repeat: Infinity, ease: 'easeInOut' }}
        referrerPolicy="no-referrer"
      />
      <motion.h1
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="mt-4 text-white text-4xl font-black tracking-tight"
      >
        Spdidos
      </motion.h1>
      <p className="text-white/85 text-sm font-bold tracking-[0.2em] mt-1">DELIVERY & MANDADOS</p>
    </motion.div>
  </motion.div>
);

// ─── Business accepted-order summary modal ────────────────────────────────────
const AcceptedOrderSummaryModal: React.FC<{
  order: Order;
  onClose: () => void;
}> = ({ order, onClose }) => {
  const acceptedDate = new Date((order.acceptedAt || new Date().toISOString()) as string);
  const acceptedTime = acceptedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const noteList = Array.from(new Set((order.items || [])
    .map((item) => String(item.notes || '').trim())
    .filter(Boolean)));
  const mergedClientNote = noteList.length > 0
    ? noteList.join(' · ')
    : (order.deliveryInstructions || 'Sin nota del cliente');

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
    >
      <motion.div
        initial={{ scale: 0.94, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94, y: 30 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-xl max-h-[92vh] overflow-hidden"
      >
        <div className="bg-emerald-500 px-6 py-5 text-white">
          <h3 className="text-xl font-black">Pedido aceptado ✅</h3>
          <p className="text-emerald-100 text-sm">Resumen para comenzar de inmediato</p>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
          <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
            <div className="flex justify-between text-sm"><span className="text-gray-500">Número / ID</span><span className="font-black">#{order.id.slice(-8).toUpperCase()}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">Hora aceptado</span><span className="font-black">{acceptedTime}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">Total</span><span className="font-black text-emerald-700">RD$ {order.total?.toFixed(0)}</span></div>
          </div>

          <div>
            <p className="text-sm font-black text-gray-900 mb-2">Productos pedidos</p>
            <div className="space-y-2">
              {(order.items || []).map((item) => (
                <div key={`${item.id}-${item.notes || 'sin-nota'}`} className="border border-gray-100 rounded-xl p-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-800"><span className="font-black">{item.quantity}x</span> {item.name}</span>
                    <span className="font-black">RD$ {(item.price * item.quantity).toFixed(0)}</span>
                  </div>
                  {item.notes && <p className="text-xs text-gray-500 mt-1">Nota: {item.notes}</p>}
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-black text-gray-900 mb-2">Datos del cliente</p>
            <div className="bg-blue-50 rounded-2xl p-4 space-y-2 text-sm">
              <p><span className="font-black text-blue-900">Nombre:</span> <span className="text-blue-900">{order.clientName || 'No disponible'}</span></p>
              <p><span className="font-black text-blue-900">Teléfono:</span> <span className="text-blue-900">{order.clientPhone || order.clientWhatsapp || 'No disponible'}</span></p>
              <p><span className="font-black text-blue-900">Dirección exacta:</span> <span className="text-blue-900">{order.deliveryAddress || 'No disponible'}</span></p>
              <p><span className="font-black text-blue-900">Nota del cliente:</span> <span className="text-blue-900">{mergedClientNote}</span></p>
            </div>
          </div>
        </div>

        <div className="px-6 pb-6">
          <button
            onClick={onClose}
            className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black hover:bg-emerald-600 transition-all"
          >
            Entendido
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─── Business cancel notification modal (client cancelled) ───────────────────
const CancelledOrderModal: React.FC<{
  order: Order;
  onClose: () => void;
}> = ({ order, onClose }) => (
  <motion.div
    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    className="fixed inset-0 z-50 flex items-center justify-center p-4"
    style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
  >
    <motion.div
      initial={{ scale: 0.8, y: 40 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.8, y: 40 }}
      className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden"
    >
      <div className="bg-red-500 p-6 text-center relative overflow-hidden">
        <motion.div
          animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 1 }}
          className="w-16 h-16 bg-white/30 rounded-full flex items-center justify-center mx-auto mb-3"
        >
          <Bell className="w-9 h-9 text-white" />
        </motion.div>
        <p className="text-white font-black text-xl">Pedido Cancelado</p>
        <div className="flex items-center justify-center gap-1.5 mt-1">
          <Volume2 className="w-4 h-4 text-white/80" />
          <p className="text-white/90 text-sm font-bold">Sonando...</p>
        </div>
      </div>
      <div className="p-5 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-xs font-bold text-gray-400 uppercase">Pedido #{order.id.slice(-6).toUpperCase()}</span>
          <span className="text-lg font-black text-red-600">RD$ {order.total?.toFixed(0)}</span>
        </div>
        <p className="text-sm font-bold text-gray-800">Lo siento, el cliente {order.clientName} canceló el pedido.</p>
        {order.deliveryAddress && (
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">{order.deliveryAddress}</span>
          </div>
        )}
      </div>
      <div className="px-5 pb-6">
        <button onClick={onClose}
          className="w-full py-4 bg-red-500 text-white rounded-2xl font-black text-base hover:bg-red-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-200">
          <X className="w-5 h-5" /> Entendido
        </button>
      </div>
    </motion.div>
  </motion.div>
);

// ─── Client arrival notification modal ────────────────────────────────────────
const ArrivalNotificationModal: React.FC<{ onConfirm: () => void }> = ({ onConfirm }) => (
  <motion.div
    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    className="fixed inset-0 z-50 flex items-end justify-center"
    style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
  >
    <motion.div
      initial={{ y: 200 }} animate={{ y: 0 }} exit={{ y: 200 }}
      transition={{ type: 'spring', damping: 20 }}
      className="bg-white rounded-t-3xl w-full max-w-md shadow-2xl overflow-hidden"
    >
      <div className="bg-teal-500 px-6 pt-8 pb-6 text-center">
        <motion.div
          animate={{ scale: [1, 1.2, 1], rotate: [0, -10, 10, 0] }}
          transition={{ repeat: Infinity, duration: 1.2 }}
          className="w-20 h-20 bg-white/25 rounded-full flex items-center justify-center mx-auto mb-4"
        >
          <span className="text-4xl">🛵</span>
        </motion.div>
        <h2 className="text-white font-black text-2xl">¡Tu repartidor llegó!</h2>
        <p className="text-teal-100 mt-1 text-sm">Está en tu puerta esperando</p>
      </div>
      <div className="p-6">
        <button onClick={onConfirm}
          className="w-full py-4 bg-teal-500 text-white rounded-2xl font-black text-lg hover:bg-teal-600 transition-all shadow-lg shadow-teal-200 flex items-center justify-center gap-3">
          <CheckCircle2 className="w-6 h-6" /> Entendido
        </button>
        <p className="text-center text-xs text-gray-400 mt-3">El repartidor marcará tu pedido como entregado cuando lo recibas</p>
      </div>
    </motion.div>
  </motion.div>
);

// ─── Business new-order notification modal (global, always mounted) ──────────
const IncomingOrderModal: React.FC<{
  order: Order;
  onAccept: () => void;
  onReject: () => void;
}> = ({ order, onAccept, onReject }) => (
  <motion.div
    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    className="fixed inset-0 z-50 flex items-center justify-center p-4"
    style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
  >
    <motion.div
      initial={{ scale: 0.8, y: 40 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.8, y: 40 }}
      className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden"
    >
      <div className="bg-yellow-400 p-6 text-center relative overflow-hidden">
        <motion.div
          animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 1 }}
          className="w-16 h-16 bg-white/30 rounded-full flex items-center justify-center mx-auto mb-3"
        >
          <Bell className="w-9 h-9 text-white" />
        </motion.div>
        <p className="text-white font-black text-xl">¡Nuevo Pedido!</p>
        <div className="flex items-center justify-center gap-1.5 mt-1">
          <Volume2 className="w-4 h-4 text-white/80" />
          <p className="text-white/90 text-sm font-bold">Sonando...</p>
        </div>
      </div>
      <div className="p-5 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-xs font-bold text-gray-400 uppercase">Pedido #{order.id.slice(-6).toUpperCase()}</span>
          <span className="text-lg font-black text-emerald-600">RD$ {order.total?.toFixed(0)}</span>
        </div>
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-gray-400" />
          <span className="font-bold text-gray-800">{order.clientName}</span>
        </div>
        {order.deliveryAddress && (
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">{order.deliveryAddress}</span>
          </div>
        )}
        <div className="bg-gray-50 rounded-xl p-3 space-y-1">
          {order.items?.map(item => (
            <div key={`${item.id}-${item.notes || 'sin-nota'}`} className="text-sm border-b border-gray-100 last:border-0 pb-1 last:pb-0">
              <div className="flex justify-between">
                <span className="text-gray-700"><span className="font-bold">{item.quantity}x</span> {item.name}</span>
                <span className="font-bold">RD$ {(item.price * item.quantity).toFixed(0)}</span>
              </div>
              {item.notes && (
                <p className="text-xs text-gray-500 mt-0.5">Nota del cliente: {item.notes}</p>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="px-5 pb-6 grid grid-cols-2 gap-3">
        <button onClick={onReject}
          className="py-4 bg-red-50 text-red-600 rounded-2xl font-black text-base hover:bg-red-100 transition-all flex items-center justify-center gap-2">
          <X className="w-5 h-5" /> Rechazar
        </button>
        <button onClick={onAccept}
          className="py-4 bg-emerald-500 text-white rounded-2xl font-black text-base hover:bg-emerald-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-200">
          <CheckCircle2 className="w-5 h-5" /> Aceptar
        </button>
      </div>
    </motion.div>
  </motion.div>
);

/** Deterministic ETA in minutes based on order id to keep it consistent across refreshes */
function getEtaMinutes(orderId: string, min: number, max: number): number {
  const hash = orderId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return min + (hash % (max - min + 1));
}

/** Haversine distance in km between two GPS points */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Estimate delivery minutes from distance in km (avg motorcycle ~25 km/h in city + 2 min buffer) */
function estimateMinutesFromKm(km: number): number {
  const AVG_SPEED_KMH = 25;
  return Math.max(1, Math.round((km / AVG_SPEED_KMH) * 60) + 2);
}

/** Auto-fit map bounds to show all given positions */
const MapAutoFit: React.FC<{ positions: [number, number][] }> = ({ positions }) => {
  const map = useMap();
  useEffect(() => {
    if (positions.length === 0) return;
    if (positions.length === 1) {
      map.setView(positions[0], 16);
    } else {
      const bounds = L.latLngBounds(positions.map(p => L.latLng(p[0], p[1])));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    }
  }, [positions, map]);
  return null;
};

const TrackingView: React.FC<{
  orderId: string | null;
  orders: Order[];
  deliveryLocation: { lat: number; lng: number } | null;
  onBack: () => void;
  onCancelOrder?: (order: Order) => void;
}> = ({ orderId, orders, deliveryLocation, onBack, onCancelOrder }) => {
  const order = orderId ? orders.find(o => o.id === orderId) || orders[0] : orders[0];
  const stepIndex = order ? ORDER_STEPS.findIndex(s => s.status === order.status) : 0;
  const deliverPos: [number, number] = deliveryLocation ? [deliveryLocation.lat, deliveryLocation.lng] : SPM_CENTER;

  const [secsLeft, setSecsLeft] = useState<number | null>(null);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [cancelSecsLeft, setCancelSecsLeft] = useState<number | null>(null);

  // Extract client GPS from order (handles both object {lat,lng} and tuple [lat,lng] formats)
  const getClientCoords = (): { lat: number; lng: number } | null => {
    const loc = order?.clientLocation as any;
    if (!loc) return null;
    if (Array.isArray(loc) && loc.length >= 2) return { lat: loc[0], lng: loc[1] };
    if (typeof loc === 'object' && loc.lat != null && loc.lng != null) return { lat: loc.lat, lng: loc.lng };
    return null;
  };

  // Dynamic GPS-based ETA when on_the_way
  useEffect(() => {
    if (!order?.id) { setSecsLeft(null); setDistanceKm(null); return; }

    const isPrep  = order.status === 'preparing';
    const isOnWay = order.status === 'on_the_way';
    if (!isPrep && !isOnWay) { setSecsLeft(null); setDistanceKm(null); return; }

    if (isPrep) {
      // Preparation: use fixed deterministic ETA
      const lsKey   = `spdidos_eta_${order.id}_preparing`;
      const etaMins = getEtaMinutes(order.id, 20, 30);
      const etaMs   = etaMins * 60 * 1000;
      let startTime = parseInt(localStorage.getItem(lsKey) ?? '0', 10);
      if (!startTime) { startTime = Date.now(); localStorage.setItem(lsKey, String(startTime)); }
      const calc = () => Math.max(0, Math.round((startTime + etaMs - Date.now()) / 1000));
      setSecsLeft(calc());
      setDistanceKm(null);
      const interval = setInterval(() => {
        const r = calc(); setSecsLeft(r); if (r === 0) clearInterval(interval);
      }, 1000);
      return () => clearInterval(interval);
    }

    // on_the_way: calculate from real GPS distance
    const clientCoords = getClientCoords();
    if (deliveryLocation && clientCoords) {
      const km = haversineKm(deliveryLocation.lat, deliveryLocation.lng, clientCoords.lat, clientCoords.lng);
      const mins = estimateMinutesFromKm(km);
      setDistanceKm(Math.round(km * 10) / 10);
      setSecsLeft(mins * 60);
    } else {
      // Fallback if no GPS coords available
      const lsKey   = `spdidos_eta_${order.id}_on_the_way`;
      const etaMins = getEtaMinutes(order.id, 15, 20);
      const etaMs   = etaMins * 60 * 1000;
      let startTime = parseInt(localStorage.getItem(lsKey) ?? '0', 10);
      if (!startTime) { startTime = Date.now(); localStorage.setItem(lsKey, String(startTime)); }
      const calc = () => Math.max(0, Math.round((startTime + etaMs - Date.now()) / 1000));
      setSecsLeft(calc());
      setDistanceKm(null);
      const interval = setInterval(() => {
        const r = calc(); setSecsLeft(r); if (r === 0) clearInterval(interval);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [order?.id, order?.status, deliveryLocation?.lat, deliveryLocation?.lng]);

  useEffect(() => {
    if (!order || ['delivered', 'cancelled'].includes(order.status)) {
      setCancelSecsLeft(null);
      return;
    }

    const startMs = new Date(order.createdAt as string).getTime();
    if (!Number.isFinite(startMs)) {
      setCancelSecsLeft(null);
      return;
    }

    const limitMs = 5 * 60 * 1000;
    const calc = () => Math.max(0, Math.round((startMs + limitMs - Date.now()) / 1000));
    setCancelSecsLeft(calc());

    const interval = setInterval(() => {
      const left = calc();
      setCancelSecsLeft(left);
      if (left <= 0) clearInterval(interval);
    }, 1000);

    return () => clearInterval(interval);
  }, [order?.id, order?.status, order?.createdAt]);

  const fmtTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = String(secs % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="max-w-lg mx-auto space-y-6 px-4 py-6">
      <div className="text-center space-y-1">
        <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto" />
        <h2 className="text-2xl font-black font-display tracking-tight">¡Pedido Confirmado!</h2>
        {order && <p className="text-gray-500 text-sm">#{order.id.slice(-8).toUpperCase()} · {order.businessName}</p>}
      </div>

      {/* Progress steps */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-900 mb-4">Estado en tiempo real</h3>
        <div className="space-y-3">
          {ORDER_STEPS.map((step, idx) => {
            const Icon = step.icon;
            const done = idx < stepIndex;
            const current = idx === stepIndex;
            return (
              <div key={step.status} className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                  done ? 'bg-emerald-500 text-white' : current ? 'bg-primary text-white ring-4 ring-primary/20' : 'bg-gray-100 text-gray-400'
                }`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className={`text-sm font-medium ${current ? 'text-primary font-bold' : done ? 'text-gray-500 line-through' : 'text-gray-400'}`}>
                  {step.label}
                </span>
                {current && <span className="ml-auto text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold animate-pulse">Ahora</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* ETA countdown — visible during 'preparing' and 'on_the_way' */}
      {secsLeft !== null && (order?.status === 'preparing' || order?.status === 'on_the_way') && (
        <div className={`rounded-2xl p-5 flex items-center gap-4 shadow-sm border ${
          order.status === 'preparing'
            ? 'bg-amber-50 border-amber-100'
            : 'bg-blue-50 border-blue-100'
        }`}>
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${
            order.status === 'preparing' ? 'bg-amber-100' : 'bg-blue-100'
          }`}>
            <span className="text-2xl">{order.status === 'preparing' ? '🍳' : '🛵'}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-xs font-bold uppercase tracking-wide mb-0.5 ${
              order.status === 'preparing' ? 'text-amber-500' : 'text-blue-500'
            }`}>
              {order.status === 'preparing' ? 'Tiempo estimado de preparación' : 'Tiempo estimado de llegada'}
            </p>
            {secsLeft > 0 ? (
              <>
                <p className={`text-3xl font-black tabular-nums ${
                  order.status === 'preparing' ? 'text-amber-700' : 'text-blue-700'
                }`}>
                  {fmtTime(secsLeft)} <span className="text-sm font-semibold opacity-60">min</span>
                </p>
                {distanceKm !== null && order.status === 'on_the_way' && (
                  <p className="text-xs text-blue-500 font-semibold mt-0.5">
                    📍 A {distanceKm < 1 ? `${Math.round(distanceKm * 1000)} m` : `${distanceKm} km`} de ti
                  </p>
                )}
              </>
            ) : (
              <p className={`text-base font-black animate-pulse ${
                order.status === 'preparing' ? 'text-amber-600' : 'text-blue-600'
              }`}>
                {order.status === 'preparing' ? '¡Casi listo! 🍽️' : '¡Llegando ahora! 📍'}
              </p>
            )}
          </div>
        </div>
      )}

      {cancelSecsLeft !== null && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 space-y-3">
          <p className="text-sm font-bold text-red-700">Cancelar pedido (solo en los primeros 5 minutos)</p>
          {cancelSecsLeft > 0 ? (
            <>
              <p className="text-xs text-red-600 font-semibold">
                Tienes {fmtTime(cancelSecsLeft)} para cancelar este pedido.
              </p>
              <button
                type="button"
                onClick={() => order && onCancelOrder?.(order)}
                className="w-full py-3 rounded-xl bg-red-600 text-white font-black hover:bg-red-700 transition-colors"
              >
                Cancelar pedido ahora
              </button>
            </>
          ) : (
            <p className="text-xs text-red-700 font-semibold">
              La ventana de 5 minutos ya venció. Este pedido no se puede cancelar.
            </p>
          )}
        </div>
      )}

      {/* Mapa cuando el repartidor está en camino */}
      {order?.status === 'on_the_way' && deliveryLocation && (() => {
        const clientCoords = getClientCoords();
        const clientPos: [number, number] | null = clientCoords ? [clientCoords.lat, clientCoords.lng] : null;
        const routePositions: [number, number][] = clientPos ? [deliverPos, clientPos] : [];
        return (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-50 flex items-center gap-2">
              <Navigation className="w-4 h-4 text-blue-600" />
              <span className="font-bold text-sm text-gray-900">Repartidor en camino</span>
              {distanceKm !== null && (
                <span className="ml-1 text-xs font-semibold text-blue-500">
                  · {distanceKm < 1 ? `${Math.round(distanceKm * 1000)} m` : `${distanceKm} km`}
                </span>
              )}
              <span className="ml-auto text-xs text-gray-400 animate-pulse flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full inline-block" /> En vivo
              </span>
            </div>
            <div className="h-[280px]">
              <MapContainer center={deliverPos} zoom={15} className="h-full w-full" scrollWheelZoom={false}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <MapAutoFit positions={clientPos ? [deliverPos, clientPos] : [deliverPos]} />
                <Marker position={deliverPos} icon={L.icon({ iconUrl: 'https://cdn-icons-png.flaticon.com/512/2972/2972185.png', iconSize: [36, 36], iconAnchor: [18, 36] })}>
                  <Popup>🛵 Tu repartidor</Popup>
                </Marker>
                {clientPos && (
                  <Marker position={clientPos} icon={L.icon({ iconUrl: 'https://cdn-icons-png.flaticon.com/512/484/484167.png', iconSize: [32, 32], iconAnchor: [16, 32] })}>
                    <Popup>📍 Tu ubicación</Popup>
                  </Marker>
                )}
                {routePositions.length === 2 && (
                  <Polyline positions={routePositions} pathOptions={{ color: '#3b82f6', weight: 4, dashArray: '10, 8', opacity: 0.8 }} />
                )}
              </MapContainer>
            </div>
            <div className="p-3 bg-blue-50/60 flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" />
                <span className="font-semibold text-gray-600">Repartidor</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
                <span className="font-semibold text-gray-600">Tu ubicación</span>
              </div>
              <div className="flex items-center gap-1.5 ml-auto">
                <span className="w-4 border-t-2 border-dashed border-blue-500 inline-block" />
                <span className="font-semibold text-gray-500">Ruta</span>
              </div>
            </div>
          </div>
        );
      })()}

      {order?.status === 'delivered' ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
          <p className="font-bold text-emerald-800">¡Pedido entregado! Buen provecho 🎉</p>
        </div>
      ) : null}

      <button onClick={onBack}
        className="w-full bg-primary text-white py-4 rounded-2xl font-bold hover:bg-primary/90 transition-all">
        Volver al Inicio
      </button>
    </div>
  );
};

// Register SW as early as possible (before user logs in) so notifications work immediately
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}
if ('Notification' in window && Notification.permission === 'default') {
  Notification.requestPermission().catch(() => {});
}

// ─── Push notification helper ────────────────────────────────────────────────
async function showPushNotification(title: string, body: string, tag = 'spdidos') {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(title, {
        body,
        icon:               '/logo_high_resolution.png',
        badge:              '/logo_high_resolution.png',
        tag,
        requireInteraction: true,
      } as NotificationOptions & { vibrate: number[] } as NotificationOptions);
      return;
    }
  } catch { /* ignore */ }
  try { new Notification(title, { body, icon: '/logo_high_resolution.png', tag }); } catch { }
}

// ─── Client Profile View ──────────────────────────────────────────────────────
const ProfileView: React.FC<{ onViewChange: (v: any) => void }> = ({ onViewChange }) => {
  const { user, logout, updateUser } = useAuth();
  const [form, setForm] = useState({ name: user?.name ?? '', phone: user?.phone ?? '', whatsapp: user?.whatsapp ?? '' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateUser({ name: form.name.trim(), phone: form.phone.trim(), whatsapp: form.whatsapp.trim() });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      alert('Error al guardar. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      key="profile"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="px-4 lg:px-8 py-8 max-w-lg mx-auto space-y-6"
    >
      <h2 className="text-2xl font-black text-gray-900">Mi Perfil</h2>

      {/* Avatar */}
      <div className="flex items-center gap-4 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-primary/20 flex-shrink-0">
          <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name}`} alt="avatar" className="w-full h-full" />
        </div>
        <div>
          <p className="font-black text-gray-900 text-lg">{user?.name}</p>
          <p className="text-sm text-gray-400">{user?.email}</p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
        <h3 className="font-bold text-gray-700 text-sm uppercase tracking-widest">Información personal</h3>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-bold text-gray-500 flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> Nombre completo</span>
          <input
            type="text"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            className="border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            placeholder="Tu nombre"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-bold text-gray-500 flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> Correo electrónico</span>
          <input
            type="email"
            value={user?.email ?? ''}
            disabled
            className="border border-gray-100 bg-gray-50 rounded-xl px-4 py-3 text-sm font-medium text-gray-400 cursor-not-allowed"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-bold text-gray-500 flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> Teléfono</span>
          <input
            type="tel"
            value={form.phone}
            onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
            className="border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            placeholder="809-XXX-XXXX"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-bold text-gray-500 flex items-center gap-1.5"><MessageCircle className="w-3.5 h-3.5" /> WhatsApp</span>
          <input
            type="tel"
            value={form.whatsapp}
            onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))}
            className="border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            placeholder="809-XXX-XXXX"
          />
        </label>

        <button
          onClick={handleSave}
          disabled={saving}
          className={`w-full py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all ${
            saved ? 'bg-emerald-500 text-white' : 'bg-primary text-white hover:bg-primary/90'
          }`}
        >
          {saved ? <><CheckCircle2 className="w-4 h-4" /> ¡Guardado!</> : saving ? 'Guardando…' : <><Save className="w-4 h-4" /> Guardar cambios</>}
        </button>
      </div>

      {/* Logout */}
      <button
        onClick={logout}
        className="w-full py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 border-2 border-red-100 text-red-500 hover:bg-red-50 transition-all"
      >
        <LogOut className="w-4 h-4" /> Cerrar sesión
      </button>
    </motion.div>
  );
};

function AppContent() {
  const { user, logout, updateUser } = useAuth();
  const [view, setView] = useState<View>('home');
  const [menuOriginView, setMenuOriginView] = useState<View>('home');
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [activeMenuCategory, setActiveMenuCategory] = useState<string>('all');
  const [menuSearchQuery, setMenuSearchQuery] = useState('');
  const [allBusinesses, setAllBusinesses] = useState<Business[]>([]);
  const [restaurantsSearchQuery, setRestaurantsSearchQuery] = useState('');
  const [restaurantsQuickFilter, setRestaurantsQuickFilter] = useState<'all' | 'discounts' | 'featured'>('all');
  const [restaurantsLayout, setRestaurantsLayout] = useState<'list' | 'compact'>('list');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(null);
  const [selectedDrinkSize, setSelectedDrinkSize] = useState<string | null>(null);
  const [modalNotes, setModalNotes] = useState('');
  const [modalQuantity, setModalQuantity] = useState(0);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [showCartHint, setShowCartHint] = useState(false);
  const [isCheckoutSubmitting, setIsCheckoutSubmitting] = useState(false);
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [deliveredOrders, setDeliveredOrders] = useState<Order[]>([]);
  const [cancelledOrders, setCancelledOrders] = useState<Order[]>([]);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [deliveryLocation, setDeliveryLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [arrivedOrderId, setArrivedOrderId] = useState<string | null>(null);
  const [homeAnnouncement, setHomeAnnouncement] = useState<HomeAnnouncement | null>(null);
  const deliveryUnsubRef = useRef<(() => void) | null>(null);
  const clientGpsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const checkoutLockRef = useRef(false);
  // ── Client: notify whenever an order is (or becomes) 'arrived' ─────────────
  const arrivedNotifiedIds = useRef<Set<string>>(new Set());

  // ── Business global notification (fires from any tab) ───────────────────────
  const [incomingOrder, setIncomingOrder] = useState<Order | null>(null);
  const [acceptedOrderSummary, setAcceptedOrderSummary] = useState<Order | null>(null);
  const [cancelledOrderNotice, setCancelledOrderNotice] = useState<Order | null>(null);
  const bizNotifiedIds  = useRef<Set<string>>(new Set());
  const bizCancelledNotifiedIds = useRef<Set<string>>(new Set());
  const bizShowingModal = useRef(false);
  const bizCancelledInited = useRef(false);

  // ── Delivery global notification (fires from any tab) ────────────────────────
  const deliveryKnownReadyIds  = useRef<Set<string>>(new Set());
  const deliveryGlobalInited   = useRef(false);

  // ── FCM: register SW, request permission, get token, start foreground listener
  useEffect(() => {
    if (!user?.id) return;
    initFCMToken().then(token => {
      if (!token) return;
      FirebaseServiceV2.saveFCMToken(
        user.id,
        token,
        user.role,
        (user as any).businessId ?? undefined
      );
    });
    listenFCMForeground();
  }, [user?.id]);

  useEffect(() => {
    const unsubscribe = FirebaseServiceV2.subscribeToHomeAnnouncement((announcement) => {
      setHomeAnnouncement(announcement);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user?.id || user.role !== 'client') return;

    // Latest snapshot kept so visibilitychange can re-check immediately
    let latestActive: Order[] = [];

    const notify = (orders: Order[]) => {
      orders.forEach(o => {
        if (o.status === 'arrived' && !arrivedNotifiedIds.current.has(o.id)) {
          arrivedNotifiedIds.current.add(o.id);
          setArrivedOrderId(o.id);
          soundService.startRinging();
          showPushNotification('¡Tu repartidor llegó! 🛵', 'Está en tu puerta esperando — abre la app para confirmar', 'arrived');
        }
      });
    };

    const unsub = FirebaseServiceV2.subscribeToClientOrders(user.id, (orders) => {
      const active = orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled');
      const deliveredHistory = orders
        .filter(o => o.status === 'delivered')
        .sort((a, b) => {
          const aTime = new Date((a.deliveredAt || a.createdAt) as string).getTime();
          const bTime = new Date((b.deliveredAt || b.createdAt) as string).getTime();
          return bTime - aTime;
        });
      const cancelledHistory = orders
        .filter(o => o.status === 'cancelled')
        .sort((a, b) => {
          const aTime = new Date((a.cancelledAt || a.createdAt) as string).getTime();
          const bTime = new Date((b.cancelledAt || b.createdAt) as string).getTime();
          return bTime - aTime;
        });
      latestActive = active;
      notify(active);
      setActiveOrders(active);
      setDeliveredOrders(deliveredHistory);
      setCancelledOrders(cancelledHistory);
    });

    // When screen unlocks / tab becomes visible again, clear 'arrived' IDs so
    // the notification re-fires in case it was missed while the tab was suspended
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      latestActive
        .filter(o => o.status === 'arrived')
        .forEach(o => arrivedNotifiedIds.current.delete(o.id));
      notify(latestActive);
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      unsub();
      soundService.stopRinging();
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [user?.id, user?.role]);

  // Global subscription for business users — active regardless of current tab
  useEffect(() => {
    if (user?.role !== 'business') return;
    const businessId = (user as any)?.businessId;
    if (!businessId) return;
    const unsub = FirebaseServiceV2.subscribeToBusinessOrders(businessId, (data) => {
      if (!bizShowingModal.current) {
        const pending = data.find(
          o => o.status === 'pending' && !bizNotifiedIds.current.has(o.id)
        );
        if (pending) {
          bizNotifiedIds.current.add(pending.id);
          bizShowingModal.current = true;
          setIncomingOrder(pending);
          soundService.startRinging();
          showPushNotification('¡Nuevo Pedido! 🔔', `${pending.clientName} — RD$ ${pending.total?.toFixed(0)}`, 'new-order');
        }
      }

      const cancelledByClient = data.filter((o) => {
        if (o.status !== 'cancelled') return false;
        if ((o as any).cancelledByClient === true) return true;
        const reason = String((o as any).cancellationReason || '').toLowerCase();
        return reason.includes('cliente');
      });

      if (!bizCancelledInited.current) {
        cancelledByClient.forEach((o) => bizCancelledNotifiedIds.current.add(o.id));
        bizCancelledInited.current = true;
      } else {
        const newlyCancelled = cancelledByClient.find((o) => !bizCancelledNotifiedIds.current.has(o.id));
        if (newlyCancelled) {
          bizCancelledNotifiedIds.current.add(newlyCancelled.id);
          setCancelledOrderNotice(newlyCancelled);
          soundService.startCancelledRinging();
          showPushNotification(
            'Pedido cancelado por cliente ❌',
            `Lo siento, el cliente ${newlyCancelled.clientName} canceló el pedido`,
            'order-cancelled'
          );
        }
      }
    });
    return () => { unsub(); soundService.stopRinging(); };
  }, [user?.role, (user as any)?.businessId]);

  const handleDismissCancelledBusiness = () => {
    soundService.stopRinging();
    setCancelledOrderNotice(null);
  };

  const handleCloseAcceptedSummary = () => {
    setAcceptedOrderSummary(null);
  };

  const handleAcceptBusiness = async () => {
    if (!incomingOrder) return;
    soundService.stopRinging();
    bizShowingModal.current = false;
    const order = incomingOrder;
    setIncomingOrder(null);
    try {
      const acceptedAt = new Date().toISOString();
      await FirebaseServiceV2.updateOrder(order.id, { status: 'accepted', acceptedAt });
      setAcceptedOrderSummary({ ...order, status: 'accepted', acceptedAt });
    }
    catch (err) { console.error('Error aceptando pedido:', err); }
  };

  const handleRejectBusiness = async () => {
    if (!incomingOrder) return;
    soundService.stopRinging();
    bizShowingModal.current = false;
    const order = incomingOrder;
    setIncomingOrder(null);
    try { await FirebaseServiceV2.updateOrder(order.id, { status: 'cancelled' }); }
    catch (err) { console.error('Error rechazando pedido:', err); }
  };

  // Global subscription for delivery users — rings on new ready orders from any tab
  useEffect(() => {
    if (user?.role !== 'delivery') return;
    const unsub = FirebaseServiceV2.subscribeToDeliveryOrders((orders) => {
      const available = orders.filter(o => o.status === 'ready');
      const myActive  = orders.find(o => o.deliveryId === user.id && (o.status === 'on_the_way' || o.status === 'arrived'));

      if (!deliveryGlobalInited.current) {
        available.forEach(o => deliveryKnownReadyIds.current.add(o.id));
        deliveryGlobalInited.current = true;
      } else {
        const hasNew = available.some(o => !deliveryKnownReadyIds.current.has(o.id));
        if (hasNew && !myActive) {
          soundService.startRinging();
          showPushNotification('¡Pedido disponible! 📦', 'Hay un nuevo pedido listo para recoger', 'ready-order');
        }
        if (available.length === 0)  soundService.stopRinging();
        available.forEach(o => deliveryKnownReadyIds.current.add(o.id));
      }
    });
    return () => { unsub(); soundService.stopRinging(); };
  }, [user?.role, user?.id]);

  const handleConfirmArrival = () => {
    soundService.stopRinging();
    setArrivedOrderId(null);
  };

  // Subscribe to delivery location when order is on the way
  useEffect(() => {
    if (deliveryUnsubRef.current) { deliveryUnsubRef.current(); deliveryUnsubRef.current = null; }
    if (!activeOrderId) return;
    deliveryUnsubRef.current = FirebaseServiceV2.subscribeToDeliveryLocation(activeOrderId, (loc) => {
      setDeliveryLocation(loc);
    });
    return () => { if (deliveryUnsubRef.current) deliveryUnsubRef.current(); };
  }, [activeOrderId]);

  useEffect(() => {
    const loadBusinesses = async () => {
      try {
        const businesses = await FirebaseServiceV2.getBusinesses();
        setAllBusinesses(businesses);
      } catch (error) {
        console.error('❌ [App] Error cargando negocios para favoritos:', error);
      }
    };

    loadBusinesses();
  }, []);

  // Keep client GPS updated while order is active (every 30s)
  useEffect(() => {
    if (clientGpsIntervalRef.current) { clearInterval(clientGpsIntervalRef.current); clientGpsIntervalRef.current = null; }
    if (!activeOrderId || !navigator.geolocation) return;
    const sendLocation = () => {
      navigator.geolocation.getCurrentPosition((pos) => {
        FirebaseServiceV2.updateClientLocation(activeOrderId, pos.coords.latitude, pos.coords.longitude);
      }, () => {}, { enableHighAccuracy: true, timeout: 8000 });
    };
    sendLocation();
    clientGpsIntervalRef.current = setInterval(sendLocation, 30000);
    return () => { if (clientGpsIntervalRef.current) clearInterval(clientGpsIntervalRef.current); };
  }, [activeOrderId]);

  if (!user) {
    return <Auth />;
  }

  const addToCart = (id: string, name: string, price: number, notes?: string) => {
    const normalizedNotes = (notes || '').trim();
    setCart(prev => {
      const existing = prev.find(i => i.id === id && (i.notes || '') === normalizedNotes);
      if (existing) {
        return prev.map(i => (
          i.id === id && (i.notes || '') === normalizedNotes
            ? { ...i, quantity: i.quantity + 1 }
            : i
        ));
      }
      return [...prev, { id, name, price, quantity: 1, notes: normalizedNotes || undefined }];
    });
  };

  const removeFromCart = (id: string, notes?: string) => {
    const normalizedNotes = (notes || '').trim();
    setCart(prev => {
      const existing = prev.find(i => i.id === id && (i.notes || '') === normalizedNotes);
      if (existing && existing.quantity > 1) {
        return prev.map(i => (
          i.id === id && (i.notes || '') === normalizedNotes
            ? { ...i, quantity: i.quantity - 1 }
            : i
        ));
      }
      return prev.filter(i => !(i.id === id && (i.notes || '') === normalizedNotes));
    });
  };

  const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const favoriteBusinessIds = user?.favoriteBusinessIds || [];
  const isCurrentBusinessFavorite = !!selectedBusiness && favoriteBusinessIds.includes(selectedBusiness.id);
  const selectedBusinessMenu = selectedBusiness?.menu || [];
  const normalizeSearchText = (value: string) =>
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  const normalizedSearchQuery = normalizeSearchText(menuSearchQuery.trim());
  const isDrinkItem = (item?: MenuItem | null) => {
    if (!item) return false;
    const category = normalizeSearchText(item.category || '');
    const text = normalizeSearchText(`${item.name || ''} ${item.description || ''}`);
    return category.includes('bebida') || text.includes('jugo') || text.includes('refresco') || text.includes('batida');
  };
  const getDrinkSizeOptionsFromDescription = (item?: MenuItem | null) => {
    if (!item) return [] as { size: string; price: number | null }[];

    if ((item.drinkSizes || []).length > 0) {
      return (item.drinkSizes || [])
        .filter((size) => size.size && Number.isFinite(size.price) && size.price > 0)
        .map((size) => ({ size: size.size.trim().toLowerCase(), price: size.price }));
    }

    const description = item.description || '';
    const optionsWithPrice: { size: string; price: number | null }[] = [];
    const seen = new Set<string>();

    const sizePriceRegex = /(\d{1,3}\s?(?:oz|ml|l))\s*(?:-|=|:)?\s*(?:rd\$?\s*)?(\d{1,5}(?:\.\d{1,2})?)/gi;
    let match = sizePriceRegex.exec(description);
    while (match) {
      const size = match[1].replace(/\s+/g, ' ').trim().toLowerCase();
      const price = Number(match[2]);
      if (!seen.has(size)) {
        seen.add(size);
        optionsWithPrice.push({ size, price: Number.isFinite(price) ? price : null });
      }
      match = sizePriceRegex.exec(description);
    }

    const sizeOnlyRegex = /\b\d{1,3}\s?(oz|ml|l)\b/gi;
    const sizeOnlyMatches = description.match(sizeOnlyRegex) || [];
    sizeOnlyMatches.forEach((rawSize) => {
      const size = rawSize.replace(/\s+/g, ' ').trim().toLowerCase();
      if (!seen.has(size)) {
        seen.add(size);
        optionsWithPrice.push({ size, price: null });
      }
    });

    return optionsWithPrice;
  };
  const menuCategories = (() => {
    const categories = Array.from(new Set(selectedBusinessMenu.map((item: any) => item.category || 'General')));
    const hasDrinkItems = selectedBusinessMenu.some((item: any) => isDrinkItem(item));
    if (hasDrinkItems && !categories.some((category) => normalizeSearchText(String(category)).includes('bebida'))) {
      categories.push('Bebidas');
    }
    return ['all', ...categories];
  })();
  const filteredMenuItems = selectedBusinessMenu
    .filter((item: any) => {
      if (activeMenuCategory === 'all') return true;
      if (normalizeSearchText(activeMenuCategory) === 'bebidas') return isDrinkItem(item);
      return (item.category || 'General') === activeMenuCategory;
    })
    .filter((item: any) => {
      if (!normalizedSearchQuery) return true;
      const searchable = normalizeSearchText(`${item.name || ''} ${item.description || ''} ${item.category || ''}`);
      return searchable.includes(normalizedSearchQuery);
    });
  const normalizedRestaurantsSearchQuery = normalizeSearchText(restaurantsSearchQuery.trim());
  const getTodayKey = (): BusinessDayKey => {
    const weekMap: BusinessDayKey[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return weekMap[new Date().getDay()];
  };
  const toMinutes = (value?: string) => {
    if (!value) return null;
    const [h, m] = value.split(':').map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    return h * 60 + m;
  };
  const formatHour = (value?: string) => {
    if (!value) return '--:--';
    const [h, m] = value.split(':').map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return value;
    const suffix = h >= 12 ? 'PM' : 'AM';
    const hh = ((h + 11) % 12) + 1;
    return `${hh}:${String(m).padStart(2, '0')} ${suffix}`;
  };
  const getBusinessOpenInfo = (business: Business) => {
    const todayKey = getTodayKey();
    const todaySchedule = business.weeklySchedule?.[todayKey];
    const opening = todaySchedule?.openingTime || business.openingTime || '08:00';
    const closing = todaySchedule?.closingTime || business.closingTime || '22:00';

    if (todaySchedule && !todaySchedule.isOpen) {
      return { isOpen: false, label: 'Cerrado por hoy', detail: 'Hoy no abre' };
    }

    const start = toMinutes(opening);
    const end = toMinutes(closing);
    if (start === null || end === null) {
      return { isOpen: true, label: 'Abierto ahora', detail: `Cierra a las ${formatHour(closing)}` };
    }
    const now = new Date();
    const current = now.getHours() * 60 + now.getMinutes();
    const isOpen = start < end ? current >= start && current < end : current >= start || current < end;
    return {
      isOpen,
      label: isOpen ? 'Abierto ahora' : 'Cerrado por hoy',
      detail: isOpen ? `Cierra a las ${formatHour(closing)}` : `Abre a las ${formatHour(opening)}`,
    };
  };
  const activeBusinesses = allBusinesses.filter((business) => business.status === 'active');
  const restaurantsVisible = activeBusinesses
    .filter((business) => {
      if (!normalizedRestaurantsSearchQuery) return true;
      const searchable = normalizeSearchText(`${business.name || ''} ${business.category || ''} ${business.address || ''}`);
      return searchable.includes(normalizedRestaurantsSearchQuery);
    })
    .filter((business) => {
      if (restaurantsQuickFilter === 'featured') return (business.rating || 0) >= 4.6;
      if (restaurantsQuickFilter === 'discounts') return (business.totalOrders || 0) % 2 === 0;
      return true;
    });

  const handleHomeCategorySelect = (categoryId: string) => {
    if (categoryId === 'restaurants') {
      setRestaurantsSearchQuery('');
      setRestaurantsQuickFilter('all');
      setRestaurantsLayout('list');
      setView('restaurants');
    }
  };

  const handleBusinessSelect = (business: Business) => {
    setSelectedBusiness(business);
    setMenuOriginView(view);
    setMenuSearchQuery('');
    setActiveMenuCategory('all');
    setSelectedMenuItem(null);
    setView('menu' as any);
  };

  const toggleFavoriteByBusinessId = async (businessId: string) => {
    if (!user) return;
    const alreadyFavorite = favoriteBusinessIds.includes(businessId);
    const nextFavorites = alreadyFavorite
      ? favoriteBusinessIds.filter((id) => id !== businessId)
      : [...favoriteBusinessIds, businessId];
    try {
      await updateUser({ favoriteBusinessIds: nextFavorites });
    } catch (error) {
      console.error('❌ [App] Error actualizando favoritos:', error);
    }
  };

  const toggleFavoriteBusiness = async () => {
    if (!selectedBusiness || !user) return;

    const alreadyFavorite = favoriteBusinessIds.includes(selectedBusiness.id);
    const nextFavorites = alreadyFavorite
      ? favoriteBusinessIds.filter((id) => id !== selectedBusiness.id)
      : [...favoriteBusinessIds, selectedBusiness.id];

    try {
      await updateUser({ favoriteBusinessIds: nextFavorites });
    } catch (error) {
      console.error('❌ [App] Error actualizando favoritos:', error);
      alert('No se pudo actualizar favoritos. Intenta de nuevo.');
    }
  };

  const getClientGPS = (): Promise<{ lat: number; lng: number } | null> =>
    new Promise((resolve) => {
      if (!navigator.geolocation) { resolve(null); return; }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
    });

  const ORDER_CANCEL_WINDOW_MS = 5 * 60 * 1000;

  const getOrderCreatedMs = (order: Order): number | null => {
    const parsed = new Date(order.createdAt as string).getTime();
    return Number.isFinite(parsed) ? parsed : null;
  };

  const canClientCancelOrder = (order: Order): boolean => {
    if (['delivered', 'cancelled'].includes(order.status)) return false;
    const createdMs = getOrderCreatedMs(order);
    if (!createdMs) return false;
    return Date.now() - createdMs <= ORDER_CANCEL_WINDOW_MS;
  };

  const getOrderCancelTimeLeftText = (order: Order): string => {
    const createdMs = getOrderCreatedMs(order);
    if (!createdMs) return '0:00';
    const leftMs = Math.max(0, ORDER_CANCEL_WINDOW_MS - (Date.now() - createdMs));
    const totalSeconds = Math.floor(leftMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  };

  const handleClientCancelOrder = async (order: Order) => {
    if (!user) return;
    if (order.clientId !== user.id) {
      alert('No puedes cancelar este pedido.');
      return;
    }
    if (!canClientCancelOrder(order)) {
      alert('Solo puedes cancelar en los primeros 5 minutos después de confirmar el pedido.');
      return;
    }

    const confirmed = window.confirm('¿Seguro que deseas cancelar este pedido?');
    if (!confirmed) return;

    const previousActiveOrders = activeOrders;
    const previousCancelledOrders = cancelledOrders;
    const wasTrackingThisOrder = activeOrderId === order.id;

    // Optimistic UI: mark as cancelled immediately in client panel/history
    setActiveOrders(prev => prev.filter(o => o.id !== order.id));
    setCancelledOrders(prev => [{
      ...order,
      status: 'cancelled',
      cancelledAt: new Date().toISOString(),
      cancelledByClient: true,
      cancellationReason: 'Cancelado por cliente en los primeros 5 minutos'
    }, ...prev.filter(o => o.id !== order.id)]);
    if (wasTrackingThisOrder) {
      setActiveOrderId(null);
      setDeliveryLocation(null);
    }

    try {
      await FirebaseServiceV2.updateOrder(order.id, {
        status: 'cancelled',
        cancelledAt: new Date().toISOString(),
        cancelledByClient: true,
        cancellationReason: 'Cancelado por cliente en los primeros 5 minutos'
      });
    } catch (error) {
      setActiveOrders(previousActiveOrders);
      setCancelledOrders(previousCancelledOrders);
      if (wasTrackingThisOrder) {
        setActiveOrderId(order.id);
      }
      console.error('Error cancelando pedido por cliente:', error);
      alert('No se pudo cancelar el pedido. Intenta nuevamente.');
    }
  };

  const handleCheckout = async () => {
    if (!selectedBusiness || !user) return;

    if (checkoutLockRef.current) return;
    checkoutLockRef.current = true;
    setIsCheckoutSubmitting(true);

    try {
      // Capture GPS before saving
      let gps = await getClientGPS();
      if (!gps) {
        const shouldRetryLocation = window.confirm(
          'Debes activar la ubicación (GPS) para poder hacer pedidos. Presiona "Aceptar" para intentar activar la ubicación ahora.'
        );
        if (!shouldRetryLocation) return;

        gps = await getClientGPS();
        if (!gps) {
          alert('No pudimos obtener tu ubicación. Activa el permiso de ubicación "Mientras usas la app" en tu navegador/teléfono y vuelve a intentar.');
          return;
        }
      }
      const orderData: any = {
        clientId: user.id,
        clientName: user.name,
        clientEmail: user.email,
        clientPhone: user.phone || user.whatsapp,
        clientWhatsapp: user.whatsapp,
        businessId: selectedBusiness.id,
        businessName: selectedBusiness.name,
        businessEmail: selectedBusiness.email || '',
        businessPhone: selectedBusiness.phone || '',
        items: cart.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          notes: item.notes || ''
        })),
        subtotal: cartTotal,
        deliveryFee: 50,
        total: cartTotal + 50,
        status: 'pending',
        paymentMethod: 'cash',
        deliveryAddress: '',
        deliveryInstructions: ''
      };
      orderData.clientLocation = { lat: gps.lat, lng: gps.lng };
      orderData.clientLat = gps.lat;
      orderData.clientLng = gps.lng;
      const saved = await FirebaseServiceV2.addOrder(orderData);
      // Save to client_locations collection too
      await FirebaseServiceV2.updateClientLocation(saved.id, gps.lat, gps.lng);
      setActiveOrderId(saved.id);
      setView('tracking');
      setIsCartOpen(false);
      setCart([]);
    } catch (err) {
      console.error('Error al crear pedido:', err);
      alert('Error al crear el pedido. Intenta nuevamente.');
    } finally {
      checkoutLockRef.current = false;
      setIsCheckoutSubmitting(false);
    }
  };

  // If user is not a client, show their specific view directly
  if (user.role === 'delivery') return <DeliveryView />;
  if (user.role === 'business') return (
    <>
      <AnimatePresence>
        {acceptedOrderSummary && (
          <AcceptedOrderSummaryModal
            order={acceptedOrderSummary}
            onClose={handleCloseAcceptedSummary}
          />
        )}
        {cancelledOrderNotice && (
          <CancelledOrderModal
            order={cancelledOrderNotice}
            onClose={handleDismissCancelledBusiness}
          />
        )}
        {incomingOrder && (
          <IncomingOrderModal
            order={incomingOrder}
            onAccept={handleAcceptBusiness}
            onReject={handleRejectBusiness}
          />
        )}
      </AnimatePresence>
      <BusinessView />
    </>
  );
  if (user.role === 'admin') return <AdminView />;

  return (
    <>
      <AnimatePresence>
        {arrivedOrderId && (
          <ArrivalNotificationModal onConfirm={handleConfirmArrival} />
        )}
      </AnimatePresence>
    <Layout
      activeView={view}
      onViewChange={setView}
      cartCount={cart.reduce((a, b) => a + b.quantity, 0)}
      onCartClick={() => setIsCartOpen(true)}
      showCartHint={showCartHint}
      onCartHintDismiss={() => setShowCartHint(false)}
      orderCount={activeOrders.length}
    >
      <AnimatePresence mode="wait">
        {view === 'home' && (
          <motion.div
            key="home"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <HomeView announcement={homeAnnouncement ?? undefined} onSelectCategory={handleHomeCategorySelect}>
              <BusinessList onBusinessSelect={handleBusinessSelect} />
            </HomeView>
          </motion.div>
        )}

        {view === 'restaurants' && (
          <motion.div
            key="restaurants"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="px-4 lg:px-8 py-5 space-y-4"
          >
            <div className="flex items-center gap-3">
              <button onClick={() => setView('home')} className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <input
                value={restaurantsSearchQuery}
                onChange={(e) => setRestaurantsSearchQuery(e.target.value)}
                placeholder="Buscar locales y platos"
                className="flex-1 h-11 rounded-full bg-white border border-gray-100 px-4 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="flex gap-3 overflow-x-auto pb-1">
              {['Saludable', 'Comida dominicana', 'Sándwiches', 'Pollo'].map((category) => (
                <button key={category} className="flex-shrink-0 bg-white rounded-2xl p-2.5 w-[88px] border border-gray-100 text-center">
                  <div className="w-14 h-14 rounded-xl bg-gray-100 mx-auto mb-2 overflow-hidden">
                    <img src={`https://picsum.photos/seed/${encodeURIComponent(category)}/120/120`} alt={category} className="w-full h-full object-cover" />
                  </div>
                  <p className="text-xs font-semibold text-gray-700 leading-tight">{category}</p>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <button className="px-3 py-2 rounded-full bg-white border border-gray-200 text-sm font-semibold">Filtrar</button>
              <button className="px-3 py-2 rounded-full bg-white border border-gray-200 text-sm font-semibold">Ordenar</button>
              <button
                onClick={() => setRestaurantsQuickFilter((prev) => (prev === 'discounts' ? 'all' : 'discounts'))}
                className={`px-3 py-2 rounded-full text-sm font-semibold border ${
                  restaurantsQuickFilter === 'discounts' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white border-gray-200'
                }`}
              >
                Descuentos
              </button>
              <button
                onClick={() => setRestaurantsQuickFilter((prev) => (prev === 'featured' ? 'all' : 'featured'))}
                className={`px-3 py-2 rounded-full text-sm font-semibold border ${
                  restaurantsQuickFilter === 'featured' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white border-gray-200'
                }`}
              >
                Destacados
              </button>
            </div>

            <div className="bg-yellow-300 text-gray-900 px-4 py-3 rounded-2xl text-sm font-bold">
              ¡Tu primer envío es gratis! Pide lo que quieras.
            </div>

            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-black text-gray-900">{restaurantsVisible.length} restaurantes</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setRestaurantsLayout('compact')}
                  className={`w-9 h-9 rounded-full flex items-center justify-center ${restaurantsLayout === 'compact' ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setRestaurantsLayout('list')}
                  className={`w-9 h-9 rounded-full flex items-center justify-center ${restaurantsLayout === 'list' ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className={`pb-6 ${restaurantsLayout === 'compact' ? 'grid grid-cols-1 sm:grid-cols-2 gap-4' : 'space-y-4'}`}>
              {restaurantsVisible.map((business) => {
                const isFavorite = favoriteBusinessIds.includes(business.id);
                const openInfo = getBusinessOpenInfo(business);
                return (
                  <div key={business.id} className="bg-white rounded-3xl border border-gray-100 p-3 shadow-sm">
                    <button onClick={() => handleBusinessSelect(business)} className="w-full text-left">
                      <div className="relative h-40 rounded-2xl overflow-hidden">
                        <img
                          src={business.image}
                          alt={business.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/business/800/420';
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-black/10" />
                        <span className={`absolute left-3 bottom-3 text-xs font-black px-3 py-1 rounded-full ${
                          openInfo.isOpen ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-gray-900'
                        }`}>
                          {openInfo.label}
                        </span>
                      </div>
                    </button>

                    <div className="pt-3 px-1 flex items-start justify-between gap-2">
                      <button onClick={() => handleBusinessSelect(business)} className="text-left min-w-0">
                        <h3 className="text-2xl font-black text-gray-900 leading-tight truncate">{business.name}</h3>
                        <p className="text-sm text-gray-500 truncate">$ · {business.category || 'Comida'} · {business.address || 'San Pedro de Macorís'}</p>
                        <p className="text-sm text-gray-700 mt-1 flex items-center gap-2">
                          <Clock className="w-4 h-4" /> {openInfo.detail}
                        </p>
                      </button>

                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-gray-800 flex items-center gap-1">
                          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" /> {business.rating || 4.8}
                        </span>
                        <button
                          onClick={() => toggleFavoriteByBusinessId(business.id)}
                          className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center"
                          title={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                        >
                          <Heart className={`w-4 h-4 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-500'}`} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {view === 'restaurant' && selectedBusiness && (
          <motion.div 
            key="restaurant"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8 px-4 lg:px-0"
          >
            <div className="flex items-center gap-4">
              <button onClick={() => setView('home')} className="p-2 hover:bg-white rounded-full transition-all shadow-sm">
                <ChevronLeft className="w-6 h-6" />
              </button>
              <h2 className="text-3xl font-black font-display tracking-tight">{selectedBusiness.name}</h2>
            </div>

            {/* Perfil del Negocio - Vista Cliente */}
            <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-gray-100">
              <div className="flex flex-col items-center text-center space-y-4">
                {/* Foto de perfil circular */}
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg">
                  <img 
                    src={selectedBusiness.image} 
                    alt={selectedBusiness.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/restaurant/400/400';
                    }}
                  />
                </div>
                
                <div>
                  <h3 className="text-2xl font-black text-gray-900">{selectedBusiness.name}</h3>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                    <span className="font-bold text-lg">{selectedBusiness.rating || 4.8}</span>
                  </div>
                </div>

                {/* Información del negocio */}
                <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 text-left">
                  {selectedBusiness.description && (
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Descripción</p>
                      <p className="text-gray-700">{selectedBusiness.description}</p>
                    </div>
                  )}
                  
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Dirección</p>
                    <div className="flex items-center gap-2 text-gray-700">
                      <MapPin className="w-4 h-4" />
                      <span>{selectedBusiness.address || 'San Pedro de Macorís'}</span>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Teléfono</p>
                    <p className="text-gray-700">{selectedBusiness.phone || '809-XXX-XXXX'}</p>
                  </div>
                  
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">WhatsApp</p>
                    <p className="text-gray-700">{selectedBusiness.whatsapp || selectedBusiness.phone || '809-XXX-XXXX'}</p>
                  </div>
                  
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Tiempo de Entrega</p>
                    <div className="flex items-center gap-2 text-gray-700">
                      <Clock className="w-4 h-4" />
                      <span>{selectedBusiness.deliveryTime || '25-35 min'}</span>
                    </div>
                  </div>

                  {selectedBusiness.cuisine && (
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Tipo de Comida</p>
                      <p className="text-gray-700">{selectedBusiness.cuisine}</p>
                    </div>
                  )}
                </div>

                {/* Botón para ver menú */}
                <button
                  onClick={() => setView('menu')}
                  className="mt-6 w-full bg-primary text-white py-4 rounded-2xl font-bold hover:bg-primary/90 transition-all"
                >
                  Ver Menú
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {view === 'menu' && selectedBusiness && (
          <motion.div 
            key="menu"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-5 px-4 lg:px-0"
          >
            <div className="flex items-center gap-2 md:gap-4">
              <button onClick={() => setView(menuOriginView === 'restaurant' ? 'home' : menuOriginView)} className="w-11 h-11 bg-white rounded-full flex items-center justify-center shadow-sm">
                <ChevronLeft className="w-6 h-6" />
              </button>
              <input
                value={menuSearchQuery}
                onChange={(e) => setMenuSearchQuery(e.target.value)}
                placeholder={`Buscar en ${selectedBusiness.name}`}
                className="flex-1 bg-white rounded-full h-11 px-4 text-sm font-medium shadow-sm border border-gray-100 outline-none focus:ring-2 focus:ring-primary/20"
              />
              <button
                onClick={toggleFavoriteBusiness}
                className={`w-11 h-11 rounded-full flex items-center justify-center shadow-sm border transition-all ${
                  isCurrentBusinessFavorite ? 'bg-red-50 border-red-200 text-red-500' : 'bg-white border-gray-100 text-gray-500'
                }`}
                title={isCurrentBusinessFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
              >
                <Heart className={`w-5 h-5 ${isCurrentBusinessFavorite ? 'fill-red-500 text-red-500' : ''}`} />
              </button>
            </div>

            <div className="bg-white rounded-[2rem] p-5 shadow-sm border border-black/5">
              <div className="flex items-center gap-3 mb-4">
                <img
                  src={selectedBusiness.image}
                  alt={selectedBusiness.name}
                  className="w-14 h-14 rounded-xl object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/restaurant/200/200';
                  }}
                />
                <div className="min-w-0">
                  <h3 className="text-2xl font-black text-gray-900 truncate">{selectedBusiness.name}</h3>
                  <p className="text-sm text-gray-500 flex items-center gap-1"><Star className="w-4 h-4 text-yellow-400 fill-yellow-400" /> {selectedBusiness.rating || 4.8}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-1 mb-5">
                {menuCategories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setActiveMenuCategory(category)}
                    className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${
                      activeMenuCategory === category ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {category === 'all' ? 'Menú' : category}
                  </button>
                ))}
              </div>
              
              {selectedBusinessMenu.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {filteredMenuItems.map((item: any) => (
                      <div key={item.id} className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedMenuItem(item);
                            setSelectedDrinkSize(null);
                            setModalQuantity(0);
                          }}
                          className="relative h-32 md:h-40 overflow-hidden w-full text-left"
                        >
                          <img
                            src={item.image || 'https://picsum.photos/seed/food/300/200'}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        </button>
                        <div className="p-3">
                          <h5 className="font-bold text-gray-900 text-[15px] leading-tight line-clamp-2">{item.name}</h5>
                          <p className="text-sm text-gray-500 mt-1 line-clamp-2 min-h-[2.5rem]">{item.description || 'Sin descripción disponible'}</p>
                          <p className="text-lg font-black text-gray-900 mt-2">RD$ {item.price}</p>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">🍽️</span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Menú no disponible</h3>
                  <p className="text-gray-400">Este negocio aún no ha agregado productos a su menú</p>
                </div>
              )}

              {selectedBusinessMenu.length > 0 && filteredMenuItems.length === 0 && (
                <div className="text-center py-12">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">No encontramos resultados</h3>
                  <p className="text-gray-500">Prueba con otro nombre, por ejemplo: pizza, hamburguesa o jugo.</p>
                </div>
              )}

              <AnimatePresence>
                {selectedMenuItem && (
                  (() => {
                    const isDrink = isDrinkItem(selectedMenuItem);
                    const drinkSizeOptions = getDrinkSizeOptionsFromDescription(selectedMenuItem);
                    const activeDrinkSize = selectedDrinkSize || drinkSizeOptions[0]?.size || null;
                    const activeDrinkOption = drinkSizeOptions.find((opt) => opt.size === activeDrinkSize) || null;
                    const selectedPrice = activeDrinkOption?.price ?? selectedMenuItem.price;
                    return (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[120] bg-black/55 backdrop-blur-sm flex items-end sm:items-center justify-center"
                    onClick={() => {
                      setSelectedMenuItem(null);
                      setSelectedDrinkSize(null);
                      setModalNotes('');
                    }}
                  >
                    <motion.div
                      initial={{ y: 36, opacity: 0.9 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: 36, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 240, damping: 24 }}
                      className="w-full h-[96dvh] sm:h-auto sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="relative h-72 sm:h-72">
                        <img
                          src={selectedMenuItem.image || 'https://picsum.photos/seed/food/700/500'}
                          alt={selectedMenuItem.name}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedMenuItem(null);
                            setSelectedDrinkSize(null);
                            setModalNotes('');
                          }}
                          className="absolute top-4 left-4 w-10 h-10 rounded-full bg-white/90 text-gray-700 flex items-center justify-center"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                          type="button"
                          className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/90 text-gray-700 flex items-center justify-center"
                        >
                          <Heart className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="flex-1 overflow-y-auto p-5 space-y-5">
                        <div>
                          <h4 className="text-[2rem] leading-tight font-black text-gray-900">{selectedMenuItem.name}</h4>
                          <p className="text-gray-500 mt-2">{selectedMenuItem.description || 'Sin descripción disponible'}</p>
                          <p className="text-3xl font-black text-gray-900 mt-4">RD$ {selectedPrice}</p>
                        </div>

                        {isDrink && (
                          <div className="border-t border-gray-100 pt-4">
                            <div className="flex items-center justify-between">
                              <p className="text-2xl font-black text-gray-900">Tamaño</p>
                              <span className="text-xs px-3 py-1 rounded-full bg-gray-100 text-gray-600 font-bold">Requerido</span>
                            </div>
                            <p className="text-gray-500 mt-1">Elige 1 opción</p>

                            <div className="mt-3 space-y-2">
                              {(drinkSizeOptions.length > 0 ? drinkSizeOptions : [{ size: '16 oz', price: null }]).map((option) => {
                                const sizeOption = option.size;
                                const isSelected = (selectedDrinkSize || drinkSizeOptions[0]?.size || '16 oz') === sizeOption;
                                return (
                                  <button
                                    key={sizeOption}
                                    type="button"
                                    onClick={() => setSelectedDrinkSize(sizeOption)}
                                    className={`w-full flex items-center justify-between rounded-xl border px-4 py-3 ${isSelected ? 'border-primary bg-primary/5' : 'border-gray-200'}`}
                                  >
                                    <span className="font-semibold text-gray-800 uppercase">{sizeOption}</span>
                                    <span className="text-sm font-bold text-gray-500">{option.price ? `RD$ ${option.price}` : ''}</span>
                                    <div className={`w-5 h-5 rounded-full border-2 ${isSelected ? 'border-primary bg-primary' : 'border-gray-300'}`} />
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        <div className="border-t border-gray-100 pt-4">
                          <div className="flex items-center justify-between">
                            <p className="text-2xl font-black text-gray-900">Preferencias</p>
                          </div>
                          <p className="text-gray-500 mt-1">Agrega una nota con tu petición para este artículo</p>
                          <div className="mt-3">
                            <label className="text-sm font-bold text-gray-700">Notas</label>
                            <textarea
                              value={modalNotes}
                              onChange={(e) => setModalNotes(e.target.value)}
                              placeholder="Ej: sin cebolla, salsa aparte, bien cocido..."
                              maxLength={240}
                              className="mt-2 w-full min-h-[90px] rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                            />
                            <p className="text-xs text-gray-400 mt-1">{modalNotes.length}/240</p>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 border-t border-gray-100 bg-white space-y-3">
                        <div className="flex items-center justify-center gap-5">
                          <button
                            type="button"
                            onClick={() => setModalQuantity(q => Math.max(0, q - 1))}
                            className="w-10 h-10 rounded-full border-2 border-gray-300 flex items-center justify-center text-xl font-bold text-gray-600 hover:border-primary hover:text-primary transition-colors"
                          >
                            −
                          </button>
                          <span className="text-2xl font-black text-gray-900 min-w-[2rem] text-center">{modalQuantity}</span>
                          <button
                            type="button"
                            onClick={() => setModalQuantity(q => q + 1)}
                            className="w-10 h-10 rounded-full border-2 border-gray-300 flex items-center justify-center text-xl font-bold text-gray-600 hover:border-primary hover:text-primary transition-colors"
                          >
                            +
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const selectedName = isDrink && activeDrinkSize
                              ? `${selectedMenuItem.name} (${activeDrinkSize.toUpperCase()})`
                              : selectedMenuItem.name;
                            const selectedId = isDrink && activeDrinkSize
                              ? `${selectedMenuItem.id}-${activeDrinkSize}`
                              : selectedMenuItem.id;
                            for (let i = 0; i < modalQuantity; i++) {
                              addToCart(selectedId, selectedName, selectedPrice, modalNotes);
                            }
                            if (modalQuantity > 0) setShowCartHint(true);
                            setSelectedMenuItem(null);
                            setSelectedDrinkSize(null);
                            setModalNotes('');
                            setModalQuantity(0);
                          }}
                          className="w-full py-4 rounded-2xl bg-primary text-white font-black text-lg"
                          disabled={selectedMenuItem.available === false || modalQuantity < 1}
                        >
                          {selectedMenuItem.available === false ? 'No disponible' : modalQuantity < 1 ? 'Selecciona la cantidad' : `Agregar al pedido · RD$ ${(selectedPrice * modalQuantity).toFixed(0)}`}
                        </button>
                      </div>
                    </motion.div>
                  </motion.div>
                    );
                  })()
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {view === 'tracking' && (
          <motion.div
            key="tracking"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <TrackingView
              orderId={activeOrderId}
              deliveryLocation={deliveryLocation}
              orders={activeOrders}
              onCancelOrder={handleClientCancelOrder}
              onBack={() => { setView('home'); setActiveOrderId(null); setDeliveryLocation(null); }}
            />
          </motion.div>
        )}

        {view === 'orders' && (
          <motion.div
            key="orders"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8 px-4 lg:px-0"
          >
            <div>
              <h2 className="text-3xl font-black font-display tracking-tight mb-8">Mis Pedidos</h2>

              {activeOrders.length === 0 && deliveredOrders.length === 0 && cancelledOrders.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-900 mb-2">No tienes pedidos todavía</h3>
                  <p className="text-gray-400">Cuando hagas pedidos, verás activos e historial aquí</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {activeOrders.length > 0 && (
                    <div>
                      <h3 className="text-lg font-black text-gray-900 mb-3">Pedidos activos</h3>
                      <div className="space-y-4">
                        {activeOrders.map(order => (
                          <div key={order.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            <div className="flex justify-between items-start mb-4">
                              <div>
                                <h3 className="font-bold text-lg">Pedido #{order.id.slice(-8)}</h3>
                                <p className="text-sm text-gray-400">{new Date(order.createdAt).toLocaleDateString()}</p>
                              </div>
                              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                order.status === 'pending'    ? 'bg-yellow-100 text-yellow-700' :
                                order.status === 'accepted'   ? 'bg-cyan-100 text-cyan-700' :
                                order.status === 'preparing'  ? 'bg-amber-100 text-amber-700' :
                                order.status === 'ready'      ? 'bg-purple-100 text-purple-700' :
                                order.status === 'on_the_way' ? 'bg-blue-100 text-blue-700' :
                                order.status === 'arrived'    ? 'bg-teal-100 text-teal-700' :
                                order.status === 'delivered'  ? 'bg-green-100 text-green-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {order.status === 'pending'    ? 'Pedido recibido' :
                                 order.status === 'accepted'   ? 'Aceptado' :
                                 order.status === 'preparing'  ? 'Preparando' :
                                 order.status === 'ready'      ? 'Listo para envío' :
                                 order.status === 'on_the_way' ? 'En camino 🛵' :
                                 order.status === 'arrived'    ? '¡Repartidor llegó!' :
                                 order.status === 'delivered'  ? 'Entregado ✓' :
                                 order.status}
                              </span>
                            </div>

                            <div className="space-y-2 mb-4">
                              {order.items?.map(item => (
                                <div key={item.id} className="flex justify-between text-sm">
                                  <span>{item.quantity}x {item.name}</span>
                                  <span>RD$ {item.price * item.quantity}</span>
                                </div>
                              ))}
                            </div>

                            <div className="pt-4 border-t flex justify-between items-center gap-3">
                              <span className="font-bold text-lg">RD$ {order.total}</span>
                              <div className="flex flex-col items-end gap-2">
                                <button
                                  onClick={() => setView('tracking')}
                                  className="text-primary font-medium hover:text-primary/80 transition-colors"
                                >
                                  Ver detalles →
                                </button>
                                {canClientCancelOrder(order) && (
                                  <button
                                    onClick={() => handleClientCancelOrder(order)}
                                    className="text-xs font-bold px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                                  >
                                    Cancelar pedido (restan {getOrderCancelTimeLeftText(order)} min)
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {deliveredOrders.length > 0 && (
                    <div>
                      <h3 className="text-lg font-black text-gray-900 mb-3">Historial (facturas entregadas)</h3>
                      <div className="space-y-4">
                        {deliveredOrders.map(order => {
                          const deliveredDate = order.deliveredAt ? new Date(order.deliveredAt) : new Date(order.createdAt);
                          return (
                            <div key={order.id} className="bg-emerald-50 rounded-2xl p-6 border border-emerald-200">
                              <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                                <div>
                                  <h4 className="font-black text-emerald-900">Factura #{order.id.slice(-8)}</h4>
                                  <p className="text-sm text-emerald-700">{order.businessName}</p>
                                </div>
                                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-200 text-emerald-800">
                                  Entregado ✓
                                </span>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm mb-4">
                                <div className="bg-white/80 rounded-xl p-3 border border-emerald-100">
                                  <p className="text-emerald-700 font-semibold">Fecha</p>
                                  <p className="font-bold text-emerald-900">{deliveredDate.toLocaleDateString()}</p>
                                </div>
                                <div className="bg-white/80 rounded-xl p-3 border border-emerald-100">
                                  <p className="text-emerald-700 font-semibold">Hora</p>
                                  <p className="font-bold text-emerald-900">{deliveredDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                </div>
                                <div className="bg-white/80 rounded-xl p-3 border border-emerald-100">
                                  <p className="text-emerald-700 font-semibold">Duración entrega</p>
                                  <p className="font-bold text-emerald-900">{order.deliveryDurationMinutes ? `${order.deliveryDurationMinutes} min` : 'No disponible'}</p>
                                </div>
                              </div>

                              <div className="space-y-2 mb-4">
                                {order.items?.map(item => (
                                  <div key={item.id} className="flex justify-between text-sm text-emerald-900">
                                    <span>{item.quantity}x {item.name}</span>
                                    <span>RD$ {(item.price || 0) * (item.quantity || 0)}</span>
                                  </div>
                                ))}
                              </div>

                              <div className="pt-4 border-t border-emerald-200 space-y-1 text-sm">
                                <div className="flex justify-between text-emerald-800">
                                  <span>Subtotal artículos</span>
                                  <span>RD$ {order.subtotal || 0}</span>
                                </div>
                                <div className="flex justify-between text-emerald-800">
                                  <span>Delivery</span>
                                  <span>RD$ {order.deliveryFee || 0}</span>
                                </div>
                                <div className="flex justify-between text-lg font-black text-emerald-900 pt-1">
                                  <span>Total pagado</span>
                                  <span>RD$ {order.total || 0}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {cancelledOrders.length > 0 && (
                    <div>
                      <h3 className="text-lg font-black text-gray-900 mb-3">Pedidos cancelados</h3>
                      <div className="space-y-4">
                        {cancelledOrders.map(order => {
                          const cancelledDate = order.cancelledAt ? new Date(order.cancelledAt) : new Date(order.createdAt);
                          return (
                            <div key={order.id} className="bg-red-50 rounded-2xl p-6 border border-red-200">
                              <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                                <div>
                                  <h4 className="font-black text-red-900">Pedido #{order.id.slice(-8)}</h4>
                                  <p className="text-sm text-red-700">{order.businessName}</p>
                                </div>
                                <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-200 text-red-800">
                                  Cancelado
                                </span>
                              </div>
                              <p className="text-sm text-red-700 mb-3">
                                {order.cancellationReason || 'Cancelado por el cliente'}
                              </p>
                              <p className="text-xs text-red-700 font-semibold">
                                {cancelledDate.toLocaleDateString()} · {cancelledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {view === 'profile' && (
          <ProfileView onViewChange={setView} />
        )}

        {view === 'favorites' && (
          <motion.div
            key="favorites"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="px-4 lg:px-8 py-8"
          >
            <h2 className="text-2xl font-black text-gray-900 mb-8">Mis Favoritos</h2>

            {allBusinesses.filter((business) => favoriteBusinessIds.includes(business.id)).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-4">
                  <Heart className="w-10 h-10 text-red-300" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Aún no tienes favoritos</h3>
                <p className="text-gray-400 text-sm max-w-xs">Guarda tus negocios favoritos para encontrarlos rápido</p>
                <button
                  onClick={() => setView('home')}
                  className="mt-6 bg-primary text-white font-bold px-6 py-3 rounded-2xl hover:bg-primary/90 transition-all"
                >
                  Explorar negocios
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {allBusinesses
                  .filter((business) => favoriteBusinessIds.includes(business.id))
                  .map((business) => (
                    <button
                      key={business.id}
                      onClick={() => handleBusinessSelect(business)}
                      className="text-left bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={business.image}
                          alt={business.name}
                          className="w-14 h-14 rounded-xl object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/favorite/200/200';
                          }}
                        />
                        <div className="min-w-0">
                          <p className="font-black text-gray-900 truncate">{business.name}</p>
                          <p className="text-xs text-gray-500 truncate">{business.address}</p>
                          <p className="text-sm text-gray-700 mt-1 flex items-center gap-1">
                            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                            {business.rating || 4.8}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <CartDrawer 
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cart}
        onAdd={(item) => addToCart(item.id, item.name, item.price, item.notes)}
        onRemove={removeFromCart}
        onCheckout={handleCheckout}
        isCheckingOut={isCheckoutSubmitting}
        total={cartTotal}
      />
    </Layout>
    </>
  );
}

function App() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AuthProvider>
      <AnimatePresence mode="wait">
        {showSplash ? <SplashScreen /> : <AppContent />}
      </AnimatePresence>
    </AuthProvider>
  );
}

export default App;
