import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, MapPin, User, Phone, MessageCircle, CheckCircle2, Package, Truck, ChefHat, Bell } from 'lucide-react';
import { Order } from '../types';
import { OrderService } from '../services/OrderService';

type BusinessOrderStatus = 'recibido' | 'preparando' | 'en camino' | 'entregado';

interface BusinessOrder extends Order {
  businessStatus: BusinessOrderStatus;
  preparationTime?: number;
  estimatedDelivery?: string;
}

const BusinessOrders: React.FC = () => {
  const [orders, setOrders] = useState<BusinessOrder[]>([]);
  const [filterStatus, setFilterStatus] = useState<BusinessOrderStatus | 'todos'>('todos');

  useEffect(() => {
    return OrderService.subscribe((orderData) => {
      const businessOrders = orderData.map((order: Order) => ({
        ...order,
        businessStatus: order.status === 'pending' ? 'recibido' :
                    order.status === 'preparing' ? 'preparando' :
                    order.status === 'ready' || order.status === 'picked_up' ? 'en camino' :
                    order.status === 'delivered' ? 'entregado' : 'recibido',
        preparationTime: Math.floor(Math.random() * 20) + 10, // Simulación
        estimatedDelivery: '25-35 min'
      }));
      setOrders(businessOrders);
    });
  }, []);

  const updateOrderStatus = (orderId: string, newStatus: BusinessOrderStatus) => {
    const serviceStatus = newStatus === 'recibido' ? 'pending' :
                       newStatus === 'preparando' ? 'preparing' :
                       newStatus === 'en camino' ? 'ready' :
                       newStatus === 'entregado' ? 'delivered' : 'pending';

    OrderService.updateStatus(orderId, serviceStatus);
    setOrders(orders.map(order => 
      order.id === orderId ? { ...order, businessStatus: newStatus } : order
    ));
  };

  const getStatusColor = (status: BusinessOrderStatus) => {
    switch (status) {
      case 'recibido': return 'bg-yellow-100 text-yellow-700';
      case 'preparando': return 'bg-blue-100 text-blue-700';
      case 'en camino': return 'bg-purple-100 text-purple-700';
      case 'entregado': return 'bg-emerald-100 text-emerald-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusIcon = (status: BusinessOrderStatus) => {
    switch (status) {
      case 'recibido': return <Bell className="w-4 h-4" />;
      case 'preparando': return <ChefHat className="w-4 h-4" />;
      case 'en camino': return <Truck className="w-4 h-4" />;
      case 'entregado': return <CheckCircle2 className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusText = (status: BusinessOrderStatus) => {
    switch (status) {
      case 'recibido': return 'Recibido';
      case 'preparando': return 'Preparando';
      case 'en camino': return 'En Camino';
      case 'entregado': return 'Entregado';
      default: return status;
    }
  };

  const filteredOrders = filterStatus === 'todos' 
    ? orders 
    : orders.filter(order => order.businessStatus === filterStatus);

  const activeOrders = orders.filter(order => order.businessStatus !== 'entregado');

  const statusCounts = {
    recibido: orders.filter(o => o.businessStatus === 'recibido').length,
    preparando: orders.filter(o => o.businessStatus === 'preparando').length,
    'en camino': orders.filter(o => o.businessStatus === 'en camino').length,
    entregado: orders.filter(o => o.businessStatus === 'entregado').length
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black font-display text-gray-900">Pedidos en Tiempo Real</h2>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-xl">
            <div className="w-2 h-2 bg-emerald-600 rounded-full animate-pulse" />
            <span className="text-xs font-bold">{activeOrders.length} activos</span>
          </div>
        </div>
      </div>

      {/* Filtros y estadísticas */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { status: 'recibido', count: statusCounts.recibido },
            { status: 'preparando', count: statusCounts.preparando },
            { status: 'en camino', count: statusCounts['en camino'] },
            { status: 'entregado', count: statusCounts.entregado }
          ].map(({ status, count }) => (
            <button
              key={status}
              onClick={() => setFilterStatus(filterStatus === status ? 'todos' : status)}
              className={`p-4 rounded-xl border-2 transition-all ${
                filterStatus === status 
                  ? 'border-primary bg-primary/5' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                {getStatusIcon(status as BusinessOrderStatus)}
                <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                  {getStatusText(status as BusinessOrderStatus)}
                </span>
              </div>
              <p className="text-2xl font-black text-gray-900">{count}</p>
            </button>
          ))}
        </div>

        <button
          onClick={() => setFilterStatus('todos')}
          className={`w-full py-2 rounded-xl font-bold text-sm transition-all ${
            filterStatus === 'todos' 
              ? 'bg-primary text-white' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Ver todos los pedidos
        </button>
      </div>

      {/* Lista de pedidos */}
      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-dashed border-gray-200 text-center">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-400 font-bold">
              {filterStatus === 'todos' 
                ? 'No tienes pedidos activos' 
                : `No hay pedidos con estado "${getStatusText(filterStatus as BusinessOrderStatus)}"`
              }
            </p>
          </div>
        ) : (
          filteredOrders.map((order) => (
            <motion.div
              key={order.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4"
            >
              {/* Header del pedido */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-gray-100 p-2 rounded-xl">
                    <User className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">Pedido #{order.id.slice(-6)}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(order.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider ${getStatusColor(order.businessStatus)}`}>
                    <div className="flex items-center gap-1">
                      {getStatusIcon(order.businessStatus)}
                      {getStatusText(order.businessStatus)}
                    </div>
                  </span>
                </div>
              </div>

              {/* Información del cliente */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-700">Cliente: #{order.clientId.slice(-4)}</span>
                </div>
                {order.clientWhatsapp && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <a 
                      href={`https://wa.me/${order.clientWhatsapp}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-emerald-600 hover:underline font-medium"
                    >
                      {order.clientWhatsapp}
                    </a>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-700">San Pedro de Macorís</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-700">
                    {order.estimatedDelivery || '25-35 min'}
                  </span>
                </div>
              </div>

              {/* Items del pedido */}
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-gray-700">Items del pedido:</h4>
                <div className="space-y-1">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex justify-between items-center py-2 border-b border-gray-50">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-600">{item.quantity}x</span>
                        <span className="text-sm text-gray-900">{item.name}</span>
                      </div>
                      <span className="text-sm font-bold text-gray-900">
                        RD$ {item.price * item.quantity}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-center pt-2 font-bold">
                  <span className="text-gray-700">Total:</span>
                  <span className="text-lg text-emerald-600">RD$ {order.total}</span>
                </div>
              </div>

              {/* Acciones */}
              <div className="flex gap-2">
                {order.businessStatus === 'recibido' && (
                  <button
                    onClick={() => updateOrderStatus(order.id, 'preparando')}
                    className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-all"
                  >
                    <ChefHat className="w-4 h-4 inline mr-2" />
                    COMENZAR PREPARACIÓN
                  </button>
                )}
                
                {order.businessStatus === 'preparando' && (
                  <button
                    onClick={() => updateOrderStatus(order.id, 'en camino')}
                    className="flex-1 bg-purple-600 text-white py-3 rounded-xl font-bold hover:bg-purple-700 transition-all"
                  >
                    <Truck className="w-4 h-4 inline mr-2" />
                    MARCAR COMO EN CAMINO
                  </button>
                )}
                
                {order.businessStatus === 'en camino' && (
                  <button
                    onClick={() => updateOrderStatus(order.id, 'entregado')}
                    className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all"
                  >
                    <CheckCircle2 className="w-4 h-4 inline mr-2" />
                    CONFIRMAR ENTREGA
                  </button>
                )}

                {order.clientWhatsapp && (
                  <a
                    href={`https://wa.me/${order.clientWhatsapp}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-3 bg-emerald-50 text-emerald-600 rounded-xl font-bold hover:bg-emerald-100 transition-all"
                  >
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
