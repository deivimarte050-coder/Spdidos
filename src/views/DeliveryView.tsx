import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'motion/react';
import { Package, MapPin, CheckCircle2, Navigation, Store, ArrowUpRight, MessageCircle, Power, Search, ShieldAlert, LogOut, Clock, DollarSign } from 'lucide-react';
import FirebaseServiceV2 from '../services/FirebaseServiceV2';
import { Order } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { LOGO_URL } from '../constants';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-routing-machine';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';
import { SPM_CENTER } from '../constants';

// Mapa de seguimiento para repartidor
const DeliveryTrackingMap: React.FC<{ deliveryLoc: [number, number]; clientLoc?: [number, number] }> = ({ deliveryLoc, clientLoc }) => {
  const routingRef = useRef<any>(null);

  const RoutingLayer = () => {
    const map = useMap();
    useEffect(() => {
      if (!clientLoc || !(L as any).Routing) return;
      try {
        if (routingRef.current) { try { map.removeControl(routingRef.current); } catch {} }
        routingRef.current = (L as any).Routing.control({
          waypoints: [L.latLng(deliveryLoc[0], deliveryLoc[1]), L.latLng(clientLoc[0], clientLoc[1])],
          routeWhileDragging: false, addWaypoints: false, draggableWaypoints: false,
          show: false, createMarker: () => null,
          lineOptions: { styles: [{ color: '#3b82f6', weight: 5, opacity: 0.8 }], extendToWaypoints: true, missingRouteTolerance: 0 }
        }).addTo(map);
      } catch (e) {}
      return () => { if (routingRef.current) { try { map.removeControl(routingRef.current); } catch {} routingRef.current = null; } };
    }, [map, deliveryLoc[0], deliveryLoc[1], clientLoc?.[0], clientLoc?.[1]]);
    return null;
  };

  return (
    <div className="h-[280px] rounded-2xl overflow-hidden border border-gray-100">
      <MapContainer center={deliveryLoc} zoom={15} className="h-full w-full" scrollWheelZoom={false}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <RoutingLayer />
        <Marker position={deliveryLoc} icon={L.icon({ iconUrl: 'https://cdn-icons-png.flaticon.com/512/2972/2972185.png', iconSize: [36, 36], iconAnchor: [18, 36] })}>
          <Popup>Tu ubicación</Popup>
        </Marker>
        {clientLoc && (
          <Marker position={clientLoc} icon={L.icon({ iconUrl: 'https://cdn-icons-png.flaticon.com/512/1216/1216844.png', iconSize: [32, 32], iconAnchor: [16, 32] })}>
            <Popup>Entrega aquí</Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
};

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
  const gpsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Subscribe to available (ready) orders
  useEffect(() => {
    const unsub = FirebaseServiceV2.subscribeToDeliveryOrders((orders) => {
      const available = orders.filter(o => o.status === 'ready');
      const mine = orders.find(o => o.deliveryId === user?.id && o.status === 'on_the_way');
      setAvailableOrders(available);
      setMyOrder(mine || null);
    });
    return unsub;
  }, [user?.id]);

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
    try {
      await FirebaseServiceV2.updateOrder(order.id, {
        status: 'on_the_way',
        deliveryId: user?.id,
        deliveryName: user?.name
      });
      await FirebaseServiceV2.updateDeliveryLocation(order.id, myLocation[0], myLocation[1]);
    } catch (err) { console.error('Error aceptando pedido:', err); }
  };

  const handleComplete = async () => {
    if (!myOrder) return;
    try {
      await FirebaseServiceV2.updateOrder(myOrder.id, { status: 'delivered' });
      setIsNavigating(false);
    } catch (err) { console.error('Error completando pedido:', err); }
  };

  const openInWaze = () => {
    if (myOrder?.clientLocation) {
      const [lat, lon] = myOrder.clientLocation;
      window.open(`https://www.waze.com/ul?ll=${lat},${lon}&navigate=yes`, '_blank');
    } else if (myOrder?.deliveryAddress) {
      window.open(`https://www.waze.com/ul?q=${encodeURIComponent(myOrder.deliveryAddress)}&navigate=yes`, '_blank');
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
          isNavigating ? (
            <div className="fixed inset-0 z-50 bg-white flex flex-col">
              <div className="bg-blue-600 p-5 text-white flex items-center gap-3 shadow-lg">
                <div className="bg-white/20 p-2.5 rounded-xl"><ArrowUpRight className="w-7 h-7" /></div>
                <div className="flex-1">
                  <p className="text-xl font-black">{myOrder.businessName}</p>
                  <p className="text-blue-100 text-sm">{myOrder.deliveryAddress}</p>
                </div>
                <button onClick={() => setIsNavigating(false)} className="bg-white/20 px-3 py-1.5 rounded-lg font-bold text-sm">Salir</button>
              </div>
              <div className="flex-1">
                <DeliveryTrackingMap deliveryLoc={myLocation} clientLoc={myOrder.clientLocation} />
              </div>
              <div className="p-4 bg-white border-t border-gray-100 flex gap-3">
                <button onClick={openInWaze} className="flex-1 bg-[#33ccff] text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2">
                  <img src="https://cdn-icons-png.flaticon.com/512/732/732258.png" className="w-5 h-5" alt="Waze" /> Waze
                </button>
                <button onClick={handleComplete} className="flex-1 bg-emerald-600 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-5 h-5" /> Entregado
                </button>
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

                <DeliveryTrackingMap deliveryLoc={myLocation} clientLoc={myOrder.clientLocation} />

                <div className="grid grid-cols-3 gap-2">
                  {myOrder.clientWhatsapp && (
                    <a href={`https://wa.me/${myOrder.clientWhatsapp.replace(/\D/g,'')}`} target="_blank" rel="noreferrer"
                      className="flex flex-col items-center gap-1 p-3 bg-emerald-50 rounded-xl text-emerald-600 font-bold text-xs">
                      <MessageCircle className="w-5 h-5" /> WhatsApp
                    </a>
                  )}
                  <button onClick={openInWaze} className="flex flex-col items-center gap-1 p-3 bg-blue-50 rounded-xl text-blue-600 font-bold text-xs col-span-1">
                    <img src="https://cdn-icons-png.flaticon.com/512/732/732258.png" className="w-5 h-5" alt="Waze" /> Waze
                  </button>
                  <button onClick={handleComplete}
                    className="flex flex-col items-center gap-1 p-3 bg-emerald-600 rounded-xl text-white font-bold text-xs col-span-1">
                    <CheckCircle2 className="w-5 h-5" /> Entregado
                  </button>
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
