import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ClipboardList, Clock, CheckCircle2, MapPin, Store, MessageCircle, LogOut, Settings, ShoppingBag, User, LayoutDashboard } from 'lucide-react';
import { OrderService } from '../services/OrderService';
import { Order } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { LOGO_URL } from '../constants';
import FirebaseServiceV2 from '../services/FirebaseServiceV2';
import BusinessProfile from '../components/BusinessProfile';
import MenuManager from '../components/MenuManager';
import BusinessOrders from '../components/BusinessOrders';

const BusinessView: React.FC = () => {
  const { user, logout } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [businessId, setBusinessId] = useState<string | null>((user as any)?.businessId || null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'profile' | 'menu' | 'orders'>('dashboard');
  const [todayKey, setTodayKey] = useState(() => new Date().toDateString());
  const [supportWhatsAppNumber, setSupportWhatsAppNumber] = useState('');

  useEffect(() => {
    let isMounted = true;
    const resolveBusinessId = async () => {
      const userBusinessId = (user as any)?.businessId;
      if (userBusinessId) {
        setBusinessId(userBusinessId);
        return;
      }

      if (!user?.email) return;

      try {
        const businesses = await FirebaseServiceV2.getBusinesses();
        const business = businesses.find((b: any) => b.email === user.email);
        if (isMounted && business?.id) {
          setBusinessId(business.id);
        }
      } catch (error) {
        console.error('❌ Error obteniendo businessId:', error);
      }
    };

    resolveBusinessId();

    return () => {
      isMounted = false;
    };
  }, [user]);

  useEffect(() => {
    if (!businessId) {
      setOrders([]);
      return;
    }

    return FirebaseServiceV2.subscribeToBusinessOrders(businessId, (data) => {
      setOrders(data as Order[]);
    });
  }, [businessId]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const nextKey = new Date().toDateString();
      setTodayKey((currentKey) => currentKey === nextKey ? currentKey : nextKey);
    }, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  // Load support WhatsApp number
  useEffect(() => {
    const loadSupportNumber = async () => {
      try {
        const number = await FirebaseServiceV2.getSupportWhatsAppNumber();
        setSupportWhatsAppNumber(number);
      } catch (error) {
        console.error('Error loading support number:', error);
      }
    };
    loadSupportNumber();
  }, []);

  const getOrderDate = (order: Order): Date | null => {
    const source = (order as any).deliveredAt || (order as any).createdAt;
    const date = new Date(source);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const getOrderSaleAmount = (order: Order) => {
    const subtotal = Number((order as any).subtotal);
    if (Number.isFinite(subtotal) && subtotal >= 0) return subtotal;

    const total = Number((order as any).total);
    const deliveryFee = Number((order as any).deliveryFee ?? 0);
    if (Number.isFinite(total) && Number.isFinite(deliveryFee)) {
      return Math.max(total - deliveryFee, 0);
    }
    return 0;
  };

  const pedidosHoy = orders.filter((order) => {
    const createdAt = new Date((order as any).createdAt);
    if (Number.isNaN(createdAt.getTime())) return false;
    return createdAt.toDateString() === todayKey;
  }).length;

  const deliveredOrders = orders.filter((order) => order.status === 'delivered');
  const ventasTotales = deliveredOrders.reduce((sum, order) => sum + getOrderSaleAmount(order), 0);

  const salesHistoryByDay = Object.values(
    deliveredOrders.reduce<Record<string, { date: Date; total: number; orders: Order[] }>>((acc, order) => {
      const orderDate = getOrderDate(order);
      if (!orderDate) return acc;

      const dateKey = orderDate.toDateString();
      if (!acc[dateKey]) {
        acc[dateKey] = { date: orderDate, total: 0, orders: [] };
      }

      acc[dateKey].orders.push(order);
      acc[dateKey].total += getOrderSaleAmount(order);
      return acc;
    }, {})
  ).sort((a, b) => b.date.getTime() - a.date.getTime());

  const tabs = [
    { id: 'dashboard', label: 'Panel', icon: LayoutDashboard },
    { id: 'profile', label: 'Mi Perfil', icon: User },
    { id: 'menu', label: 'Menú', icon: ShoppingBag },
    { id: 'orders', label: 'Pedidos', icon: ClipboardList }
  ];

  const handleUpdateStatus = (orderId: string, status: any) => {
    OrderService.updateStatus(orderId, status);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="p-4">
          <div className="flex items-center justify-between">
            <button 
              onClick={() => window.location.reload()}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            >
              <img src={LOGO_URL} alt="Spdidos Logo" className="h-10 w-auto object-contain" referrerPolicy="no-referrer" />
              <div>
                <h2 className="text-2xl font-black font-display text-primary tracking-tight italic">
                  Spdidos
                </h2>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Panel de Negocio</p>
              </div>
            </button>
            <div className="flex items-center gap-3">
              <div className="bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-xs font-bold">
                Abierto
              </div>
              <button 
                onClick={() => {
                  if (!supportWhatsAppNumber) {
                    alert('El número de soporte no está disponible en este momento.');
                    return;
                  }
                  const message = encodeURIComponent('Hola, necesito ayuda con mi negocio en Spdidos.');
                  window.open(`https://wa.me/${supportWhatsAppNumber.replace(/\D/g, '')}?text=${message}`, '_blank');
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-2xl font-bold text-sm bg-green-50 text-green-600 hover:bg-green-100 transition-all shadow-lg"
                title="Contactar soporte por WhatsApp"
              >
                <MessageCircle className="w-4 h-4" />
                SOPORTE
              </button>
              <button 
                onClick={logout}
                className="flex items-center gap-2 px-4 py-2 rounded-2xl font-bold text-sm bg-red-50 text-red-600 hover:bg-red-100 transition-all shadow-lg"
              >
                <LogOut className="w-4 h-4" />
                CERRAR SESIÓN
              </button>
            </div>
          </div>

          {/* Navegación por pestañas */}
          <div className="flex gap-1 mt-4 bg-gray-100 p-1 rounded-xl">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all flex-1 justify-center ${
                  activeTab === tab.id
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="p-4">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Estadísticas rápidas */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-black/5 text-center">
                  <p className="text-gray-500 text-sm">Pedidos Hoy</p>
                  <p className="text-3xl font-bold font-display">{pedidosHoy}</p>
                </div>
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-black/5 text-center">
                  <p className="text-gray-500 text-sm">Ventas</p>
                  <p className="text-3xl font-bold font-display text-emerald-600">RD$ {ventasTotales.toLocaleString()}</p>
                </div>
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-black/5 text-center">
                  <p className="text-gray-500 text-sm">Rating</p>
                  <p className="text-3xl font-bold font-display text-yellow-500">4.8</p>
                </div>
              </div>

              {/* Acciones rápidas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => setActiveTab('orders')}
                  className="bg-primary text-white p-6 rounded-3xl font-bold hover:bg-primary/90 transition-all shadow-lg"
                >
                  <ClipboardList className="w-6 h-6 mb-2" />
                  Ver Pedidos Activos
                </button>
                <button
                  onClick={() => setActiveTab('menu')}
                  className="bg-secondary text-white p-6 rounded-3xl font-bold hover:bg-secondary/90 transition-all shadow-lg"
                >
                  <ShoppingBag className="w-6 h-6 mb-2" />
                  Gestionar Menú
                </button>
              </div>

              <div className="bg-white rounded-3xl border border-black/5 shadow-sm p-5 md:p-6 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h3 className="text-xl font-black text-gray-900">Historial de venta</h3>
                  <p className="text-sm font-bold text-emerald-600">Total vendido: RD$ {ventasTotales.toLocaleString()}</p>
                </div>

                {salesHistoryByDay.length === 0 ? (
                  <div className="py-8 text-center text-gray-400 font-medium">
                    Aún no hay ventas registradas.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {salesHistoryByDay.map((day) => (
                      <div key={day.date.toISOString()} className="border border-gray-100 rounded-2xl overflow-hidden">
                        <div className="bg-gray-50 px-4 py-3 flex items-center justify-between">
                          <p className="font-bold text-gray-800">
                            {day.date.toLocaleDateString('es-DO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                          </p>
                          <p className="text-sm font-black text-emerald-600">RD$ {day.total.toLocaleString()}</p>
                        </div>

                        <div className="divide-y divide-gray-100">
                          {day.orders
                            .slice()
                            .sort((a, b) => {
                              const aDate = getOrderDate(a);
                              const bDate = getOrderDate(b);
                              const aTime = aDate ? aDate.getTime() : 0;
                              const bTime = bDate ? bDate.getTime() : 0;
                              return bTime - aTime;
                            })
                            .map((order) => {
                              const orderDate = getOrderDate(order);
                              const amount = getOrderSaleAmount(order);
                              return (
                                <div key={order.id} className="px-4 py-3 flex items-center justify-between gap-3">
                                  <div>
                                    <p className="font-semibold text-gray-800">Pedido #{order.id.slice(-6).toUpperCase()}</p>
                                    <p className="text-xs text-gray-500">
                                      {order.clientName} · {orderDate ? orderDate.toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                    </p>
                                  </div>
                                  <p className="font-black text-emerald-600">RD$ {amount.toLocaleString()}</p>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'profile' && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <BusinessProfile />
            </motion.div>
          )}

          {activeTab === 'menu' && (
            <motion.div
              key="menu"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <MenuManager />
            </motion.div>
          )}

          {activeTab === 'orders' && (
            <motion.div
              key="orders"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <BusinessOrders />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default BusinessView;
