import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Clock, Star, Plus, Minus, CheckCircle2, ShoppingBag, MapPin, Truck, ChefHat, Package, Navigation, Bell, X, User, Volume2, LogOut, Save, Heart, Phone, MessageCircle, Mail } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import Layout from './components/Layout';
import HomeView from './components/HomeView';
import BusinessList from './components/BusinessList';
import CartDrawer from './components/CartDrawer';
import Auth from './components/Auth';
import DeliveryView from './views/DeliveryView';
import BusinessView from './views/BusinessView';
import AdminView from './views/AdminView';
import { CartItem, View, Order } from './types';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import DataService, { Business } from './services/DataService';
import FirebaseServiceV2, { HomeAnnouncement } from './services/FirebaseServiceV2';
import EventService from './services/EventService';
import { soundService } from './services/SoundService';
import { initFCMToken, listenFCMForeground } from './services/FCMService';
import { SPM_CENTER } from './constants';

const ORDER_STEPS = [
  { status: 'pending',    label: 'Pedido recibido',   icon: Package },
  { status: 'accepted',   label: 'Aceptado',           icon: CheckCircle2 },
  { status: 'preparing',  label: 'Preparando',         icon: ChefHat },
  { status: 'ready',      label: 'Listo para envío',   icon: ShoppingBag },
  { status: 'on_the_way', label: 'En camino',          icon: Truck },
  { status: 'arrived',    label: '¡Repartidor llegó!',  icon: MapPin },
  { status: 'delivered',  label: 'Entregado',          icon: CheckCircle2 },
];

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
          <CheckCircle2 className="w-6 h-6" /> Confirmar que el delivery llegó
        </button>
        <p className="text-center text-xs text-gray-400 mt-3">Al confirmar, el pedido se marcará como entregado</p>
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
            <div key={item.id} className="flex justify-between text-sm">
              <span className="text-gray-700"><span className="font-bold">{item.quantity}x</span> {item.name}</span>
              <span className="font-bold">RD$ {(item.price * item.quantity).toFixed(0)}</span>
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

