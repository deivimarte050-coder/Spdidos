import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Clock, Star, CheckCircle2, ShoppingBag, MapPin, Truck, ChefHat, Package, Navigation, Bell, X, User, Volume2, LogOut, Save, Heart, Phone, MessageCircle, Mail, List, LayoutGrid, Share2, HelpCircle, Send, Camera } from 'lucide-react';
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
import { CartItem, View, Order, BusinessDayKey, MenuItem, AppNotification } from './types';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import DataService, { Business } from './services/DataService';
import FirebaseServiceV2, { HomeAnnouncement, PopupAnnouncement } from './services/FirebaseServiceV2';
import EventService from './services/EventService';
import { soundService } from './services/SoundService';
import { initFCMToken, listenFCMForeground } from './services/FCMService';
import OrderNotificationService from './services/OrderNotificationService';
import { LOGO_URL, SPM_CENTER } from './constants';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

const isStandaloneDisplayMode = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
};

const ORDER_STEPS = [
  { status: 'pending',    label: 'Pedido recibido',   icon: Package },
  { status: 'accepted',   label: 'Aceptado',           icon: CheckCircle2 },
  { status: 'preparing',  label: 'Preparando',         icon: ChefHat },
  { status: 'ready',      label: 'Listo para envío',   icon: ShoppingBag },
  { status: 'on_the_way', label: 'En camino',          icon: Truck },
  { status: 'arrived',    label: '¡Repartidor llegó!',  icon: MapPin },
  { status: 'delivered',  label: 'Entregado',          icon: CheckCircle2 },
  { status: 'cancelled',  label: 'Pedido cancelado',   icon: X },
];

const getClientOrderStatusSummary = (status: Order['status']) => {
  if (status === 'delivered') return 'Entregado';
  if (status === 'cancelled') return 'Cancelado';
  return 'En proceso';
};

const getClientOrderStatusSummaryStyles = (status: Order['status']) => {
  if (status === 'delivered') return 'bg-emerald-100 text-emerald-700';
  if (status === 'cancelled') return 'bg-red-100 text-red-700';
  return 'bg-amber-100 text-amber-700';
};

const getClientPaymentMethodLabel = (paymentMethod?: string) => {
  const method = String(paymentMethod || '').toLowerCase();
  if (method === 'transfer' || method.includes('transfer')) return 'Transferencia';
  return 'Efectivo';
};

// ─────────────────────────────────────────────────────────────────────────────
// ─── MAP COMPONENTS FOR REAL-TIME DELIVERY TRACKING ─────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

// Auto-follow delivery person on map
const MapFollower: React.FC<{ center: [number, number] }> = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom(), { animate: true, duration: 1 });
  }, [center[0], center[1]]);
  return null;
};

