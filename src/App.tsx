import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Clock, Star, Plus, Minus, CheckCircle2, ShoppingBag } from 'lucide-react';
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

function AppContent() {
  const { user, logout } = useAuth();
  const [view, setView] = useState<View>('home');
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);

  useEffect(() => {
    const loadOrders = () => {
      const orders = DataService.getOrders();
      if (user?.role === 'client') {
        setActiveOrders(orders.filter(o => o.customerId === user.id && o.status !== 'delivered'));
      } else if (user?.role === 'admin') {
        setActiveOrders(orders.filter(o => o.status !== 'delivered'));
      }
    };

    loadOrders();
    const unsubscribe = DataService.subscribe(loadOrders);
    
    return unsubscribe;
  }, [user]);

  if (!user) {
    return <Auth />;
  }

  const addToCart = (item: { id: string; name: string; price: number }) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1 }];
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

  const handleBusinessSelect = (business: Business) => {
    setSelectedBusiness(business);
    setView('restaurant');
  };

  const handleCheckout = () => {
    if (!selectedBusiness || !user) return;

    DataService.addOrder({
      customerId: user.id,
      customerName: user.name,
      customerEmail: user.email,
      customerPhone: user.phone || user.whatsapp,
      customerAddress: 'Dirección del cliente',
      businessId: selectedBusiness.id,
      businessName: selectedBusiness.name,
      businessEmail: selectedBusiness.email,
      businessPhone: selectedBusiness.phone,
      items: cart.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity
      })),
      subtotal: cartTotal,
      deliveryFee: 50,
      total: cartTotal + 50,
      status: 'pending',
      paymentMethod: 'cash',
      deliveryAddress: 'Dirección de entrega',
      deliveryInstructions: 'Instrucciones de entrega'
    });
    setView('tracking');
    setIsCartOpen(false);
    setCart([]);
  };

  // If user is not a client, show their specific view directly
  if (user.role === 'delivery') return <DeliveryView />;
  if (user.role === 'business') return <BusinessView />;
  if (user.role === 'admin') return <AdminView />;

  return (
    <Layout 
      activeView={view} 
      onViewChange={setView}
      cartCount={cart.reduce((a, b) => a + b.quantity, 0)}
      onCartClick={() => setIsCartOpen(true)}
    >
      <AnimatePresence mode="wait">
        {view === 'home' && (
          <motion.div
            key="home"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <HomeView>
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

            <div className="relative h-64 rounded-[2.5rem] overflow-hidden shadow-xl">
              <img src={selectedBusiness.image} alt={selectedBusiness.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-8">
                <div className="flex items-center gap-4 text-white">
                  <div className="flex items-center gap-1 bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-xl">
                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    <span className="font-bold">{selectedBusiness.rating}</span>
                  </div>
                  <div className="flex items-center gap-1 bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-xl">
                    <Clock className="w-4 h-4" />
                    <span className="font-bold">20-30 min</span>
                  </div>
                </div>
              </div>
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
                  ).map(([category, items]) => (
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
                                  // Crear modal para ver imagen en grande
                                  const modal = document.createElement('div');
                                  modal.className = 'fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 animate-fade-in';
                                  modal.onclick = () => modal.remove();
                                  modal.innerHTML = `
                                    <div class="relative max-w-4xl max-h-full">
                                      <img src="${item.image || 'https://picsum.photos/seed/food/800/600'}" 
                                           alt="${item.name}" 
                                           class="max-w-full max-h-full object-contain rounded-lg">
                                      <button class="absolute top-4 right-4 bg-white/20 backdrop-blur-sm text-white p-2 rounded-full hover:bg-white/30 transition-all">
                                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                        </svg>
                                      </button>
                                    </div>
                                  `;
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
                                    onClick={() => addToCart(item)}
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
            <div className="max-w-4xl mx-auto space-y-8 px-4 lg:px-0">
              <div className="text-center">
                <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                <h2 className="text-3xl font-black font-display tracking-tight mb-2">¡Pedido Confirmado!</h2>
                <p className="text-gray-400">Tu pedido está siendo preparado</p>
              </div>

              <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-black/5">
                <div className="space-y-6">
                  <div>
                    <h3 className="font-bold text-lg mb-4">Estado del Pedido</h3>
                    <div className="space-y-3">
                      {['pending', 'preparing', 'ready', 'delivered'].map((status, index) => (
                        <div key={status} className="flex items-center gap-4">
                          <div className={`w-8 h-8 rounded-full border-2 ${
                            index === 0 ? 'border-primary bg-primary' : 'border-gray-200'
                          }`}></div>
                          <span className="font-medium capitalize">
                            {status === 'pending' ? 'Pendiente' : 
                             status === 'preparing' ? 'Preparando' :
                             status === 'ready' ? 'Listo' : 'Entregado'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-bold text-lg mb-4">Detalles del Pedido</h3>
                    <div className="space-y-2">
                      {cart.map(item => (
                        <div key={item.id} className="flex justify-between">
                          <span>{item.quantity}x {item.name}</span>
                          <span>RD$ {item.price * item.quantity}</span>
                        </div>
                      ))}
                      <div className="pt-4 border-t">
                        <div className="flex justify-between font-bold text-lg">
                          <span>Total</span>
                          <span>RD$ {cartTotal + 50}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setView('home')}
                className="w-full bg-primary text-white py-4 rounded-2xl font-bold hover:bg-primary/90 transition-all"
              >
                Volver al Inicio
              </button>
            </div>
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
