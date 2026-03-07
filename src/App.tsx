import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Clock, Star, Plus, Minus, CheckCircle2, ShoppingBag, MapPin, Truck, ChefHat, Package, Navigation } from 'lucide-react';
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
import FirebaseServiceV2 from './services/FirebaseServiceV2';
import EventService from './services/EventService';
import { SPM_CENTER } from './constants';

const ORDER_STEPS = [
  { status: 'pending',    label: 'Pedido recibido',   icon: Package },
  { status: 'accepted',   label: 'Aceptado',           icon: CheckCircle2 },
  { status: 'preparing',  label: 'Preparando',         icon: ChefHat },
  { status: 'ready',      label: 'Listo para envío',   icon: ShoppingBag },
  { status: 'on_the_way', label: 'En camino',          icon: Truck },
  { status: 'delivered',  label: 'Entregado',          icon: CheckCircle2 },
];

const TrackingView: React.FC<{
  orderId: string | null;
  orders: Order[];
  deliveryLocation: { lat: number; lng: number } | null;
  onBack: () => void;
}> = ({ orderId, orders, deliveryLocation, onBack }) => {
  const order = orderId ? orders.find(o => o.id === orderId) || orders[0] : orders[0];
  const stepIndex = order ? ORDER_STEPS.findIndex(s => s.status === order.status) : 0;
  const deliverPos: [number, number] = deliveryLocation ? [deliveryLocation.lat, deliveryLocation.lng] : SPM_CENTER;

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

function AppContent() {
  const { user, logout } = useAuth();
  const [view, setView] = useState<View>('home');
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [deliveryLocation, setDeliveryLocation] = useState<{ lat: number; lng: number } | null>(null);
  const deliveryUnsubRef = useRef<(() => void) | null>(null);
  const clientGpsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    const unsub = FirebaseServiceV2.subscribeToClientOrders(user.id, (orders) => {
      setActiveOrders(orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled'));
    });
    return unsub;
  }, [user?.id]);

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