// Draw route between delivery person and client using OSRM
const RoutePolylineLayer: React.FC<{
  from: [number, number];
  to: [number, number];
}> = ({ from, to }) => {
  const map = useMap();
  const layersRef = useRef<L.Layer[]>([]);

  const clearLayers = () => {
    layersRef.current.forEach(l => { try { map.removeLayer(l); } catch {} });
    layersRef.current = [];
  };

  useEffect(() => {
    const color = '#4f46e5';
    const glow = '#6b21a8';
    const w = 5;
    let cancelled = false;

    const draw = async () => {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`;
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

const ClientOrderDetailsModal: React.FC<{
  order: Order;
  onClose: () => void;
}> = ({ order, onClose }) => {
  const displayDate = order.deliveredAt || order.cancelledAt || order.createdAt;
  const paymentMethodLabel = getClientPaymentMethodLabel(order.paymentMethod);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(3px)' }}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden max-h-[92vh]"
      >
        <div className="bg-primary px-6 py-4 text-white">
          <h3 className="text-lg font-black">Detalles del pedido</h3>
          <p className="text-white/85 text-sm">
            {order.businessName || 'Negocio no disponible'} · Pedido #{order.id.slice(-8).toUpperCase()}
          </p>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto max-h-[72vh]">
          <div className="bg-gray-50 rounded-2xl p-4 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Fecha</span><span className="font-black">{new Date(displayDate).toLocaleString()}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Estado</span><span className="font-black">{getClientOrderStatusSummary(order.status)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Método de pago</span><span className="font-black">{paymentMethodLabel}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Dirección</span><span className="font-black text-right max-w-[70%]">{order.deliveryAddress || 'No disponible'}</span></div>
          </div>

          <div>
            <p className="font-black text-gray-900 mb-2">Productos pedidos</p>
            <div className="space-y-2">
              {(order.items || []).map((item, index) => (
                <div key={`${item.id}-${index}`} className="border border-gray-100 rounded-xl p-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700"><span className="font-black">{item.quantity}x</span> {item.name}</span>
                    <span className="font-black">RD$ {((item.price || 0) * (item.quantity || 0)).toFixed(0)}</span>
                  </div>
                  {item.notes && <p className="text-xs text-gray-500 mt-1">Nota: {item.notes}</p>}
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t space-y-1 text-sm">
            <div className="flex justify-between text-gray-700">
              <span>Subtotal</span>
              <span>RD$ {(order.subtotal || 0).toFixed(0)}</span>
            </div>
            <div className="flex justify-between text-gray-700">
              <span>Delivery</span>
              <span>RD$ {(order.deliveryFee || 0).toFixed(0)}</span>
            </div>
            <div className="flex justify-between text-lg font-black text-gray-900 pt-1">
              <span>Total</span>
              <span>RD$ {(order.total || 0).toFixed(0)}</span>
            </div>
          </div>
        </div>

        <div className="p-6 pt-0">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-2xl bg-primary text-white font-black hover:bg-primary/90 transition-all"
          >
            Cerrar
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

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
              {order.clientAddressDescription && (
                <p><span className="font-black text-blue-900">Descripción de la dirección:</span> <span className="text-blue-900">{order.clientAddressDescription}</span></p>
              )}
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
  const order = orderId ? orders.find(o => o.id === orderId) : orders[0];
  
  // If no order found, show error message
  if (!order) {
    return (
      <div className="max-w-lg mx-auto space-y-6 px-4 py-6">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <X className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-2xl font-black text-gray-900">Pedido no encontrado</h2>
          <p className="text-gray-500">No se pudo encontrar la información del pedido solicitado.</p>
          <button
            onClick={onBack}
            className="px-6 py-3 bg-primary text-white rounded-2xl font-black hover:bg-primary/90 transition-all"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }
  
  const stepIndex = ORDER_STEPS.findIndex(s => s.status === order.status);
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

    const limitMs = ORDER_CANCEL_WINDOW_MS;
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
            const cancelledCurrent = current && step.status === 'cancelled';
            return (
              <div key={step.status} className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                  done
                    ? 'bg-emerald-500 text-white'
                    : cancelledCurrent
                      ? 'bg-red-500 text-white ring-4 ring-red-100'
                      : current
                        ? 'bg-primary text-white ring-4 ring-primary/20'
                        : 'bg-gray-100 text-gray-400'
                }`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className={`text-sm font-medium ${
                  cancelledCurrent
                    ? 'text-red-600 font-bold'
                    : current
                      ? 'text-primary font-bold'
                      : done
                        ? 'text-gray-500 line-through'
                        : 'text-gray-400'
                }`}>
                  {step.label}
                </span>
                {current && (
                  <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-bold animate-pulse ${
                    cancelledCurrent ? 'bg-red-100 text-red-600' : 'bg-primary/10 text-primary'
                  }`}>
                    Ahora
                  </span>
                )}
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
          <p className="text-sm font-bold text-red-700">Cancelar pedido (solo en los primeros 2 minutos)</p>
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

      {/* Mapa cuando el pedido está listo o en reparto */}
      {order && ['ready', 'on_the_way', 'arrived'].includes(order.status) && deliveryLocation && (() => {
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
              <MapContainer center={[deliverPos[0], deliverPos[1]]} zoom={16} className="h-full w-full rounded-none" scrollWheelZoom={false} zoomControl={false}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="" />
                <MapFollower center={deliverPos} />
                {clientPos && <RoutePolylineLayer from={deliverPos} to={clientPos} />}
                
                {/* Delivery person marker (blue) */}
                <Marker position={deliverPos} icon={L.divIcon({
                  className: '', iconSize: [38, 38], iconAnchor: [19, 38],
                  html: `<div style="width:38px;height:38px;background:#3b82f6;border:3px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(59,130,246,.5)"><svg width="18" height="18" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2"><path d="M21 10.5A8.38 8.38 0 0 0 12 2h0a8.38 8.38 0 0 0-9 8.5 4.5 4.5 0 0 0 2.25 3.891A4.77 4.77 0 0 1 12 13a4.77 4.77 0 0 1 6.75 1.391A4.5 4.5 0 0 0 21 10.5z"></path></svg></div>`
                })} />
                
                {/* Client location marker (red) */}
                {clientPos && (
                  <Marker position={clientPos} icon={L.divIcon({
                    className: '', iconSize: [36, 44], iconAnchor: [18, 44],
                    html: `<div style="display:flex;flex-direction:column;align-items:center"><div style="width:32px;height:32px;background:#dc2626;border:3px solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 8px rgba(220,38,38,.5)"></div></div>`
                  })} />
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
      ) : order?.status === 'cancelled' ? (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-center">
          <X className="w-10 h-10 text-red-500 mx-auto mb-2" />
          <p className="font-bold text-red-700">Pedido cancelado</p>
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
// Role-based notification function will be defined inside AppContent component

// ─── Constants ─────────────────────────────────────────────────────────────────────
const ORDER_CANCEL_WINDOW_MS = 2 * 60 * 1000;

// ─── Client Profile View ──────────────────────────────────────────────────────
const ProfileView: React.FC<{ onViewChange: (v: any) => void }> = ({ onViewChange }) => {
  const { user, logout, updateUser } = useAuth();
  const [form, setForm] = useState({ name: user?.name ?? '', phone: user?.phone ?? '', whatsapp: user?.whatsapp ?? '', addressDescription: user?.addressDescription ?? '', photoURL: user?.photoURL ?? '' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [supportWhatsAppNumber, setSupportWhatsAppNumber] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const compressImage = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (e) => {
        const img = new Image();
        const canvas = document.createElement('canvas');
        img.onload = () => {
          let width = img.width;
          let height = img.height;
          if (width > height) {
            height *= 400 / width;
            width = 400;
          } else {
            width *= 400 / height;
            height = 400;
          }
          canvas.width = width;
          canvas.height = height;
          canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
          const quality = file.size > 500 * 1024 ? 0.6 : 0.8;
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => reject(new Error('Error al cargar imagen'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Error al leer archivo'));
    });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      alert('❌ Imagen muy grande. Máximo 5MB.');
      return;
    }

    try {
      setSaving(true);
      const compressedPhoto = await compressImage(file);
      setForm(f => ({ ...f, photoURL: compressedPhoto }));
      
      await updateUser({ photoURL: compressedPhoto });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (error) {
      console.error('Error al subir foto:', error);
      alert('Error al subir la foto. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateUser({ name: form.name.trim(), phone: form.phone.trim(), whatsapp: form.whatsapp.trim(), addressDescription: form.addressDescription.trim(), photoURL: form.photoURL });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      alert('Error al guardar. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  // Load support WhatsApp number
  useEffect(() => {
    const loadWhatsAppNumber = async () => {
      try {
        const number = await FirebaseServiceV2.getSupportWhatsAppNumber();
        setSupportWhatsAppNumber(number);
      } catch (error) {
        console.error('Error loading WhatsApp support number:', error);
      }
    };
    loadWhatsAppNumber();
  }, []);

  return (
    <motion.div
      key="profile"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="px-4 lg:px-8 py-8 max-w-lg mx-auto space-y-6"
    >
      <h2 className="text-2xl font-black text-gray-900">Mi Perfil</h2>

      {/* Avatar - Foto real del usuario */}
      <div className="flex items-center gap-4 bg-white rounded-2xl p-5 shadow-sm border border-gray-100 relative">
        <div className="relative">
          <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-primary/20 flex-shrink-0">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="profile" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
                <User className="w-8 h-8 text-primary/50" />
              </div>
            )}
          </div>
          <input 
            ref={fileInputRef}
            type="file" 
            accept="image/*" 
            onChange={handlePhotoUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-0 right-0 bg-primary text-white p-2 rounded-full hover:bg-primary/90 transition-colors shadow-lg"
            disabled={saving}
          >
            <Camera className="w-3 h-3" />
          </button>
        </div>
        <div>
          <p className="font-black text-gray-900 text-lg">{user?.name}</p>
          <p className="text-sm text-gray-400">{user?.email}</p>
          {user?.photoURL && <p className="text-xs text-emerald-600 mt-1">✓ Foto de perfil configurada</p>}
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
          <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-2 border border-amber-100">
            ⚠️ Es importante que este sea tu número real de WhatsApp, ya que cuando el repartidor llegue a tu ubicación puede contactarte por esa vía para confirmar la entrega o pedir indicaciones de tu dirección
          </p>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-bold text-gray-500 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> Descripción de la dirección (opcional)</span>
          <textarea
            value={form.addressDescription}
            onChange={e => setForm(f => ({ ...f, addressDescription: e.target.value.slice(0, 200) }))}
            className="border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all resize-none"
            placeholder="Escribe detalles para ayudar al repartidor a encontrar tu casa. Ejemplo: color de la casa, qué hay al frente, referencias cercanas."
            rows={3}
            maxLength={200}
          />
          <p className="text-xs text-gray-400 text-right">{form.addressDescription.length}/200 caracteres</p>
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

      {/* WhatsApp Support */}
      <button
        onClick={() => {
          if (!supportWhatsAppNumber) {
            alert('El número de soporte de WhatsApp no está disponible en este momento. Por favor, intenta más tarde.');
            return;
          }
          const message = encodeURIComponent('Hola, necesito ayuda con la aplicación.');
          window.open(`https://wa.me/${supportWhatsAppNumber.replace(/\D/g, '')}?text=${message}`, '_blank');
        }}
        className="w-full py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 bg-green-50 text-green-600 border-2 border-green-100 hover:bg-green-100 transition-all"
      >
        <MessageCircle className="w-4 h-4" /> Contactar soporte por WhatsApp
      </button>

      <div className="text-center text-xs text-gray-500 space-y-1">
        <p className="font-black text-gray-700">Soporte por WhatsApp</p>
        <p>Si tienes problemas con tu cuenta, pedidos o necesitas ayuda con la aplicación, puedes contactarnos directamente por WhatsApp.</p>
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

  // ─── Role-based push notification helper ───────────────────────────────────────
  const showPushNotificationForRole = async (title: string, body: string, allowedRoles: Array<'client' | 'business' | 'delivery' | 'admin'>, tag = 'spdidos') => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    if (!user?.role || !allowedRoles.includes(user.role as any)) return;

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
  };
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
  const [modalOptionQuantities, setModalOptionQuantities] = useState<Record<string, number>>({});
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer'>('cash');
  const [selectedTransferAccountIndex, setSelectedTransferAccountIndex] = useState(0);
  const [transferReceiptImage, setTransferReceiptImage] = useState<string | null>(null);
  const [showCartHint, setShowCartHint] = useState(false);
  const [isCheckoutSubmitting, setIsCheckoutSubmitting] = useState(false);
  const [showWhatsAppVerification, setShowWhatsAppVerification] = useState(false);
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [deliveredOrders, setDeliveredOrders] = useState<Order[]>([]);
  const [cancelledOrders, setCancelledOrders] = useState<Order[]>([]);
  const [selectedClientHistoryOrder, setSelectedClientHistoryOrder] = useState<Order | null>(null);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [deliveryLocation, setDeliveryLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [arrivedOrderId, setArrivedOrderId] = useState<string | null>(null);
  const [userNotifications, setUserNotifications] = useState<AppNotification[]>([]);
  const [homeAnnouncement, setHomeAnnouncement] = useState<HomeAnnouncement | null>(null);
  const [popupAnnouncement, setPopupAnnouncement] = useState<PopupAnnouncement | null>(null);
  const [showPopupAnnouncementModal, setShowPopupAnnouncementModal] = useState(false);
  const [pendingSharedTarget, setPendingSharedTarget] = useState<{ businessId: string; itemId?: string; imageUrl?: string } | null>(null);
  const [forceAuthForSharedOrder, setForceAuthForSharedOrder] = useState(false);
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [canInstallApp, setCanInstallApp] = useState(false);
  const [isStandaloneMode, setIsStandaloneMode] = useState<boolean>(() => isStandaloneDisplayMode());
  const sharedAuthNoticeShownRef = useRef(false);
  const hadAuthenticatedSessionRef = useRef(false);
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

  const handleNotificationBellClick = () => {
    setView('notifications');
  };

  const handleInstallApp = async () => {
    if (!deferredInstallPrompt) {
      alert('Para instalar la app, abre el menú de Chrome (⋮) y toca "Agregar a pantalla principal" o "Instalar aplicación".');
      return;
    }
    try {
      await deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
    } catch {
      // ignore prompt errors
    } finally {
      setDeferredInstallPrompt(null);
      setCanInstallApp(false);
    }
  };

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredInstallPrompt(event as BeforeInstallPromptEvent);
      setCanInstallApp(true);
    };
    const onAppInstalled = () => {
      setIsStandaloneMode(true);
      setDeferredInstallPrompt(null);
      setCanInstallApp(false);
    };
    const onDisplayModeChange = () => {
      const standalone = isStandaloneDisplayMode();
      setIsStandaloneMode(standalone);
      if (standalone) setCanInstallApp(false);
    };

    const displayModeMedia = window.matchMedia('(display-mode: standalone)');

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt as EventListener);
    window.addEventListener('appinstalled', onAppInstalled);
    if (displayModeMedia.addEventListener) {
      displayModeMedia.addEventListener('change', onDisplayModeChange);
    } else {
      displayModeMedia.addListener(onDisplayModeChange);
    }

    onDisplayModeChange();

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt as EventListener);
      window.removeEventListener('appinstalled', onAppInstalled);
      if (displayModeMedia.removeEventListener) {
        displayModeMedia.removeEventListener('change', onDisplayModeChange);
      } else {
        displayModeMedia.removeListener(onDisplayModeChange);
      }
    };
  }, []);

  // ── FCM: register SW, request permission, get token, start foreground listener
  useEffect(() => {
    if (!user?.id) return;
    let isMounted = true;
    let resolvedBusinessId = (user as any).businessId as string | undefined;

    const resolveBusinessId = async () => {
      if (resolvedBusinessId || user.role !== 'business' || !user.email) {
        return resolvedBusinessId;
      }
      try {
        const businesses = await FirebaseServiceV2.getBusinesses();
        const byEmail = businesses.find((business: any) => String(business?.email || '').toLowerCase() === String(user.email || '').toLowerCase());
        if (byEmail?.id) resolvedBusinessId = byEmail.id;
      } catch (error) {
        console.warn('[FCM] No se pudo resolver businessId para token:', error);
      }
      return resolvedBusinessId;
    };

    const syncFCMToken = async () => {
      console.log('[App] Sincronizando token FCM para usuario:', user?.id, 'rol:', user?.role);
      
      const token = await initFCMToken();
      if (!isMounted || !token) {
        console.warn('[App] No se pudo obtener token FCM');
        return;
      }
      
      console.log('[App] Token FCM obtenido, guardando...');
      const businessId = await resolveBusinessId();
      await FirebaseServiceV2.saveFCMToken(
        user.id,
        token,
        user.role,
        businessId ?? undefined
      );
      console.log('[App] Token FCM sincronizado exitosamente');
    };

    syncFCMToken();

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncFCMToken();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    const tokenRefreshInterval = window.setInterval(() => {
      syncFCMToken();
    }, 1000 * 60 * 30);

    const unsubForeground = listenFCMForeground(({ title, body, tag }) => {
      console.log('[App] Notificación foreground recibida:', { title, body, tag });
      showPushNotificationForRole(title, body, ['client', 'business', 'delivery', 'admin'], tag);
    });

    // Add global notification test function for debugging
    (window as any).testNotification = async (role: 'client' | 'business' | 'delivery' | 'admin') => {
      console.log('[DEBUG] Enviando notificación de prueba a rol:', role);
      try {
        await FirebaseServiceV2.sendPushNotificationToRoles({
          title: '🔔 Notificación de Prueba',
          body: `Esta es una notificación de prueba para rol: ${role}`,
          roles: [role],
          tag: 'test-notification'
        });
        console.log('[DEBUG] Notificación de prueba enviada exitosamente');
      } catch (error) {
        console.error('[DEBUG] Error enviando notificación de prueba:', error);
      }
    };

    // Add immediate browser notification test
    (window as any).testBrowserNotification = (title: string, body: string) => {
      console.log('[DEBUG] Enviando notificación directa del navegador');
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, {
          body,
          icon: '/logo_high_resolution.png',
          badge: '/logo_high_resolution.png',
          tag: 'browser-test',
          requireInteraction: true
        });
        console.log('[DEBUG] Notificación del navegador enviada');
      } else {
        console.warn('[DEBUG] Permiso de notificaciones no concedido');
      }
    };

    console.log('[DEBUG] Para probar notificaciones:');
    console.log('- FCM: testNotification("client"), testNotification("business"), etc.');
    console.log('- Navegador: testBrowserNotification("Título", "Mensaje")');

    return () => {
      isMounted = false;
      window.clearInterval(tokenRefreshInterval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      unsubForeground?.();
    };
  }, [user?.id, user?.role, user?.email, (user as any)?.businessId]);

  useEffect(() => {
    if (!user?.id || user.role !== 'client') {
      setUserNotifications([]);
      return;
    }

    const unsub = FirebaseServiceV2.subscribeToUserNotifications(user.id, (notifications) => {
      setUserNotifications(notifications);
    });

    return () => unsub();
  }, [user?.id, user?.role]);

  useEffect(() => {
    const unsubscribe = FirebaseServiceV2.subscribeToHomeAnnouncement((announcement) => {
      setHomeAnnouncement(announcement);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user?.id || user.role !== 'client') {
      setPopupAnnouncement(null);
      setShowPopupAnnouncementModal(false);
      return;
    }

    let isCancelled = false;
    const unsubscribe = FirebaseServiceV2.subscribeToPopupAnnouncement(async (announcement) => {
      if (isCancelled) return;

      if (!announcement) {
        setPopupAnnouncement(null);
        setShowPopupAnnouncementModal(false);
        return;
      }

      setPopupAnnouncement(announcement);
      const alreadyAcknowledged = await FirebaseServiceV2.hasAcknowledgedPopupAnnouncement(user.id, announcement.id);
      if (isCancelled) return;
      setShowPopupAnnouncementModal(!alreadyAcknowledged);
    });

    return () => {
      isCancelled = true;
      unsubscribe();
    };
  }, [user?.id, user?.role]);

  useEffect(() => {
    const readPending = () => {
      try {
        const saved = localStorage.getItem('pending_shared_target');
        if (!saved) return null;
        const parsed = JSON.parse(saved) as { businessId?: string; itemId?: string; imageUrl?: string };
        if (!parsed?.businessId) return null;
        return { businessId: parsed.businessId, itemId: parsed.itemId, imageUrl: parsed.imageUrl };
      } catch {
        return null;
      }
    };

    const params = new URLSearchParams(window.location.search);
    const shareType = params.get('share');
    const businessId = params.get('business');
    if (shareType && businessId) {
      const nextTarget = {
        businessId,
        itemId: params.get('item') || undefined,
        imageUrl: params.get('img') || undefined,
      };
      setPendingSharedTarget(nextTarget);
      localStorage.setItem('pending_shared_target', JSON.stringify(nextTarget));
      return;
    }

    const pending = readPending();
    if (pending) setPendingSharedTarget(pending);
  }, []);

  useEffect(() => {
    if (!user?.id || user.role !== 'client') return;

    // Latest snapshot kept so visibilitychange can re-check immediately
    let latestActive: Order[] = [];
    const isArrivedAcknowledged = (order: Order) =>
      !!order.arrivedAcknowledgedAt || !!order.arrivedAcknowledgedByClientId;

    const notify = (orders: Order[]) => {
      orders.forEach(o => {
        if (o.status === 'arrived' && !isArrivedAcknowledged(o) && !arrivedNotifiedIds.current.has(o.id)) {
          arrivedNotifiedIds.current.add(o.id);
          setArrivedOrderId(o.id);
          soundService.startRinging();
          showPushNotificationForRole('¡Tu repartidor llegó! 🛵', 'Está en tu puerta esperando — abre la app para confirmar', ['client'], 'arrived');
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
        .filter(o => o.status === 'arrived' && !isArrivedAcknowledged(o))
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
          showPushNotificationForRole('¡Nuevo Pedido! 🔔', `${pending.clientName} — RD$ ${pending.total?.toFixed(0)}`, ['business'], 'new-order');
        }
      }

      const cancelledByClient = data.filter((o) =>
        o.status === 'cancelled' && (o as any).cancelledByClient === true
      );

      if (!bizCancelledInited.current) {
        cancelledByClient.forEach((o) => bizCancelledNotifiedIds.current.add(o.id));
        bizCancelledInited.current = true;
      } else {
        const newlyCancelled = cancelledByClient.find((o) => !bizCancelledNotifiedIds.current.has(o.id));
        if (newlyCancelled) {
          bizCancelledNotifiedIds.current.add(newlyCancelled.id);
          setCancelledOrderNotice(newlyCancelled);
          soundService.startCancelledRinging();
          showPushNotificationForRole(
            'Pedido cancelado por cliente ❌',
            `Lo siento, el cliente ${newlyCancelled.clientName} canceló el pedido`,
            ['business'],
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
      
      // Send role-based notifications
      await OrderNotificationService.notifyOrderStatusUpdate({
        orderId: order.id,
        businessId: order.businessId,
        businessName: order.businessName,
        clientId: order.clientId,
        clientName: order.clientName,
        total: order.total,
        status: 'accepted',
      }, 'accepted');
      
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
    try {
      await FirebaseServiceV2.updateOrder(order.id, {
        status: 'cancelled',
        cancelledAt: new Date().toISOString(),
        cancelledByClient: false,
        cancellationReason: 'Cancelado por negocio'
      });
      
      // Send role-based notifications
      await OrderNotificationService.notifyOrderCancelled({
        orderId: order.id,
        businessId: order.businessId,
        businessName: order.businessName,
        clientId: order.clientId,
        clientName: order.clientName,
        total: order.total,
        status: 'cancelled',
      }, 'Cancelado por negocio');
    }
    catch (err) { console.error('Error rechazando pedido:', err); }
  };

  // Global subscription for delivery users — rings on new business-approved orders from any tab
  useEffect(() => {
    if (user?.role !== 'delivery') return;
    const unsub = FirebaseServiceV2.subscribeToDeliveryOrders((orders) => {
      const availableStatuses = new Set(['accepted', 'preparing', 'ready']);
      const available = orders.filter((o) => availableStatuses.has(o.status) && !o.deliveryId);
      const myActive  = orders.find(o => o.deliveryId === user.id && (o.status === 'on_the_way' || o.status === 'arrived'));

      if (!deliveryGlobalInited.current) {
        available.forEach(o => deliveryKnownReadyIds.current.add(o.id));
        deliveryGlobalInited.current = true;
      } else {
        const hasNew = available.some(o => !deliveryKnownReadyIds.current.has(o.id));
        if (hasNew && !myActive) {
          soundService.startRinging();
          showPushNotificationForRole('¡Pedido disponible! 📦', 'Un negocio aceptó un pedido y está disponible para ti', ['delivery'], 'ready-order');
        }
        if (available.length === 0)  soundService.stopRinging();
        available.forEach(o => deliveryKnownReadyIds.current.add(o.id));
      }
    });
    return () => { unsub(); soundService.stopRinging(); };
  }, [user?.role, user?.id]);

  const handleConfirmArrival = async () => {
    const currentArrivedOrderId = arrivedOrderId;
    soundService.stopRinging();
    setArrivedOrderId(null);
    if (!currentArrivedOrderId || !user?.id) return;
    try {
      await FirebaseServiceV2.updateOrder(currentArrivedOrderId, {
        arrivedAcknowledgedAt: new Date().toISOString(),
        arrivedAcknowledgedByClientId: user.id,
      });
    } catch (error) {
      console.error('Error confirmando llegada del repartidor:', error);
    }
  };

  // Subscribe to delivery location only once order is ready (or later)
  useEffect(() => {
    if (deliveryUnsubRef.current) { deliveryUnsubRef.current(); deliveryUnsubRef.current = null; }
    if (!activeOrderId) {
      setDeliveryLocation(null);
      return;
    }
    const activeTrackedOrder = activeOrders.find((o) => o.id === activeOrderId);
    const canTrackDelivery = activeTrackedOrder
      ? ['ready', 'on_the_way', 'arrived'].includes(activeTrackedOrder.status)
      : false;
    if (!canTrackDelivery) {
      setDeliveryLocation(null);
      return;
    }
    deliveryUnsubRef.current = FirebaseServiceV2.subscribeToDeliveryLocation(activeOrderId, (loc) => {
      setDeliveryLocation(loc);
    });
    return () => { if (deliveryUnsubRef.current) deliveryUnsubRef.current(); };
  }, [activeOrderId, activeOrders]);

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

  useEffect(() => {
    if (!pendingSharedTarget) return;

    const business = allBusinesses.find((b) => b.id === pendingSharedTarget.businessId);
    if (!business) return;

    setSelectedBusiness(business);
    setMenuOriginView('home');
    setMenuSearchQuery('');
    setActiveMenuCategory('all');
    setView('menu');

    if (pendingSharedTarget.itemId) {
      const targetItem = (business.menu || []).find((item) => item.id === pendingSharedTarget.itemId);
      if (targetItem) {
        setSelectedMenuItem(targetItem as MenuItem);
        setSelectedDrinkSize(null);
        setModalNotes('');
        setModalQuantity(1);
        setModalOptionQuantities({});
      }
    }

    if (!user || user.role !== 'client') {
      return;
    }

    localStorage.removeItem('pending_shared_target');
    if (window.location.search) {
      window.history.replaceState({}, '', window.location.pathname);
    }
    setPendingSharedTarget(null);
  }, [pendingSharedTarget, user, allBusinesses]);

  useEffect(() => {
    if (user?.role === 'client') {
      setForceAuthForSharedOrder(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      hadAuthenticatedSessionRef.current = true;
      return;
    }

    if (!hadAuthenticatedSessionRef.current) return;

    setView('home');
    setMenuOriginView('home');
    setSelectedBusiness(null);
    setSelectedMenuItem(null);
    setMenuSearchQuery('');
    setActiveMenuCategory('all');
    setIsCartOpen(false);
    setForceAuthForSharedOrder(true);
  }, [user]);

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

  const canPreviewSharedContentAsGuest = !user && (
    !!pendingSharedTarget ||
    !!selectedBusiness ||
    !!selectedMenuItem ||
    view === 'menu' ||
    view === 'restaurant'
  );

  if (!user && (!canPreviewSharedContentAsGuest || forceAuthForSharedOrder)) {
    return <Auth />;
  }

  const requestSharedOrderAuth = () => {
    const sharedTarget = {
      businessId: selectedBusiness?.id || pendingSharedTarget?.businessId,
      itemId: selectedMenuItem?.id || pendingSharedTarget?.itemId,
      imageUrl: pendingSharedTarget?.imageUrl,
    };

    if (sharedTarget.businessId) {
      localStorage.setItem('pending_shared_target', JSON.stringify(sharedTarget));
      setPendingSharedTarget(sharedTarget as { businessId: string; itemId?: string; imageUrl?: string });
    }

    if (!sharedAuthNoticeShownRef.current) {
      sharedAuthNoticeShownRef.current = true;
      alert('Para agregar este artículo debes iniciar sesión o registrarte como cliente.');
    }

    setForceAuthForSharedOrder(true);
  };

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
  const selectedBusinessDeliveryFee = Number(selectedBusiness?.deliveryFee ?? 50);
  const deliveryFee = Number.isFinite(selectedBusinessDeliveryFee) && selectedBusinessDeliveryFee >= 0
    ? selectedBusinessDeliveryFee
    : 50;
  const selectedBusinessTransferAccounts = (() => {
    const rawAccounts = Array.isArray((selectedBusiness as any)?.transferBankAccounts)
      ? ((selectedBusiness as any).transferBankAccounts as any[])
      : [];
    const normalized = rawAccounts
      .map((account) => ({
        bankName: String(account?.bankName || '').trim(),
        accountNumber: String(account?.accountNumber || '').trim(),
        accountHolder: String(account?.accountHolder || '').trim(),
      }))
      .filter((account) => account.bankName && account.accountNumber && account.accountHolder);

    if (normalized.length > 0) return normalized;

    const legacyBank = String(selectedBusiness?.transferBankName || '').trim();
    const legacyNumber = String(selectedBusiness?.transferAccountNumber || '').trim();
    const legacyHolder = String(selectedBusiness?.transferAccountHolder || '').trim();
    if (legacyBank && legacyNumber && legacyHolder) {
      return [{ bankName: legacyBank, accountNumber: legacyNumber, accountHolder: legacyHolder }];
    }
    return [] as Array<{ bankName: string; accountNumber: string; accountHolder: string }>;
  })();
  const safeTransferAccountIndex = selectedBusinessTransferAccounts[selectedTransferAccountIndex] ? selectedTransferAccountIndex : 0;
  const selectedTransferAccount = selectedBusinessTransferAccounts[safeTransferAccountIndex] || null;
  const selectedBusinessHasTransferAccount = !!selectedTransferAccount;
  const favoriteBusinessIds = user?.favoriteBusinessIds || [];
  const isCurrentBusinessFavorite = !!selectedBusiness && favoriteBusinessIds.includes(selectedBusiness.id);
  const selectedBusinessMenu = selectedBusiness?.menu || [];
  const normalizeSearchText = (value: string) =>
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  const normalizedSearchQuery = normalizeSearchText(menuSearchQuery.trim());
  const containsAnyKeyword = (text: string, keywords: string[]) =>
    keywords.some((keyword) => text.includes(keyword));
  const isDrinkItem = (item?: MenuItem | null) => {
    if (!item) return false;
    const category = normalizeSearchText(item.category || '');
    const text = normalizeSearchText(`${item.name || ''} ${item.description || ''}`);
    return category.includes('bebida') || text.includes('jugo') || text.includes('refresco') || text.includes('batida');
  };
  const matchesMenuCategory = (item: MenuItem, category: string) => {
    const normalizedCategory = normalizeSearchText(category || '');
    const itemCategory = normalizeSearchText(item.category || 'general');
    const itemText = normalizeSearchText(`${item.name || ''} ${item.description || ''} ${item.category || ''}`);

    if (normalizedCategory === 'all') return true;
    if (normalizedCategory === 'bebidas') return isDrinkItem(item);
    if (itemCategory === normalizedCategory) return true;
    if (itemCategory.includes(normalizedCategory) || normalizedCategory.includes(itemCategory)) return true;

    if (normalizedCategory.includes('saludable')) {
      return containsAnyKeyword(itemText, ['ensalada', 'saludable', 'healthy', 'vegetal', 'vegano', 'fitness']);
    }

    if (normalizedCategory.includes('pollo')) {
      return containsAnyKeyword(itemText, ['pollo', 'pica pollo', 'chicken']);
    }

    if (normalizedCategory.includes('sandwich') || normalizedCategory.includes('sanduch') || normalizedCategory.includes('sandwiches')) {
      return containsAnyKeyword(itemText, ['sandwich', 'sanduche', 'sandwiches', 'sanduich']);
    }

    if (normalizedCategory.includes('comida dominicana') || normalizedCategory.includes('dominicana')) {
      return containsAnyKeyword(itemText, [
        'comida dominicana',
        'comida criolla',
        'pica pollo',
        'pollo',
        'habichuela',
        'arroz',
        'plato del dia',
        'mangu',
        'sancocho',
        'yaroa',
        'pastelon',
        'hamburguesa',
      ]);
    }

    return false;
  };
  const getMenuChoiceOptions = (item?: MenuItem | null) => {
    if (!item) return [] as { label: string; price: number | null; available?: boolean }[];

    if ((item.choiceOptions || []).length > 0) {
      return (item.choiceOptions || [])
        .filter((option) => option.label && Number.isFinite(option.price) && option.price > 0)
        .map((option) => ({ label: option.label.trim(), price: option.price, available: option.available }));
    }

    if ((item.drinkSizes || []).length > 0) {
      return (item.drinkSizes || [])
        .filter((size) => size.size && Number.isFinite(size.price) && size.price > 0)
        .map((size) => ({ label: size.size.trim(), price: size.price, available: size.available }));
    }

    if (!isDrinkItem(item)) {
      return [] as { label: string; price: number | null }[];
    }

    const description = item.description || '';
    const optionsWithPrice: { label: string; price: number | null }[] = [];
    const seen = new Set<string>();

    const sizePriceRegex = /(\d{1,3}\s?(?:oz|ml|l))\s*(?:-|=|:)?\s*(?:rd\$?\s*)?(\d{1,5}(?:\.\d{1,2})?)/gi;
    let match = sizePriceRegex.exec(description);
    while (match) {
      const size = match[1].replace(/\s+/g, ' ').trim();
      const price = Number(match[2]);
      if (!seen.has(size)) {
        seen.add(size);
        optionsWithPrice.push({ label: size, price: Number.isFinite(price) ? price : null });
      }
      match = sizePriceRegex.exec(description);
    }

    const sizeOnlyRegex = /\b\d{1,3}\s?(oz|ml|l)\b/gi;
    const sizeOnlyMatches = description.match(sizeOnlyRegex) || [];
    sizeOnlyMatches.forEach((rawSize) => {
      const size = rawSize.replace(/\s+/g, ' ').trim();
      if (!seen.has(size)) {
        seen.add(size);
        optionsWithPrice.push({ label: size, price: null });
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
      return matchesMenuCategory(item, activeMenuCategory);
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
      const menuSearchable = (business.menu || [])
        .map((item) => `${item.name || ''} ${item.description || ''} ${item.category || ''}`)
        .join(' ');
      const searchable = normalizeSearchText(`${business.name || ''} ${business.category || ''} ${business.address || ''} ${menuSearchable}`);
      return searchable.includes(normalizedRestaurantsSearchQuery);
    })
    .filter((business) => {
      if (restaurantsQuickFilter === 'featured') return (business.rating || 0) >= 4.6;
      if (restaurantsQuickFilter === 'discounts') return (business.totalOrders || 0) % 2 === 0;
      return true;
    });
  const allClientOrders = [...activeOrders, ...deliveredOrders, ...cancelledOrders]
    .sort((a, b) => {
      const aTime = new Date((a.deliveredAt || a.cancelledAt || a.createdAt) as string).getTime();
      const bTime = new Date((b.deliveredAt || b.cancelledAt || b.createdAt) as string).getTime();
      return bTime - aTime;
    });
  const unreadNotificationsCount = userNotifications.filter((item) => item.status === 'unread').length;
  const hasUnreadNotificationAlert = unreadNotificationsCount > 0;

  const handleMarkNotificationAsRead = async (notificationId: string) => {
    try {
      await FirebaseServiceV2.markNotificationAsRead(notificationId);
    } catch (error) {
      console.error('Error marcando notificación como leída:', error);
    }
  };

  const handleMarkAllNotificationsAsRead = async () => {
    if (!user?.id) return;
    try {
      await FirebaseServiceV2.markAllUserNotificationsAsRead(user.id);
    } catch (error) {
      console.error('Error marcando todas las notificaciones como leídas:', error);
    }
  };

  const handleAcceptPopupAnnouncement = async () => {
    if (!user?.id || !popupAnnouncement?.id) {
      setShowPopupAnnouncementModal(false);
      return;
    }

    try {
      await FirebaseServiceV2.acknowledgePopupAnnouncement(user.id, popupAnnouncement.id);
    } catch (error) {
      console.error('Error confirmando anuncio emergente:', error);
    } finally {
      setShowPopupAnnouncementModal(false);
    }
  };

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
    setPaymentMethod('cash');
    setSelectedTransferAccountIndex(0);
    setTransferReceiptImage(null);
    setMenuOriginView(view);
    setMenuSearchQuery('');
    setActiveMenuCategory('all');
    setSelectedMenuItem(null);
    setView('menu' as any);
  };

  const buildRestaurantShareLink = (business: Business) => {
    const base = `${window.location.origin}${window.location.pathname}`;
    const appParams = new URLSearchParams({
      share: 'restaurant',
      business: business.id,
    });
    const appUrl = `${base}?${appParams.toString()}`;
    const previewBase = String(import.meta.env.VITE_SHARE_PREVIEW_BASE_URL || '').trim();
    if (!previewBase) return appUrl;
    const previewParams = new URLSearchParams({
      t: 'r',
      b: business.id,
      u: base,
    });
    return `${previewBase}?${previewParams.toString()}`;
  };

  const buildMenuItemShareLink = (business: Business, item: MenuItem) => {
    const base = `${window.location.origin}${window.location.pathname}`;
    const appParams = new URLSearchParams({
      share: 'item',
      business: business.id,
      item: item.id,
    });
    const appUrl = `${base}?${appParams.toString()}`;
    const previewBase = String(import.meta.env.VITE_SHARE_PREVIEW_BASE_URL || '').trim();
    if (!previewBase) return appUrl;
    const previewParams = new URLSearchParams({
      t: 'i',
      b: business.id,
      m: item.id,
      u: base,
    });
    return `${previewBase}?${previewParams.toString()}`;
  };

  const shareLink = async (options: { title: string; text: string; url: string }) => {
    if (navigator.share) {
      try {
        await navigator.share(options);
        return;
      } catch (error) {
        console.warn('Share nativo no disponible, usando fallback:', error);
      }
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(options.url);
        alert('✅ Link copiado para compartir');
        return;
      }
    } catch (error) {
      console.warn('No se pudo copiar al portapapeles:', error);
    }

    window.prompt('Copia este link para compartir:', options.url);
  };

  const handleShareBusiness = async (business: Business) => {
    const url = buildRestaurantShareLink(business);
    await shareLink({
      title: `Pide en ${business.name}`,
      text: `Mira el menú de ${business.name} en Spdidos`,
      url,
    });
  };

  const handleShareMenuItem = async (business: Business, item: MenuItem) => {
    const url = buildMenuItemShareLink(business, item);
    await shareLink({
      title: `${item.name} · ${business.name}`,
      text: `Mira en el menú: ${item.name}`,
      url,
    });
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

    // WhatsApp number validation
    if (!user.whatsapp || user.whatsapp.trim() === '') {
      // Show WhatsApp verification modal
      setShowWhatsAppVerification(true);
      return;
    }

    // Validate WhatsApp number format
    const whatsappRegex = /^[\d\s\-\+\(\)]+$/;
    if (!whatsappRegex.test(user.whatsapp.trim())) {
      alert('El número de WhatsApp no tiene un formato válido. Por favor, actualízalo en tu perfil.');
      setView('profile');
      return;
    }

    const selectedBusinessOpenInfo = getBusinessOpenInfo(selectedBusiness);
    if (!selectedBusinessOpenInfo.isOpen) {
      alert(`El negocio está cerrado y no se pueden hacer pedidos en este momento. ${selectedBusinessOpenInfo.detail}`);
      return;
    }

    if (paymentMethod === 'transfer') {
      if (!selectedBusinessHasTransferAccount) {
        alert('Este negocio no tiene cuentas de transferencia configuradas. Usa efectivo o intenta más tarde.');
        return;
      }
      if (!transferReceiptImage) {
        alert('Debes subir el comprobante de transferencia antes de confirmar el pedido.');
        return;
      }
    }

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
      const selectedBusinessLocation = Array.isArray((selectedBusiness as any)?.location)
        && (selectedBusiness as any).location.length === 2
        && Number.isFinite(Number((selectedBusiness as any).location[0]))
        && Number.isFinite(Number((selectedBusiness as any).location[1]))
        ? [Number((selectedBusiness as any).location[0]), Number((selectedBusiness as any).location[1])] as [number, number]
        : (
          Number.isFinite(Number((selectedBusiness as any)?.latitude))
          && Number.isFinite(Number((selectedBusiness as any)?.longitude))
            ? [Number((selectedBusiness as any).latitude), Number((selectedBusiness as any).longitude)] as [number, number]
            : null
        );
      const orderData: any = {
        clientId: user.id,
        clientName: user.name,
        clientEmail: user.email,
        clientPhone: user.phone || user.whatsapp,
        clientWhatsapp: user.whatsapp,
        clientAddressDescription: user.addressDescription || '',
        businessId: selectedBusiness.id,
        businessName: selectedBusiness.name,
        businessEmail: selectedBusiness.email || '',
        businessPhone: selectedBusiness.phone || '',
        businessLocation: selectedBusinessLocation,
        businessLat: selectedBusinessLocation ? selectedBusinessLocation[0] : null,
        businessLng: selectedBusinessLocation ? selectedBusinessLocation[1] : null,
        items: cart.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          notes: item.notes || ''
        })),
        subtotal: cartTotal,
        deliveryFee,
        total: cartTotal + deliveryFee,
        status: 'pending',
        paymentMethod,
        deliveryAddress: '',
        deliveryInstructions: ''
      };
      if (paymentMethod === 'transfer') {
        orderData.transferBankName = selectedTransferAccount?.bankName || '';
        orderData.transferAccountNumber = selectedTransferAccount?.accountNumber || '';
        orderData.transferAccountHolder = selectedTransferAccount?.accountHolder || '';
        orderData.transferReceiptImage = transferReceiptImage;
        orderData.transferReceiptUploadedAt = new Date().toISOString();
      }
      orderData.clientLocation = { lat: gps.lat, lng: gps.lng };
      orderData.clientLat = gps.lat;
      orderData.clientLng = gps.lng;
      const saved = await FirebaseServiceV2.addOrder(orderData);
      // Save to client_locations collection too
      await FirebaseServiceV2.updateClientLocation(saved.id, gps.lat, gps.lng);
      
      // Send role-based push notifications
      await OrderNotificationService.notifyNewOrder({
        orderId: saved.id,
        businessId: orderData.businessId,
        businessName: orderData.businessName,
        clientId: orderData.clientId,
        clientName: orderData.clientName,
        total: orderData.total,
        status: orderData.status,
      });
      
      setActiveOrderId(saved.id);
      setView('tracking');
      setIsCartOpen(false);
      setCart([]);
      setPaymentMethod('cash');
      setSelectedTransferAccountIndex(0);
      setTransferReceiptImage(null);
    } catch (err) {
      console.error('Error al crear pedido:', err);
      alert('Error al crear el pedido. Intenta nuevamente.');
    } finally {
      checkoutLockRef.current = false;
      setIsCheckoutSubmitting(false);
    }
  };

  // If user is not a client, show their specific view directly
  if (user?.role === 'delivery') return <DeliveryView />;
  if (user?.role === 'business') return (
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
  if (user?.role === 'admin') return <AdminView />;

  return (
    <>
      <AnimatePresence>
        {showPopupAnnouncementModal && popupAnnouncement && user?.role === 'client' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[140] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 16 }}
              className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"
            >
              <h3 className="text-2xl font-black text-gray-900">{popupAnnouncement.title}</h3>
              <p className="mt-3 text-gray-600 whitespace-pre-line">{popupAnnouncement.message}</p>
              <button
                onClick={handleAcceptPopupAnnouncement}
                className="mt-6 w-full py-3 rounded-xl bg-primary text-white font-black hover:bg-primary/90 transition-colors"
              >
                Aceptar
              </button>
            </motion.div>
          </motion.div>
        )}
        {showWhatsAppVerification && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[140] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 16 }}
              className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"
            >
              <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mx-auto mb-4">
                <MessageCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-2xl font-black text-gray-900 text-center mb-3">Agrega tu número de WhatsApp</h3>
              <p className="text-gray-600 text-center mb-6">
                Para poder realizar pedidos debes agregar tu número de WhatsApp en tu perfil.
                El repartidor puede contactarte por esa vía cuando llegue a tu ubicación.
              </p>
              <button
                onClick={() => {
                  setShowWhatsAppVerification(false);
                  setView('profile');
                }}
                className="w-full py-3.5 rounded-2xl bg-green-600 text-white font-black hover:bg-green-700 transition-all flex items-center justify-center gap-2"
              >
                <User className="w-4 h-4" />
                Ir a mi perfil
              </button>
              <button
                onClick={() => setShowWhatsAppVerification(false)}
                className="mt-3 w-full py-3.5 rounded-2xl border-2 border-gray-200 text-gray-600 font-black hover:bg-gray-50 transition-all"
              >
                Cancelar
              </button>
            </motion.div>
          </motion.div>
        )}
        {arrivedOrderId && (
          <ArrivalNotificationModal onConfirm={handleConfirmArrival} />
        )}
      </AnimatePresence>
    <Layout
      activeView={view}
      onViewChange={setView}
      cartCount={cart.reduce((a, b) => a + b.quantity, 0)}
      onCartClick={() => setIsCartOpen(true)}
      showInstallAppButton={!isStandaloneMode}
      onInstallAppClick={handleInstallApp}
      showCartHint={showCartHint}
      onCartHintDismiss={() => setShowCartHint(false)}
      orderCount={activeOrders.length}
      notificationCount={unreadNotificationsCount}
      hasUnreadNotificationAlert={hasUnreadNotificationAlert}
      onNotificationBellClick={handleNotificationBellClick}
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
              {[
                { label: 'Saludable', icon: '🥗' },
                { label: 'Comida dominicana', icon: '🇩🇴' },
                { label: 'Hamburguesas', icon: '🍔' },
                { label: 'Sándwiches', icon: '🥪' },
                { label: 'Pollo', icon: '🐔' },
              ].map((category) => (
                <button
                  key={category.label}
                  onClick={() => setRestaurantsSearchQuery(category.label)}
                  className="flex-shrink-0 bg-white rounded-2xl p-2.5 w-[88px] border border-gray-100 text-center"
                >
                  <div className="w-14 h-14 rounded-xl bg-gray-100 mx-auto mb-2 flex items-center justify-center text-3xl">
                    <span role="img" aria-label={category.label}>{category.icon}</span>
                  </div>
                  <p className="text-xs font-semibold text-gray-700 leading-tight">{category.label}</p>
                </button>
              ))}
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
                        <button
                          onClick={() => handleShareBusiness(business)}
                          className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center"
                          title="Compartir negocio"
                        >
                          <Share2 className="w-4 h-4 text-gray-600" />
                        </button>
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
              <button
                onClick={() => handleShareBusiness(selectedBusiness)}
                className="ml-auto inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-gray-200 shadow-sm text-sm font-bold text-gray-700"
              >
                <Share2 className="w-4 h-4" /> Compartir
              </button>
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
                onClick={() => handleShareBusiness(selectedBusiness)}
                className="w-11 h-11 rounded-full flex items-center justify-center shadow-sm border bg-white border-gray-100 text-gray-500"
                title="Compartir negocio"
              >
                <Share2 className="w-5 h-5" />
              </button>
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
                  {filteredMenuItems.map((item: any) => {
                      const isUnavailable = item.available === false;
                      return (
                      <div
                        key={item.id}
                        role="button"
                        tabIndex={isUnavailable ? -1 : 0}
                        onClick={() => {
                          if (isUnavailable) return;
                          setSelectedMenuItem(item);
                          setSelectedDrinkSize(null);
                          setModalQuantity(0);
                          setModalOptionQuantities({});
                        }}
                        onKeyDown={(e) => {
                          if (isUnavailable) return;
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelectedMenuItem(item);
                            setSelectedDrinkSize(null);
                            setModalQuantity(0);
                            setModalOptionQuantities({});
                          }
                        }}
                        className={`bg-white rounded-2xl overflow-hidden border shadow-sm ${isUnavailable ? 'border-gray-200 opacity-60 cursor-not-allowed' : 'border-gray-100 cursor-pointer'}`}
                      >
                        <div className="relative h-32 md:h-40 overflow-hidden w-full text-left">
                          <img
                            src={item.image || 'https://picsum.photos/seed/food/300/200'}
                            alt={item.name}
                            className={`w-full h-full object-cover ${isUnavailable ? 'grayscale' : ''}`}
                          />
                          {isUnavailable && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                              <span className="bg-red-600 text-white text-xs font-black px-3 py-1.5 rounded-full uppercase tracking-wide">No disponible</span>
                            </div>
                          )}
                        </div>
                        <div className="p-3">
                          <div className="flex items-start justify-between gap-2">
                            <h5 className={`font-bold text-[15px] leading-tight line-clamp-2 ${isUnavailable ? 'text-gray-400' : 'text-gray-900'}`}>{item.name}</h5>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleShareMenuItem(selectedBusiness, item as MenuItem);
                              }}
                              className="w-8 h-8 rounded-full border border-gray-200 text-gray-600 flex items-center justify-center hover:bg-gray-50"
                              title="Compartir artículo"
                            >
                              <Share2 className="w-4 h-4" />
                            </button>
                          </div>
                          <p className="text-sm text-gray-500 mt-1 line-clamp-2 min-h-[2.5rem]">{item.description || 'Sin descripción disponible'}</p>
                          <p className={`text-lg font-black mt-2 ${isUnavailable ? 'text-gray-400 line-through' : 'text-gray-900'}`}>RD$ {item.price}</p>
                        </div>
                      </div>
                      );
                    })}
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
                    const choiceOptions = getMenuChoiceOptions(selectedMenuItem);
                    const activeChoiceLabel = selectedDrinkSize || choiceOptions.find(o => o.available !== false)?.label || null;
                    const activeChoiceOption = choiceOptions.find((opt) => opt.label === activeChoiceLabel) || null;
                    const selectedPrice = activeChoiceOption?.price ?? selectedMenuItem.price;
                    const optionQuantitiesTotal = choiceOptions.reduce((acc, option) => acc + (modalOptionQuantities[option.label] || 0), 0);
                    const selectedOptionQuantity = activeChoiceLabel ? (modalOptionQuantities[activeChoiceLabel] || 0) : 0;
                    const modalTotalQuantity = choiceOptions.length > 0 ? optionQuantitiesTotal : modalQuantity;
                    const modalTotalPrice = choiceOptions.length > 0
                      ? choiceOptions.reduce((acc, option) => acc + ((modalOptionQuantities[option.label] || 0) * option.price), 0)
                      : selectedPrice * modalQuantity;
                    const optionGroupLabel = selectedMenuItem.optionGroupLabel || (isDrink ? 'Tamaño' : 'Sabor');
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
                      setModalOptionQuantities({});
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
                            setModalOptionQuantities({});
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

                        {choiceOptions.length > 0 && (
                          <div className="border-t border-gray-100 pt-4">
                            <div className="flex items-center justify-between">
                              <p className="text-2xl font-black text-gray-900">Elige una opción</p>
                              <span className="text-xs px-3 py-1 rounded-full bg-gray-100 text-gray-600 font-bold">Requerido</span>
                            </div>

                            <div className="mt-3 space-y-2">
                              {choiceOptions.map((option) => {
                                const optionLabel = option.label;
                                const isOptionUnavailable = option.available === false;
                                const isSelected = !isOptionUnavailable && (selectedDrinkSize || choiceOptions.find(o => o.available !== false)?.label) === optionLabel;
                                const optionQty = modalOptionQuantities[optionLabel] || 0;
                                return (
                                  <button
                                    key={optionLabel}
                                    type="button"
                                    disabled={isOptionUnavailable}
                                    onClick={() => { if (!isOptionUnavailable) setSelectedDrinkSize(optionLabel); }}
                                    className={`w-full flex items-center justify-between rounded-xl border px-4 py-3 ${
                                      isOptionUnavailable
                                        ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                                        : isSelected ? 'border-primary bg-primary/5' : 'border-gray-200'
                                    }`}
                                  >
                                    <span className={`font-semibold uppercase ${isOptionUnavailable ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{optionLabel}</span>
                                    <div className="flex items-center gap-3">
                                      {isOptionUnavailable ? (
                                        <span className="text-xs font-black px-2 py-0.5 rounded-full bg-red-100 text-red-600">Agotado</span>
                                      ) : (
                                        <>
                                          <span className="text-sm font-bold text-gray-500">{option.price ? `RD$ ${option.price}` : ''}</span>
                                          <span className={`text-xs font-black px-2 py-0.5 rounded-full ${optionQty > 0 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
                                            x{optionQty}
                                          </span>
                                          <div className={`w-5 h-5 rounded-full border-2 ${isSelected ? 'border-primary bg-primary' : 'border-gray-300'}`} />
                                        </>
                                      )}
                                    </div>
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
                            onClick={() => {
                              if (choiceOptions.length > 0 && activeChoiceLabel) {
                                setModalOptionQuantities((prev) => ({
                                  ...prev,
                                  [activeChoiceLabel]: Math.max(0, (prev[activeChoiceLabel] || 0) - 1),
                                }));
                                return;
                              }
                              setModalQuantity((q) => Math.max(0, q - 1));
                            }}
                            className="w-10 h-10 rounded-full border-2 border-gray-300 flex items-center justify-center text-xl font-bold text-gray-600 hover:border-primary hover:text-primary transition-colors"
                          >
                            −
                          </button>
                          <span className="text-2xl font-black text-gray-900 min-w-[2rem] text-center">
                            {choiceOptions.length > 0 ? selectedOptionQuantity : modalQuantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              if (choiceOptions.length > 0 && activeChoiceLabel) {
                                setModalOptionQuantities((prev) => ({
                                  ...prev,
                                  [activeChoiceLabel]: (prev[activeChoiceLabel] || 0) + 1,
                                }));
                                return;
                              }
                              setModalQuantity((q) => q + 1);
                            }}
                            className="w-10 h-10 rounded-full border-2 border-gray-300 flex items-center justify-center text-xl font-bold text-gray-600 hover:border-primary hover:text-primary transition-colors"
                          >
                            +
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (!user || user.role !== 'client') {
                              requestSharedOrderAuth();
                              return;
                            }

                            const selectedName = activeChoiceLabel
                              ? `${selectedMenuItem.name} (${activeChoiceLabel.toUpperCase()})`
                              : selectedMenuItem.name;
                            const selectedId = activeChoiceLabel
                              ? `${selectedMenuItem.id}-${activeChoiceLabel}`
                              : selectedMenuItem.id;
                            if (choiceOptions.length > 0) {
                              choiceOptions.forEach((option) => {
                                const optionQty = modalOptionQuantities[option.label] || 0;
                                if (optionQty < 1) return;
                                const optionId = `${selectedMenuItem.id}-${option.label}`;
                                const optionName = `${selectedMenuItem.name} (${option.label.toUpperCase()})`;
                                for (let i = 0; i < optionQty; i++) {
                                  addToCart(optionId, optionName, option.price, modalNotes);
                                }
                              });
                            } else {
                              for (let i = 0; i < modalQuantity; i++) {
                                addToCart(selectedId, selectedName, selectedPrice, modalNotes);
                              }
                            }
                            if (modalTotalQuantity > 0) setShowCartHint(true);
                            setSelectedMenuItem(null);
                            setSelectedDrinkSize(null);
                            setModalNotes('');
                            setModalQuantity(0);
                            setModalOptionQuantities({});
                          }}
                          className="w-full py-4 rounded-2xl bg-primary text-white font-black text-lg"
                          disabled={selectedMenuItem.available === false || modalTotalQuantity < 1}
                        >
                          {selectedMenuItem.available === false ? 'No disponible' : modalTotalQuantity < 1 ? 'Selecciona la cantidad' : `Agregar al pedido · RD$ ${modalTotalPrice.toFixed(0)}`}
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

        {view === 'notifications' && (
          <motion.div
            key="notifications"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8 px-4 lg:px-0"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-3xl font-black font-display tracking-tight">Notificaciones</h2>
              <button
                onClick={handleMarkAllNotificationsAsRead}
                disabled={unreadNotificationsCount === 0}
                className="px-3 py-2 rounded-xl text-xs font-black bg-primary/10 text-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Marcar todas como leídas
              </button>
            </div>

            {userNotifications.length === 0 ? (
              <div className="text-center py-12">
                <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">No tienes notificaciones</h3>
                <p className="text-gray-400">Cuando recibas una, aparecerá aquí</p>
              </div>
            ) : (
              <div className="space-y-4">
                {userNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`rounded-2xl p-5 border ${notification.status === 'unread' ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-100'}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-gray-900">{notification.title}</p>
                        <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                        <p className="text-xs text-gray-400 mt-3">
                          {new Date(notification.createdAt).toLocaleDateString()} · {new Date(notification.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide ${notification.status === 'unread' ? 'bg-amber-200 text-amber-800' : 'bg-emerald-100 text-emerald-700'}`}>
                          {notification.status === 'unread' ? 'No leída' : 'Leída'}
                        </span>
                        {notification.status === 'unread' && (
                          <button
                            onClick={() => handleMarkNotificationAsRead(notification.id)}
                            className="text-xs font-bold text-primary hover:text-primary/80"
                          >
                            Marcar como leída
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
            <AnimatePresence>
              {selectedClientHistoryOrder && (
                <ClientOrderDetailsModal
                  order={selectedClientHistoryOrder}
                  onClose={() => setSelectedClientHistoryOrder(null)}
                />
              )}
            </AnimatePresence>

            <div>
              <h2 className="text-3xl font-black font-display tracking-tight mb-8">Historial de pedidos</h2>

              {allClientOrders.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-900 mb-2">No tienes pedidos todavía</h3>
                  <p className="text-gray-400">Cuando hagas pedidos, verás todo tu historial aquí</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {allClientOrders.map(order => {
                    const displayDate = order.deliveredAt || order.cancelledAt || order.createdAt;
                    const isInProcess = order.status !== 'delivered' && order.status !== 'cancelled';
                    return (
                      <div key={order.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                          <div>
                            <p className="text-sm font-bold text-gray-900">{order.businessName || 'Negocio no disponible'}</p>
                            <p className="text-xs text-gray-500">Pedido #{order.id.slice(-8).toUpperCase()}</p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${getClientOrderStatusSummaryStyles(order.status)}`}>
                            {getClientOrderStatusSummary(order.status)}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm mb-4">
                          <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                            <p className="text-gray-500 font-semibold">Fecha</p>
                            <p className="font-bold text-gray-900">{new Date(displayDate).toLocaleDateString()}</p>
                          </div>
                          <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                            <p className="text-gray-500 font-semibold">Hora</p>
                            <p className="font-bold text-gray-900">{new Date(displayDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                          </div>
                          <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                            <p className="text-gray-500 font-semibold">Total</p>
                            <p className="font-bold text-gray-900">RD$ {(order.total || 0).toFixed(0)}</p>
                          </div>
                        </div>

                        <div className="pt-4 border-t flex flex-wrap items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedClientHistoryOrder(order)}
                            className="px-4 py-2 rounded-xl bg-primary/10 text-primary font-bold text-sm hover:bg-primary/20 transition-colors"
                          >
                            Ver detalles
                          </button>
                          {isInProcess && (
                            <button
                              onClick={() => {
                                setActiveOrderId(order.id);
                                setView('tracking');
                              }}
                              className="px-4 py-2 rounded-xl bg-blue-100 text-blue-700 font-bold text-sm hover:bg-blue-200 transition-colors"
                            >
                              Ver seguimiento
                            </button>
                          )}
                          {canClientCancelOrder(order) && (
                            <button
                              onClick={() => handleClientCancelOrder(order)}
                              className="text-xs font-bold px-3 py-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                            >
                              Cancelar pedido (restan {getOrderCancelTimeLeftText(order)} min)
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
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
        deliveryFee={deliveryFee}
        onAdd={(item) => addToCart(item.id, item.name, item.price, item.notes)}
        onRemove={removeFromCart}
        onCheckout={handleCheckout}
        isCheckingOut={isCheckoutSubmitting}
        total={cartTotal}
        paymentMethod={paymentMethod}
        onPaymentMethodChange={setPaymentMethod}
        transferBankAccounts={selectedBusinessTransferAccounts}
        selectedTransferAccountIndex={safeTransferAccountIndex}
        onTransferAccountChange={setSelectedTransferAccountIndex}
        transferReceiptImage={transferReceiptImage}
        onTransferReceiptChange={setTransferReceiptImage}
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
      <AppContent />
      <AnimatePresence>{showSplash ? <SplashScreen /> : null}</AnimatePresence>
    </AuthProvider>
  );
}

export default App;



