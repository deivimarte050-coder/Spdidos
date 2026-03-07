import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Package, MapPin, CheckCircle2, Navigation, Bike, Store, ArrowUpRight, MessageCircle, Power, Search, ShieldAlert, LogOut } from 'lucide-react';
import { OrderService } from '../services/OrderService';
import { Order } from '../types';
import { useAuth } from '../contexts/AuthContext';
import Map from '../components/Map';
import { LOGO_URL } from '../constants';

const DeliveryView: React.FC = () => {
  const { user, logout } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isAvailable, setIsAvailable] = useState(true);

  useEffect(() => {
    return OrderService.subscribe(setOrders);
  }, []);

  const availableOrders = orders.filter(o => o.status === 'ready' || o.status === 'preparing');
  const myActiveOrder = orders.find(o => o.deliveryId === user?.id && o.status !== 'delivered');

  const handleAccept = (orderId: string) => {
    OrderService.updateStatus(orderId, 'picked_up', user?.id);
  };

  const handleComplete = (orderId: string) => {
    OrderService.updateStatus(orderId, 'delivered');
    setIsNavigating(false);
  };

  const openInWaze = () => {
    if (myActiveOrder?.clientLocation) {
      const [lat, lon] = myActiveOrder.clientLocation;
      window.open(`https://www.waze.com/ul?ll=${lat},${lon}&navigate=yes`, '_blank');
    }
  };

  // Radar Animation Component
  const Radar = () => (
    <div className="relative flex items-center justify-center w-64 h-64 mx-auto">
      {[1, 2, 3].map((i) => (
        <motion.div
          key={i}
          initial={{ scale: 0.5, opacity: 0.5 }}
          animate={{ scale: 2, opacity: 0 }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: i * 0.6,
            ease: "easeOut"
          }}
          className="absolute w-full h-full border-2 border-emerald-500 rounded-full"
        />
      ))}
      <div className="relative z-10 bg-emerald-500 p-6 rounded-full shadow-lg shadow-emerald-500/30">
        <Search className="w-12 h-12 text-white animate-pulse" />
      </div>
    </div>
  );

  // Simulate GPS tracking moving towards client
  useEffect(() => {
    if (myActiveOrder && myActiveOrder.status === 'picked_up') {
      const interval = setInterval(() => {
        const currentLoc = myActiveOrder.deliveryLocation || myActiveOrder.businessLocation;
        const targetLoc = myActiveOrder.clientLocation;
        
        // Move 0.0003 degrees (~30m) every 3 seconds
        const step = 0.0003;
        const dLat = targetLoc[0] - currentLoc[0];
        const dLon = targetLoc[1] - currentLoc[1];
        const dist = Math.sqrt(dLat * dLat + dLon * dLon);
        
        if (dist < step) {
          OrderService.updateLocation(myActiveOrder.id, targetLoc);
        } else {
          const newLoc: [number, number] = [
            currentLoc[0] + (dLat / dist) * step,
            currentLoc[1] + (dLon / dist) * step
          ];
          OrderService.updateLocation(myActiveOrder.id, newLoc);
        }
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [myActiveOrder?.id, myActiveOrder?.status]);

  return (
    <div className="p-4 space-y-6">
      <header className="flex items-center justify-between">
        <button 
          onClick={() => window.location.reload()}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <img src={LOGO_URL} alt="Spdidos Logo" className="h-10 w-auto object-contain" referrerPolicy="no-referrer" />
          <div>
            <h2 className="text-2xl font-black font-display text-primary tracking-tight italic">
              Spdidos
            </h2>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Panel de Repartidor</p>
          </div>
        </button>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsAvailable(!isAvailable)}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-bold text-sm transition-all shadow-lg ${
              isAvailable 
                ? 'bg-secondary text-white shadow-secondary/20' 
                : 'bg-gray-200 text-gray-500 shadow-gray-200/20'
            }`}
          >
            <Power className="w-4 h-4" />
            {isAvailable ? 'ACTIVO' : 'OCUPADO'}
          </button>
          
          <button 
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl font-bold text-sm bg-red-50 text-red-600 hover:bg-red-100 transition-all shadow-lg"
          >
            <LogOut className="w-4 h-4" />
            CERRAR SESIÓN
          </button>
        </div>
      </header>

      {!isAvailable ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-12 rounded-[2.5rem] border border-black/5 text-center space-y-6 shadow-xl"
        >
          <div className="bg-gray-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto">
            <ShieldAlert className="w-12 h-12 text-gray-400" />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-black font-display text-gray-900">Estás fuera de línea</h3>
            <p className="text-gray-500 font-medium">Activa tu disponibilidad para empezar a recibir pedidos y ganar dinero.</p>
          </div>
          <button 
            onClick={() => setIsAvailable(true)}
            className="bg-emerald-500 text-white px-8 py-4 rounded-2xl font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
          >
            Conectarse ahora
          </button>
        </motion.div>
      ) : myActiveOrder ? (
        <div className="space-y-6">
          {isNavigating ? (
            <div className="fixed inset-0 z-50 bg-white flex flex-col">
              {/* Navigation Header (Waze Style) */}
              <div className="bg-blue-600 p-6 text-white flex items-center gap-4 shadow-lg">
                <div className="bg-white/20 p-3 rounded-2xl">
                  <ArrowUpRight className="w-8 h-8" />
                </div>
                <div className="flex-1">
                  <p className="text-2xl font-black">Gira a la derecha</p>
                  <p className="text-blue-100">en Calle Principal • 200m</p>
                </div>
                <button 
                  onClick={() => setIsNavigating(false)}
                  className="bg-white/20 px-4 py-2 rounded-xl font-bold text-sm"
                >
                  Salir
                </button>
              </div>

              {/* Immersive Map */}
              <div className="flex-1 relative">
                <Map trackingMode />
                
                {/* Floating Stats */}
                <div className="absolute bottom-8 left-4 right-4 flex gap-3">
                  <div className="flex-1 bg-white p-4 rounded-3xl shadow-xl border border-black/5 flex justify-around items-center">
                    <div className="text-center">
                      <p className="text-xs font-bold text-gray-400 uppercase">Llegada</p>
                      <p className="text-xl font-black text-gray-900">{myActiveOrder.eta}</p>
                    </div>
                    <div className="w-px h-8 bg-gray-100"></div>
                    <div className="text-center">
                      <p className="text-xs font-bold text-gray-400 uppercase">Distancia</p>
                      <p className="text-xl font-black text-gray-900">{myActiveOrder.distance}</p>
                    </div>
                  </div>
                  <button 
                    onClick={openInWaze}
                    className="bg-[#33ccff] text-white p-4 rounded-3xl shadow-xl flex items-center justify-center"
                  >
                    <img src="https://cdn-icons-png.flaticon.com/512/732/732258.png" className="w-8 h-8" alt="Waze" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-black/5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg uppercase">
                  Pedido en curso
                </span>
                <span className="text-sm font-bold text-gray-400">#{myActiveOrder.id.slice(-4)}</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="bg-gray-100 p-3 rounded-2xl">
                  <Package className="w-6 h-6 text-gray-700" />
                </div>
                <div className="flex-1">
                  <p className="font-bold">Entrega a: Cliente</p>
                  <p className="text-sm text-gray-500">Distancia: {myActiveOrder.distance}</p>
                  <p className="text-sm font-bold text-emerald-600">ETA: {myActiveOrder.eta}</p>
                  {myActiveOrder.clientWhatsapp && (
                    <a 
                      href={`https://wa.me/${myActiveOrder.clientWhatsapp}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center gap-2 text-emerald-600 font-bold text-sm bg-emerald-50 px-3 py-1.5 rounded-xl hover:bg-emerald-100 transition-all"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Contactar Cliente
                    </a>
                  )}
                </div>
                <button 
                  onClick={() => setIsNavigating(true)}
                  className="bg-blue-600 text-white p-3 rounded-2xl shadow-md hover:bg-blue-700 transition-all"
                >
                  <Navigation className="w-6 h-6" />
                </button>
              </div>
              <div className="h-[300px] rounded-2xl overflow-hidden border border-gray-100">
                <Map trackingMode />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={openInWaze}
                  className="bg-[#33ccff] text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2"
                >
                  Abrir en Waze
                </button>
                <button 
                  onClick={() => handleComplete(myActiveOrder.id)}
                  className="bg-emerald-600 text-white py-4 rounded-2xl font-bold hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  Entregado
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black font-display text-gray-900 uppercase tracking-tight">Pedidos disponibles</h3>
            <div className="bg-emerald-100 text-emerald-600 px-3 py-1 rounded-full text-[10px] font-black uppercase">
              Cerca de ti
            </div>
          </div>

          {availableOrders.length === 0 ? (
            <div className="py-12 space-y-8">
              <Radar />
              <div className="text-center space-y-2">
                <p className="text-xl font-black font-display text-gray-900">Buscando pedidos...</p>
                <p className="text-gray-500 font-medium">Mantén la app abierta para recibir notificaciones</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {availableOrders.map(order => (
                <motion.div 
                  key={order.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white p-6 rounded-[2rem] shadow-sm border border-black/5 flex items-center justify-between group hover:shadow-md transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-orange-100 p-4 rounded-2xl group-hover:bg-orange-200 transition-colors">
                      <Store className="w-6 h-6 text-orange-600" />
                    </div>
                    <div>
                      <p className="font-black text-gray-900">Restaurante Local</p>
                      <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
                        <MapPin className="w-3 h-3" />
                        <span>A 1.2 km de ti</span>
                      </div>
                      <p className="text-primary font-black text-sm mt-1 italic">Ganancia: RD$ 150</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleAccept(order.id)}
                    className="bg-secondary text-white px-6 py-3 rounded-2xl font-bold hover:bg-secondary/90 transition-all shadow-lg shadow-secondary/10"
                  >
                    Aceptar
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DeliveryView;
