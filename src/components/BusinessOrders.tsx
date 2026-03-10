import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, MapPin, User, Phone, MessageCircle, CheckCircle2, Package, Truck, ChefHat, Bell, X, AlertCircle, Navigation, Map, ChevronDown, ChevronUp, Volume2 } from 'lucide-react';
import { Order } from '../types';
import FirebaseServiceV2 from '../services/FirebaseServiceV2';
import { soundService } from '../services/SoundService';
import { useAuth } from '../contexts/AuthContext';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

const OrderDetailsModal: React.FC<{ order: Order; onClose: () => void }> = ({ order, onClose }) => {
  const acceptedDate = order.acceptedAt ? new Date(order.acceptedAt) : null;
  const acceptedTime = acceptedDate
    ? acceptedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'Aún no aceptado';
  const uniqueNotes = Array.from(new Set((order.items || [])
    .map((item) => String(item.notes || '').trim())
    .filter(Boolean)));
  const clientNote = uniqueNotes.length > 0
    ? uniqueNotes.join(' · ')
    : (order.deliveryInstructions || 'Sin nota del cliente');

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
          <p className="text-white/85 text-sm">Resumen completo para preparar la orden</p>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto max-h-[72vh]">
          <div className="bg-gray-50 rounded-2xl p-4 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">ID / Número</span><span className="font-black">#{order.id.slice(-8).toUpperCase()}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Hora de aceptación</span><span className="font-black">{acceptedTime}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Total del pedido</span><span className="font-black text-emerald-700">RD$ {order.total?.toFixed(0)}</span></div>
          </div>

          <div>
            <p className="font-black text-gray-900 mb-2">Productos pedidos</p>
            <div className="space-y-2">
              {(order.items || []).map((item) => (
                <div key={`${item.id}-${item.notes || 'sin-nota'}`} className="border border-gray-100 rounded-xl p-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700"><span className="font-black">{item.quantity}x</span> {item.name}</span>
                    <span className="font-black">RD$ {(item.price * item.quantity).toFixed(0)}</span>
                  </div>
                  {item.notes && <p className="text-xs text-gray-500 mt-1">Nota del cliente: {item.notes}</p>}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-blue-50 rounded-2xl p-4 space-y-2 text-sm">
            <p><span className="font-black text-blue-900">Nombre:</span> <span className="text-blue-900">{order.clientName || 'No disponible'}</span></p>
            <p><span className="font-black text-blue-900">Teléfono:</span> <span className="text-blue-900">{order.clientPhone || order.clientWhatsapp || 'No disponible'}</span></p>
            <p><span className="font-black text-blue-900">Dirección exacta:</span> <span className="text-blue-900">{order.deliveryAddress || 'No disponible'}</span></p>
            <p><span className="font-black text-blue-900">Nota del cliente:</span> <span className="text-blue-900">{clientNote}</span></p>
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

const STATUS_LABELS: Record<string, string> = {
  pending: 'Nuevo Pedido',
  accepted: 'Aceptado',
  preparing: 'Preparando',
  ready: 'Listo para Entrega',
  on_the_way: 'En Camino',
  arrived: 'Repartidor llegó',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
  rejected: 'Rechazado'
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  accepted: 'bg-blue-100 text-blue-700 border-blue-200',
  preparing: 'bg-orange-100 text-orange-700 border-orange-200',
  ready: 'bg-purple-100 text-purple-700 border-purple-200',
  on_the_way: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  arrived: 'bg-teal-100 text-teal-700 border-teal-200',
  delivered: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  cancelled: 'bg-red-100 text-red-700 border-red-200',
  rejected: 'bg-red-100 text-red-700 border-red-200'
};

// Navigation helpers
const openGoogleMaps = (lat: number, lng: number) => {
  window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
};
const openWaze = (lat: number, lng: number) => {
  window.open(`https://waze.com/ul?ll=${lat},${lng}&navigate=yes`, '_blank');
};

// Mapa con ubicación del cliente
const ClientLocationCard: React.FC<{ order: Order }> = ({ order }) => {
  const [loc, setLoc] = useState<{ lat: number; lng: number; address?: string } | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [showNavMenu, setShowNavMenu] = useState(false);
  const navMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Try location from order first
    const ol = (order as any).clientLocation;
    if (ol?.lat) setLoc(ol);
    // Then subscribe to real-time updates
    const unsub = FirebaseServiceV2.subscribeToClientLocation(order.id, (l) => { if (l) setLoc(l); });
    return unsub;
  }, [order.id]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (navMenuRef.current && !navMenuRef.current.contains(e.target as Node)) setShowNavMenu(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  if (!loc) {
    return (
      <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl border border-dashed border-gray-200">
        <MapPin className="w-4 h-4 text-gray-400" />
        <span className="text-xs text-gray-400">Ubicación GPS del cliente no disponible</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button onClick={() => setExpanded(p => !p)}
        className="w-full flex items-center justify-between p-3 bg-blue-50 rounded-xl border border-blue-100 hover:bg-blue-100 transition-all">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-bold text-blue-700">Ver ubicación del cliente</span>
          <span className="text-xs bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full font-bold animate-pulse">EN VIVO</span>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-blue-600" /> : <ChevronDown className="w-4 h-4 text-blue-600" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden">
            <div className="rounded-2xl overflow-hidden border border-blue-100 shadow-sm">
              <div className="h-[200px]">
                <MapContainer center={[loc.lat, loc.lng]} zoom={16} className="h-full w-full" scrollWheelZoom={false}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <Marker position={[loc.lat, loc.lng]}
                    icon={L.icon({ iconUrl: 'https://cdn-icons-png.flaticon.com/512/1216/1216844.png', iconSize: [36, 36], iconAnchor: [18, 36] })}>
                    <Popup>Ubicación del cliente</Popup>
                  </Marker>
                </MapContainer>
              </div>
              {loc.address && (
                <div className="px-3 py-2 bg-blue-50 text-xs text-blue-700 font-medium flex items-center gap-1.5">
                  <MapPin className="w-3 h-3" /> {loc.address}
                </div>
              )}
              <div className="p-3 bg-white border-t border-blue-50 flex gap-2">
                <div className="relative flex-1" ref={navMenuRef}>
                  <button onClick={() => setShowNavMenu(p => !p)}
                    className="w-full flex items-center justify-center gap-2 bg-primary text-white py-2.5 rounded-xl font-bold text-sm hover:bg-primary/90 transition-all">
                    <Navigation className="w-4 h-4" /> Navegar
                  </button>
                  <AnimatePresence>
                    {showNavMenu && (
                      <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
                        className="absolute bottom-full mb-2 left-0 right-0 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-50">
                        <button onClick={() => { openGoogleMaps(loc.lat, loc.lng); setShowNavMenu(false); }}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-all">
                          <Map className="w-4 h-4 text-blue-600" />
                          <span className="font-bold text-sm text-gray-800">Google Maps</span>
                        </button>
                        <div className="border-t border-gray-100" />
                        <button onClick={() => { openWaze(loc.lat, loc.lng); setShowNavMenu(false); }}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-all">
                          <span className="text-base">🚗</span>
                          <span className="font-bold text-sm text-gray-800">Waze</span>
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <div className="text-xs text-gray-400 flex items-center gap-1 px-2">
                  <span>{loc.lat.toFixed(5)}, {loc.lng.toFixed(5)}</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const BusinessOrders: React.FC = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<string>('active');
  const [loading, setLoading] = useState(true);
  const [detailsOrder, setDetailsOrder] = useState<Order | null>(null);
  useEffect(() => {
    const businessId = (user as any)?.businessId;
    if (!businessId) { setLoading(false); return; }
    const unsub = FirebaseServiceV2.subscribeToBusinessOrders(businessId, (data) => {
      setOrders(data);
      setLoading(false);
    });
    return unsub;
  }, [(user as any)?.businessId]);

  const handleUpdateStatus = async (orderId: string, status: string) => {
    try {
      const payload: Record<string, any> = { status };
      if (status === 'preparing') {
        payload.preparingAt = new Date().toISOString();
      }
      await FirebaseServiceV2.updateOrder(orderId, payload);
    } catch (err) {
      console.error('Error actualizando estado:', err);
    }
  };

  const filtered = orders.filter(o => {
    if (filter === 'active') return o.status !== 'delivered';
    if (filter === 'pending') return o.status === 'pending';
    if (filter === 'preparing') return ['accepted', 'preparing'].includes(o.status);
    if (filter === 'ready') return o.status === 'ready';
    if (filter === 'done') return ['delivered', 'cancelled'].includes(o.status);
    return true;
  });

  const counts = {
    active: orders.filter(o => o.status !== 'delivered').length,
    pending: orders.filter(o => o.status === 'pending').length,
    preparing: orders.filter(o => ['accepted', 'preparing'].includes(o.status)).length,
    ready: orders.filter(o => o.status === 'ready').length,
    done: orders.filter(o => ['delivered', 'cancelled'].includes(o.status)).length,
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {detailsOrder && (
          <OrderDetailsModal order={detailsOrder} onClose={() => setDetailsOrder(null)} />
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black font-display text-gray-900">Pedidos en Tiempo Real</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { soundService.startRinging(); setTimeout(() => soundService.stopRinging(), 4000); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded-xl text-xs font-bold hover:bg-yellow-200 transition-all">
            <Volume2 className="w-3.5 h-3.5" /> Test sonido
          </button>
          <div className="flex items-center gap-2 bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-xl">
            <div className="w-2 h-2 bg-emerald-600 rounded-full animate-pulse" />
            <span className="text-xs font-bold">{counts.active} activos</span>
          </div>
        </div>
      </div>

      {/* Tabs filtro */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          { key: 'active', label: 'Activos', count: counts.active },
          { key: 'pending', label: 'Nuevos', count: counts.pending },
          { key: 'preparing', label: 'Preparando', count: counts.preparing },
          { key: 'ready', label: 'Listos', count: counts.ready },
          { key: 'done', label: 'Finalizados', count: counts.done },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`flex-shrink-0 px-4 py-2 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
              filter === tab.key ? 'bg-primary text-white shadow-lg' : 'bg-white text-gray-600 border border-gray-200'
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={`text-xs rounded-full px-1.5 py-0.5 ${filter === tab.key ? 'bg-white/30 text-white' : 'bg-gray-100 text-gray-600'}`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Lista */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-dashed border-gray-200 text-center">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-400 font-bold">No hay pedidos en esta categoría</p>
          </div>
        ) : (
          filtered.map(order => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4"
            >
              {/* Header */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl border ${
                    order.status === 'pending' ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-100 border-gray-200'
                  }`}>
                    {order.status === 'pending' ? <Bell className="w-5 h-5 text-yellow-600 animate-bounce" /> : <Package className="w-5 h-5 text-gray-600" />}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">Pedido #{order.id.slice(-6).toUpperCase()}</p>
                    <p className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleString('es-DO')}</p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-xl text-xs font-bold uppercase border ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                  {STATUS_LABELS[order.status] || order.status}
                </span>
              </div>

              {/* Cliente */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="text-sm text-gray-700 font-medium">{order.clientName || `Cliente #${order.clientId?.slice(-4)}`}</span>
                </div>
                {(order.clientWhatsapp || order.clientPhone) && (
                  <a href={`https://wa.me/${(order.clientWhatsapp || order.clientPhone || '').replace(/\D/g, '')}`}
                     target="_blank" rel="noreferrer"
                     className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700">
                    <Phone className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm font-medium">{order.clientWhatsapp || order.clientPhone}</span>
                  </a>
                )}
                {order.deliveryAddress && (
                  <div className="flex items-center gap-2 md:col-span-2">
                    <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-sm text-gray-700">{order.deliveryAddress}</span>
                  </div>
                )}
              </div>

              {/* Ubicación GPS del cliente */}
              {!['delivered', 'cancelled'].includes(order.status) && (
                <ClientLocationCard order={order} />
              )}

              {/* Items */}
              <div className="space-y-1">
                {order.items?.map(item => (
                  <div key={`${item.id}-${item.notes || 'sin-nota'}`} className="py-1.5 border-b border-gray-50 last:border-0">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-700"><span className="font-bold">{item.quantity}x</span> {item.name}</span>
                      <span className="text-sm font-bold text-gray-900">RD$ {(item.price * item.quantity).toFixed(0)}</span>
                    </div>
                    {item.notes && (
                      <p className="text-xs text-gray-500 mt-1">Nota del cliente: {item.notes}</p>
                    )}
                  </div>
                ))}
                <div className="flex justify-between pt-2 font-bold">
                  <span className="text-gray-700">Total del pedido</span>
                  <span className="text-lg text-emerald-600">RD$ {order.total?.toFixed(0)}</span>
                </div>
              </div>

              {/* Acciones */}
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setDetailsOrder(order)}
                  className="px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-all"
                >
                  Más detalles
                </button>
                {order.status === 'pending' && (
                  <>
                    <button onClick={() => handleUpdateStatus(order.id, 'accepted')}
                      className="flex-1 min-w-[120px] bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all flex items-center justify-center gap-2">
                      <CheckCircle2 className="w-4 h-4" /> Aceptar
                    </button>
                    <button onClick={() => handleUpdateStatus(order.id, 'cancelled')}
                      className="px-4 py-3 bg-red-50 text-red-600 rounded-xl font-bold hover:bg-red-100 transition-all flex items-center gap-2">
                      <X className="w-4 h-4" /> Rechazar
                    </button>
                  </>
                )}
                {order.status === 'accepted' && (
                  <button onClick={() => handleUpdateStatus(order.id, 'preparing')}
                    className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
                    <ChefHat className="w-4 h-4" /> Comenzar Preparación
                  </button>
                )}
                {order.status === 'preparing' && (
                  <button onClick={() => handleUpdateStatus(order.id, 'ready')}
                    className="flex-1 bg-purple-600 text-white py-3 rounded-xl font-bold hover:bg-purple-700 transition-all flex items-center justify-center gap-2">
                    <Truck className="w-4 h-4" /> Marcar como Listo
                  </button>
                )}
                {order.status === 'ready' && (
                  <div className="flex-1 flex items-center gap-2 p-3 bg-purple-50 rounded-xl border border-purple-200">
                    <AlertCircle className="w-4 h-4 text-purple-600 flex-shrink-0" />
                    <span className="text-sm font-bold text-purple-700">Esperando repartidor...</span>
                  </div>
                )}
                {order.status === 'on_the_way' && (
                  <div className="flex-1 flex items-center gap-2 p-3 bg-indigo-50 rounded-xl border border-indigo-200">
                    <Truck className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                    <span className="text-sm font-bold text-indigo-700">En camino con {order.deliveryName || 'repartidor'}</span>
                  </div>
                )}
                {(order.clientWhatsapp || order.clientPhone) && !['delivered', 'cancelled'].includes(order.status) && (
                  <a href={`https://wa.me/${(order.clientWhatsapp || order.clientPhone || '').replace(/\D/g, '')}`}
                     target="_blank" rel="noreferrer"
                     className="px-4 py-3 bg-emerald-50 text-emerald-600 rounded-xl font-bold hover:bg-emerald-100 transition-all">
                    <MessageCircle className="w-4 h-4" />
                  </a>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

export default BusinessOrders;