const TrackingView: React.FC<{
  orderId: string | null;
  orders: Order[];
  deliveryLocation: { lat: number; lng: number } | null;
  onBack: () => void;
}> = ({ orderId, orders, deliveryLocation, onBack }) => {
  const order = orderId ? orders.find(o => o.id === orderId) || orders[0] : orders[0];
  const stepIndex = order ? ORDER_STEPS.findIndex(s => s.status === order.status) : 0;
  const deliverPos: [number, number] = deliveryLocation ? [deliveryLocation.lat, deliveryLocation.lng] : SPM_CENTER;

  const [secsLeft, setSecsLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!order?.id) { setSecsLeft(null); return; }

    const isPrep   = order.status === 'preparing';
    const isOnWay  = order.status === 'on_the_way';
    if (!isPrep && !isOnWay) { setSecsLeft(null); return; }

    const lsKey    = `spdidos_eta_${order.id}_${order.status}`;
    const etaMins  = isPrep
      ? getEtaMinutes(order.id, 20, 30)
      : getEtaMinutes(order.id, 15, 20);
    const etaMs    = etaMins * 60 * 1000;

    let startTime  = parseInt(localStorage.getItem(lsKey) ?? '0', 10);
    if (!startTime) {
      startTime = Date.now();
      localStorage.setItem(lsKey, String(startTime));
    }

    const calc = () => Math.max(0, Math.round((startTime + etaMs - Date.now()) / 1000));
    setSecsLeft(calc());

    const interval = setInterval(() => {
      const remaining = calc();
      setSecsLeft(remaining);
      if (remaining === 0) clearInterval(interval);
    }, 1000);

    return () => clearInterval(interval);
  }, [order?.id, order?.status]);

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
              <p className={`text-3xl font-black tabular-nums ${
                order.status === 'preparing' ? 'text-amber-700' : 'text-blue-700'
              }`}>
                {fmtTime(secsLeft)} <span className="text-sm font-semibold opacity-60">min</span>
              </p>
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

      {/* Mapa cuando el repartidor está en camino */}
      {order?.status === 'on_the_way' && deliveryLocation && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-50 flex items-center gap-2">
            <Navigation className="w-4 h-4 text-blue-600" />
            <span className="font-bold text-sm text-gray-900">Repartidor en camino</span>
            <span className="ml-auto text-xs text-gray-400 animate-pulse">En vivo</span>
          </div>
          <div className="h-[220px]">
            <MapContainer center={deliverPos} zoom={15} className="h-full w-full" scrollWheelZoom={false}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <Marker position={deliverPos} icon={L.icon({ iconUrl: 'https://cdn-icons-png.flaticon.com/512/2972/2972185.png', iconSize: [32, 32], iconAnchor: [16, 32] })}>
                <Popup>Tu repartidor</Popup>
              </Marker>
            </MapContainer>
          </div>
        </div>
      )}

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
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [deliveryLocation, setDeliveryLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [arrivedOrderId, setArrivedOrderId] = useState<string | null>(null);
  const [homeAnnouncement, setHomeAnnouncement] = useState<HomeAnnouncement | null>(null);
  const deliveryUnsubRef = useRef<(() => void) | null>(null);
  const clientGpsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // ── Client: notify whenever an order is (or becomes) 'arrived' ─────────────
  const arrivedNotifiedIds = useRef<Set<string>>(new Set());

  // ── Business global notification (fires from any tab) ───────────────────────
  const [incomingOrder, setIncomingOrder] = useState<Order | null>(null);
  const bizNotifiedIds  = useRef<Set<string>>(new Set());
  const bizShowingModal = useRef(false);

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
      latestActive = active;
      notify(active);
      setActiveOrders(active);
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
    });
    return () => { unsub(); soundService.stopRinging(); };
  }, [user?.role, (user as any)?.businessId]);

  const handleAcceptBusiness = async () => {
    if (!incomingOrder) return;
    soundService.stopRinging();
    bizShowingModal.current = false;
    const order = incomingOrder;
    setIncomingOrder(null);
    try { await FirebaseServiceV2.updateOrder(order.id, { status: 'accepted' }); }
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

  const handleConfirmArrival = async () => {
    if (!arrivedOrderId) return;
    soundService.stopRinging();
    setArrivedOrderId(null);
    try {
      await FirebaseServiceV2.updateOrder(arrivedOrderId, { status: 'delivered' });
    } catch (err) { console.error('Error confirmando entrega:', err); }
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

  const addToCart = (id: string, name: string, price: number) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === id);
      if (existing) {
        return prev.map(i => i.id === id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { id, name, price, quantity: 1 }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === id);
      if (existing && existing.quantity > 1) {
        return prev.map(i => i.id === id ? { ...i, quantity: i.quantity - 1 } : i);
      }
      return prev.filter(i => i.id !== id);
    });
  };

  const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  const handleBusinessSelect = async (business: Business) => {
    try {
      console.log('🔍 [App] Cargando negocio completo desde Firebase:', business.id);
      // Obtener el negocio más reciente desde Firebase para tener el menú actualizado
      const businesses = await FirebaseServiceV2.getBusinesses();
      const updatedBusiness = businesses.find(b => b.id === business.id);
      if (updatedBusiness) {
        setSelectedBusiness(updatedBusiness);
        console.log('✅ [App] Negocio actualizado:', updatedBusiness.name, updatedBusiness.image ? 'con imagen' : 'sin imagen');
      } else {
        setSelectedBusiness(business);
      }
      setView('restaurant');
    } catch (error) {
      console.error('❌ [App] Error cargando negocio:', error);
      setSelectedBusiness(business);
      setView('restaurant');
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

  const handleCheckout = async () => {
    if (!selectedBusiness || !user) return;
    try {
      // Capture GPS before saving
      const gps = await getClientGPS();
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
        items: cart.map(item => ({ id: item.id, name: item.name, price: item.price, quantity: item.quantity })),
        subtotal: cartTotal,
        deliveryFee: 50,
        total: cartTotal + 50,
        status: 'pending',
        paymentMethod: 'cash',
        deliveryAddress: '',
        deliveryInstructions: ''
      };
      if (gps) {
        orderData.clientLocation = { lat: gps.lat, lng: gps.lng };
        orderData.clientLat = gps.lat;
        orderData.clientLng = gps.lng;
      }
      const saved = await FirebaseServiceV2.addOrder(orderData);
      // Save to client_locations collection too
      if (gps) await FirebaseServiceV2.updateClientLocation(saved.id, gps.lat, gps.lng);
      setActiveOrderId(saved.id);
      setView('tracking');
      setIsCartOpen(false);
      setCart([]);
    } catch (err) {
      console.error('Error al crear pedido:', err);
      alert('Error al crear el pedido. Intenta nuevamente.');
    }
  };

  // If user is not a client, show their specific view directly
  if (user.role === 'delivery') return <DeliveryView />;
  if (user.role === 'business') return (
    <>
      <AnimatePresence>
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
            <HomeView announcement={homeAnnouncement ?? undefined}>
              <BusinessList onBusinessSelect={handleBusinessSelect} />
            </HomeView>
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
            className="space-y-8 px-4 lg:px-0"
          >
            <div className="flex items-center gap-4">
              <button onClick={() => setView('restaurant')} className="p-2 hover:bg-white rounded-full transition-all shadow-sm">
                <ChevronLeft className="w-6 h-6" />
              </button>
              <h2 className="text-3xl font-black font-display tracking-tight">Menú - {selectedBusiness.name}</h2>
            </div>

            <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-black/5">
              <h3 className="text-2xl font-bold mb-6">Menú Completo</h3>
              
              {selectedBusiness.menu && selectedBusiness.menu.length > 0 ? (
                <div className="space-y-8">
                  {/* Agrupar por categorías */}
                  {Object.entries(
                    selectedBusiness.menu.reduce((acc, item) => {
                      const category = item.category || 'General';
                      if (!acc[category]) acc[category] = [];
                      acc[category].push(item);
                      return acc;
                    }, {} as Record<string, any[]>)
                  ).map(([category, items]: [string, any[]]) => (
                    <div key={category} className="space-y-4">
                      <div className="flex items-center gap-3 pb-2 border-b-2 border-primary/20">
                        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                          <span className="text-white text-sm font-bold">
                            {category.charAt(0)}
                          </span>
                        </div>
                        <h4 className="text-xl font-black text-gray-900 uppercase tracking-wider">
                          {category}
                        </h4>
                        <span className="text-sm text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                          {items.length} productos
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {items.map((item: any) => (
                          <div 
                            key={item.id} 
                            className="bg-gradient-to-br from-white to-gray-50 rounded-2xl overflow-hidden border border-gray-100 hover:shadow-xl transition-all group cursor-pointer"
                          >
                            {/* Imagen del producto */}
                            <div className="relative h-48 overflow-hidden">
                              <img 
                                src={item.image || 'https://picsum.photos/seed/food/300/200'} 
                                alt={item.name}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 cursor-pointer"
                                onClick={() => {
                                  // Crear modal seguro para ver imagen
                                  const modal = document.createElement('div');
                                  modal.style.cssText = `
                                    position: fixed;
                                    top: 0;
                                    left: 0;
                                    width: 100%;
                                    height: 100%;
                                    background: rgba(0, 0, 0, 0.9);
                                    z-index: 9999;
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                  `;
                                  
                                  const img = document.createElement('img');
                                  img.src = item.image || 'https://picsum.photos/seed/food/800/600';
                                  img.alt = item.name;
                                  img.style.cssText = `
                                    max-width: 90vw;
                                    max-height: 90vh;
                                    object-fit: contain;
                                  `;
                                  
                                  const closeBtn = document.createElement('button');
                                  closeBtn.textContent = '✕ Cerrar';
                                  closeBtn.style.cssText = `
                                    position: absolute;
                                    top: 20px;
                                    right: 20px;
                                    background: white;
                                    padding: 8px 16px;
                                    border-radius: 8px;
                                    cursor: pointer;
                                    z-index: 10000;
                                  `;
                                  closeBtn.onclick = () => modal.remove();
                                  
                                  modal.appendChild(img);
                                  modal.appendChild(closeBtn);
                                  document.body.appendChild(modal);
                                }}
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <div className="absolute bottom-4 left-4 right-4">
                                  <div className="bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-xl">
                                    <span className="text-white text-xs font-medium">
                                      Click para ver imagen
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Información del producto */}
                            <div className="p-6">
                              <div className="flex justify-between items-start mb-4">
                                <div className="flex-1">
                                  <h5 className="font-bold text-lg text-gray-900 group-hover:text-primary transition-colors">
                                    {item.name}
                                  </h5>
                                  <p className="text-gray-400 text-sm mt-1 line-clamp-2">
                                    {item.description}
                                  </p>
                                </div>
                                <div className="ml-4 text-right">
                                  <span className="text-2xl font-black text-primary block">
                                    RD$ {item.price}
                                  </span>
                                  {item.available === false && (
                                    <span className="text-xs text-red-500 font-medium">
                                      No disponible
                                    </span>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <button 
                                    onClick={() => removeFromCart(item.id)}
                                    className="w-8 h-8 bg-white rounded-lg shadow-sm hover:shadow-md transition-all flex items-center justify-center group-hover:scale-110"
                                    disabled={item.available === false}
                                  >
                                    <Minus className="w-4 h-4 text-gray-600" />
                                  </button>
                                  <span className="w-12 text-center font-bold text-lg">
                                    {cart.find(i => i.id === item.id)?.quantity || 0}
                                  </span>
                                  <button 
                                    onClick={() => addToCart(item.id, item.name, item.price)}
                                    className="w-8 h-8 bg-primary text-white rounded-lg shadow-sm hover:shadow-md transition-all flex items-center justify-center group-hover:scale-110 disabled:opacity-50"
                                    disabled={item.available === false}
                                  >
                                    <Plus className="w-4 h-4" />
                                  </button>
                                </div>
                                
                                {cart.find(i => i.id === item.id)?.quantity && (
                                  <div className="text-xs text-green-600 font-medium animate-pulse">
                                    ✓ En carrito
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
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
              
              {activeOrders.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-900 mb-2">No tienes pedidos activos</h3>
                  <p className="text-gray-400">Tu historial de pedidos aparecerá aquí</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeOrders.map(order => (
                    <div key={order.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-bold text-lg">Pedido #{order.id.slice(-8)}</h3>
                          <p className="text-sm text-gray-400">{new Date(order.createdAt).toLocaleDateString()}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                          order.status === 'preparing' ? 'bg-blue-100 text-blue-700' :
                          order.status === 'ready' ? 'bg-purple-100 text-purple-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {order.status === 'pending' ? 'Pendiente' :
                           order.status === 'preparing' ? 'Preparando' :
                           order.status === 'ready' ? 'Listo para recoger' : 'Entregado'}
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
                      
                      <div className="pt-4 border-t flex justify-between items-center">
                        <span className="font-bold text-lg">RD$ {order.total}</span>
                        <button 
                          onClick={() => setView('tracking')}
                          className="text-primary font-medium hover:text-primary/80 transition-colors"
                        >
                          Ver detalles →
                        </button>
                      </div>
                    </div>
                  ))}
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
          </motion.div>
        )}
      </AnimatePresence>

      <CartDrawer 
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cart}
        onRemove={removeFromCart}
        onCheckout={handleCheckout}
        total={cartTotal}
      />
    </Layout>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
