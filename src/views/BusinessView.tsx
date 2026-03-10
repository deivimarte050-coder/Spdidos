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

  const now = new Date();
  const pedidosHoy = orders.filter((o) => {
    const createdAt = new Date((o as any).createdAt);
    if (Number.isNaN(createdAt.getTime())) return false;
    return createdAt.getDate() === now.getDate()
      && createdAt.getMonth() === now.getMonth()
      && createdAt.getFullYear() === now.getFullYear();
  }).length;

  const ventasTotales = orders
    .filter((o) => o.status === 'delivered')
    .reduce((sum, o) => {
      const subtotal = Number((o as any).subtotal);
      if (Number.isFinite(subtotal) && subtotal >= 0) return sum + subtotal;

      const total = Number((o as any).total);
      const deliveryFee = Number((o as any).deliveryFee ?? 0);
      if (Number.isFinite(total) && Number.isFinite(deliveryFee)) {
        return sum + Math.max(total - deliveryFee, 0);
      }
      return sum;
    }, 0);

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
