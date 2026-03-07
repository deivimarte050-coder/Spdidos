import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Clock, MapPin, User, Phone, MessageCircle, CheckCircle2, Package, Truck, ChefHat, Bell, X, AlertCircle } from 'lucide-react';
import { Order } from '../types';
import FirebaseServiceV2 from '../services/FirebaseServiceV2';
import { useAuth } from '../contexts/AuthContext';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Nuevo Pedido',
  accepted: 'Aceptado',
  preparing: 'Preparando',
  ready: 'Listo para Entrega',
  on_the_way: 'En Camino',
  delivered: 'Entregado',
  cancelled: 'Cancelado'
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  accepted: 'bg-blue-100 text-blue-700 border-blue-200',
  preparing: 'bg-orange-100 text-orange-700 border-orange-200',
  ready: 'bg-purple-100 text-purple-700 border-purple-200',
  on_the_way: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  delivered: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  cancelled: 'bg-red-100 text-red-700 border-red-200'
};

const BusinessOrders: React.FC = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<string>('active');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const businessId = (user as any)?.businessId;
    if (!businessId) {
      setLoading(false);
      return;
    }
    const unsub = FirebaseServiceV2.subscribeToBusinessOrders(businessId, (data) => {
      setOrders(data);
      setLoading(false);
    });
    return unsub;
  }, [(user as any)?.businessId]);

  const handleUpdateStatus = async (orderId: string, status: string) => {
    try {
      await FirebaseServiceV2.updateOrder(orderId, { status });
    } catch (err) {
      console.error('Error actualizando estado:', err);
    }
  };

  const filtered = orders.filter(o => {
    if (filter === 'active') return !['delivered', 'cancelled'].includes(o.status);
    if (filter === 'pending') return o.status === 'pending';
    if (filter === 'preparing') return ['accepted', 'preparing'].includes(o.status);
    if (filter === 'ready') return o.status === 'ready';
    if (filter === 'done') return ['delivered', 'cancelled'].includes(o.status);
    return true;
  });

  const counts = {
    active: orders.filter(o => !['delivered', 'cancelled'].includes(o.status)).length,
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
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black font-display text-gray-900">Pedidos en Tiempo Real</h2>
        <div className="flex items-center gap-2 bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-xl">
          <div className="w-2 h-2 bg-emerald-600 rounded-full animate-pulse" />
          <span className="text-xs font-bold">{counts.active} activos</span>
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

              {/* Items */}
              <div className="space-y-1">
                {order.items?.map(item => (
                  <div key={item.id} className="flex justify-between items-center py-1.5 border-b border-gray-50 last:border-0">
                    <span className="text-sm text-gray-700"><span className="font-bold">{item.quantity}x</span> {item.name}</span>
                    <span className="text-sm font-bold text-gray-900">RD$ {(item.price * item.quantity).toFixed(0)}</span>
                  </div>
                ))}
                <div className="flex justify-between pt-2 font-bold">
                  <span className="text-gray-700">Total del pedido</span>
                  <span className="text-lg text-emerald-600">RD$ {order.total?.toFixed(0)}</span>
                </div>
              </div>

              {/* Acciones */}
              <div className="flex gap-2 flex-wrap">
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
