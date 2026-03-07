import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard,
  Store, 
  Plus, 
  Edit2, 
  Trash2, 
  Users,
  ShoppingCart,
  FileText,
  TrendingUp,
  Search,
  Bell,
  LogOut,
  ChevronRight,
  Star,
  Clock,
  MapPin,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  Package,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { LOGO_URL } from '../constants';
import DataService, { Business, Order } from '../services/DataService';
import { User as AppUser } from '../types';

const AdminView: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'businesses' | 'create-business' | 'orders' | 'users' | 'reports'>('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estados para los datos
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  const [newBusiness, setNewBusiness] = useState({
    name: '',
    email: '',
    phone: '',
    whatsapp: '',
    category: '',
    address: '',
    image: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);

  // Suscribirse a cambios en el DataService
  useEffect(() => {
    const loadData = () => {
      setBusinesses(DataService.getBusinesses());
      setUsers(DataService.getUsers());
      setOrders(DataService.getOrders());
    };

    loadData();
    const unsubscribe = DataService.subscribe(loadData);
    
    return unsubscribe;
  }, []);

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'create-business', label: 'Crear Negocio', icon: Plus },
    { id: 'businesses', label: 'Lista de Negocios', icon: Store },
    { id: 'orders', label: 'Ver Pedidos', icon: ShoppingCart },
    { id: 'users', label: 'Usuarios', icon: Users },
    { id: 'reports', label: 'Reportes', icon: FileText }
  ];

  const stats = {
    totalBusinesses: businesses.length,
    activeBusinesses: businesses.filter(b => b.status === 'active').length,
    totalUsers: users.length,
    activeUsers: users.filter(u => u.status === 'active').length,
    totalOrders: orders.length,
    totalRevenue: businesses.reduce((sum, b) => sum + b.totalRevenue, 0),
    pendingOrders: orders.filter(o => o.status === 'pending').length
  };

  const handleCreateBusiness = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Generar contraseña automática si no se proporciona
    const generatedPassword = newBusiness.password || `SP${Date.now().toString().slice(-6)}`;
    
    // Crear negocio con la contraseña
    const businessWithPassword = {
      ...newBusiness,
      password: generatedPassword
    };
    
    DataService.addBusiness(businessWithPassword);
    
    // Mostrar contraseña generada
    alert(`✅ Negocio creado exitosamente\n\n📧 Email: ${newBusiness.email}\n🔑 Contraseña: ${generatedPassword}\n\nGuarda estas credenciales para el acceso del negocio.`);
    
    setNewBusiness({ name: '', email: '', phone: '', whatsapp: '', category: '', address: '', image: '', password: '' });
    setActiveTab('businesses');
  };

  const handleDeleteBusiness = (id: string) => {
    if (confirm('¿Estás seguro de eliminar este negocio?')) {
      DataService.deleteBusiness(id);
    }
  };

  const handleToggleBusinessStatus = (id: string) => {
    const business = businesses.find(b => b.id === id);
    if (business) {
      DataService.updateBusiness(id, { 
        status: business.status === 'active' ? 'inactive' : 'active' 
      });
    }
  };

  const handleToggleUserStatus = (id: string) => {
    const user = users.find(u => u.id === id);
    if (user) {
      // Actualizar el usuario en el localStorage directamente
      const allUsers = DataService.getUsers();
      const userIndex = allUsers.findIndex(u => u.id === id);
      if (userIndex !== -1) {
        allUsers[userIndex] = {
          ...allUsers[userIndex],
          status: (allUsers[userIndex].status || 'active') === 'active' ? 'inactive' : 'active'
        };
        DataService.saveUsers(allUsers);
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-100 text-emerald-700';
      case 'inactive': return 'bg-gray-100 text-gray-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'preparing': return 'bg-blue-100 text-blue-700';
      case 'ready': return 'bg-purple-100 text-purple-700';
      case 'picked_up': return 'bg-indigo-100 text-indigo-700';
      case 'delivered': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-4 h-4" />;
      case 'inactive': return <XCircle className="w-4 h-4" />;
      case 'pending': return <AlertCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  // Filtrar datos según búsqueda
  const filteredBusinesses = businesses.filter(b => 
    b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredOrders = orders.filter(o => 
    o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.businessName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-gray-100 flex flex-col sticky top-0 h-screen">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <img src={LOGO_URL} alt="Spdidos Logo" className="h-10 w-auto object-contain" referrerPolicy="no-referrer" />
            <h1 className="text-xl font-black font-display tracking-tight text-primary">Spdidos Admin</h1>
          </div>

          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-primary text-white shadow-lg shadow-primary/20'
                    : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                {tab.label}
                {tab.id === 'dashboard' && (
                  <div className="ml-auto w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-6 border-t border-gray-50">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-primary/10 rounded-full overflow-hidden">
              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name}`} alt="avatar" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900 truncate">{user?.name}</p>
              <p className="text-xs text-gray-400 truncate">Administrador</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-50 text-gray-500 rounded-xl font-medium hover:bg-red-50 hover:text-red-600 transition-all"
          >
            <LogOut className="w-5 h-5" />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-black font-display tracking-tight text-gray-900">
              {tabs.find(t => t.id === activeTab)?.label}
            </h2>
            <p className="text-gray-400 font-medium mt-1">
              {activeTab === 'dashboard' && 'Resumen general de la plataforma'}
              {activeTab === 'create-business' && 'Registra un nuevo negocio en la plataforma'}
              {activeTab === 'businesses' && 'Gestiona todos los negocios activos'}
              {activeTab === 'orders' && 'Monitorea todos los pedidos en tiempo real'}
              {activeTab === 'users' && 'Administra todos los usuarios registrados'}
              {activeTab === 'reports' && 'Analiza el rendimiento de la plataforma'}
            </p>
          </div>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input 
              type="text" 
              placeholder="Buscar..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 pr-6 py-3 bg-white border border-gray-100 rounded-2xl w-64 focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
            />
          </div>
        </header>

        <AnimatePresence mode="wait">
          {/* Dashboard */}
          {activeTab === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-primary/10 rounded-xl">
                      <Store className="w-6 h-6 text-primary" />
                    </div>
                    <span className="text-sm font-medium text-emerald-600">+12%</span>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">{stats.totalBusinesses}</h3>
                  <p className="text-sm text-gray-400">Negocios Totales</p>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-emerald-10 rounded-xl">
                      <Users className="w-6 h-6 text-emerald-600" />
                    </div>
                    <span className="text-sm font-medium text-emerald-600">+25%</span>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">{stats.totalUsers}</h3>
                  <p className="text-sm text-gray-400">Usuarios Totales</p>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-orange-10 rounded-xl">
                      <ShoppingCart className="w-6 h-6 text-orange-600" />
                    </div>
                    <span className="text-sm font-medium text-orange-600">+8%</span>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">{stats.totalOrders}</h3>
                  <p className="text-sm text-gray-400">Pedidos Totales</p>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-purple-10 rounded-xl">
                      <DollarSign className="w-6 h-6 text-purple-600" />
                    </div>
                    <span className="text-sm font-medium text-purple-600">+18%</span>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">RD$ {stats.totalRevenue.toLocaleString()}</h3>
                  <p className="text-sm text-gray-400">Ingresos Totales</p>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Pedidos Recientes</h3>
                  <div className="space-y-3">
                    {orders.slice(0, 5).map(order => (
                      <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                        <div>
                          <p className="font-medium text-gray-900">{order.customerName}</p>
                          <p className="text-sm text-gray-400">{order.businessName}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-gray-900">RD$ {order.total}</p>
                          <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(order.status)}`}>
                            {order.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Negocios Activos</h3>
                  <div className="space-y-3">
                    {businesses.slice(0, 5).map(business => (
                      <div key={business.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                        <div className="flex items-center gap-3">
                          <img src={business.image} alt={business.name} className="w-10 h-10 rounded-xl object-cover" />
                          <div>
                            <p className="font-medium text-gray-900">{business.name}</p>
                            <p className="text-sm text-gray-400">{business.totalOrders} pedidos</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                          <span className="text-sm font-medium">{business.rating}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Create Business */}
          {activeTab === 'create-business' && (
            <motion.div
              key="create-business"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="max-w-2xl">
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                  <h3 className="text-2xl font-black font-display tracking-tight mb-6">Crear Nuevo Negocio</h3>
                  <form onSubmit={handleCreateBusiness} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Nombre del Negocio</label>
                        <input
                          type="text"
                          required
                          value={newBusiness.name}
                          onChange={(e) => setNewBusiness({...newBusiness, name: e.target.value})}
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary"
                          placeholder="Ej. Burger Palace"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Categoría</label>
                        <select
                          required
                          value={newBusiness.category}
                          onChange={(e) => setNewBusiness({...newBusiness, category: e.target.value})}
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        >
                          <option value="">Seleccionar categoría</option>
                          <option value="Comida Rápida">Comida Rápida</option>
                          <option value="Pizzería">Pizzería</option>
                          <option value="Comida Dominicana">Comida Dominicana</option>
                          <option value="Postres">Postres</option>
                          <option value="Bebidas">Bebidas</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Email</label>
                        <input
                          type="email"
                          required
                          value={newBusiness.email}
                          onChange={(e) => setNewBusiness({...newBusiness, email: e.target.value})}
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary"
                          placeholder="negocio@email.com"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Teléfono</label>
                        <input
                          type="tel"
                          required
                          value={newBusiness.phone}
                          onChange={(e) => setNewBusiness({...newBusiness, phone: e.target.value})}
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary"
                          placeholder="809-123-4567"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">WhatsApp</label>
                      <input
                        type="tel"
                        required
                        value={newBusiness.whatsapp}
                        onChange={(e) => setNewBusiness({...newBusiness, whatsapp: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        placeholder="809-123-4567"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Dirección</label>
                      <input
                        type="text"
                        required
                        value={newBusiness.address}
                        onChange={(e) => setNewBusiness({...newBusiness, address: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        placeholder="Calle Principal #123"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        Contraseña para Acceso del Negocio
                        <span className="text-xs text-gray-400 ml-2">(Opcional - Se generará automáticamente)</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={newBusiness.password}
                          onChange={(e) => setNewBusiness({...newBusiness, password: e.target.value})}
                          className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary"
                          placeholder="Dejar en blanco para generar automáticamente"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPassword ? '👁️' : '👁️‍🗨️'}
                        </button>
                      </div>
                      <p className="text-xs text-gray-400 mt-2">
                        💡 Si no ingresas una contraseña, se generará una automáticamente y se mostrará al crear el negocio.
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">URL de Imagen (opcional)</label>
                      <input
                        type="url"
                        value={newBusiness.image}
                        onChange={(e) => setNewBusiness({...newBusiness, image: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        placeholder="https://ejemplo.com/imagen.jpg"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-primary text-white py-4 rounded-2xl font-bold hover:bg-primary/90 transition-all"
                    >
                      Crear Negocio
                    </button>
                  </form>
                </div>
              </div>
            </motion.div>
          )}

          {/* Business List */}
          {activeTab === 'businesses' && (
            <motion.div
              key="businesses"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Negocio</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Contacto</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Estado</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Pedidos</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Ingresos</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredBusinesses.map((business) => (
                        <tr key={business.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <img src={business.image} alt={business.name} className="w-10 h-10 rounded-xl object-cover" />
                              <div>
                                <p className="font-medium text-gray-900">{business.name}</p>
                                <p className="text-sm text-gray-400">{business.category}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="space-y-1">
                              <p className="text-sm text-gray-900">{business.email}</p>
                              <p className="text-sm text-gray-400">{business.phone}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => handleToggleBusinessStatus(business.id)}
                              className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(business.status)}`}
                            >
                              {getStatusIcon(business.status)}
                              {business.status === 'active' ? 'Activo' : business.status === 'inactive' ? 'Inactivo' : 'Pendiente'}
                            </button>
                          </td>
                          <td className="px-6 py-4">
                            <p className="font-medium text-gray-900">{business.totalOrders}</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="font-medium text-gray-900">RD$ {business.totalRevenue.toLocaleString()}</p>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <button className="p-2 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-all">
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteBusiness(business.id)}
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* Orders */}
          {activeTab === 'orders' && (
            <motion.div
              key="orders"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Pedido</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Cliente</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Negocio</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Total</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Estado</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Fecha</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredOrders.map((order) => (
                        <tr key={order.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <p className="font-medium text-gray-900">{order.id}</p>
                            <p className="text-sm text-gray-400">{order.items?.length || 0} items</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="font-medium text-gray-900">{order.customerName}</p>
                            <p className="text-sm text-gray-400">{order.customerEmail}</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="font-medium text-gray-900">{order.businessName}</p>
                            <p className="text-sm text-gray-400">{order.businessEmail}</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="font-medium text-gray-900">RD$ {order.total}</p>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(order.status)}`}>
                              {getStatusIcon(order.status)}
                              {order.status === 'pending' ? 'Pendiente' : 
                               order.status === 'preparing' ? 'Preparando' :
                               order.status === 'ready' ? 'Listo' :
                               order.status === 'picked_up' ? 'En Camino' : 'Entregado'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm text-gray-400">{new Date(order.createdAt).toLocaleDateString()}</p>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* Users */}
          {activeTab === 'users' && (
            <motion.div
              key="users"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Usuario</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Contacto</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Rol</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Estado</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Registro</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`} alt={user.name} className="w-10 h-10 rounded-full object-cover" />
                              <p className="font-medium text-gray-900">{user.name}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="space-y-1">
                              <p className="text-sm text-gray-900">{user.email}</p>
                              <p className="text-sm text-gray-400">{user.phone || user.whatsapp}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                              user.role === 'client' ? 'bg-emerald-100 text-emerald-700' :
                              user.role === 'delivery' ? 'bg-blue-100 text-blue-700' :
                              'bg-orange-100 text-orange-700'
                            }`}>
                              {user.role === 'client' ? 'Cliente' : user.role === 'delivery' ? 'Repartidor' : 'Negocio'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => handleToggleUserStatus(user.id)}
                              className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(user.status || 'active')}`}
                            >
                              {getStatusIcon(user.status || 'active')}
                              {(user.status || 'active') === 'active' ? 'Activo' : 'Inactivo'}
                            </button>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm text-gray-400">{new Date().toLocaleDateString()}</p>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* Reports */}
          {activeTab === 'reports' && (
            <motion.div
              key="reports"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Rendimiento por Negocio</h3>
                  <div className="space-y-4">
                    {businesses.map((business) => (
                      <div key={business.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <img src={business.image} alt={business.name} className="w-8 h-8 rounded-lg object-cover" />
                          <div>
                            <p className="font-medium text-gray-900">{business.name}</p>
                            <p className="text-sm text-gray-400">{business.totalOrders} pedidos</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-gray-900">RD$ {business.totalRevenue.toLocaleString()}</p>
                          <p className="text-sm text-gray-400">Ingresos</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Distribución de Usuarios</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-emerald-500 rounded" />
                        <span className="font-medium text-gray-900">Clientes</span>
                      </div>
                      <span className="font-bold text-gray-900">
                        {users.filter(u => u.role === 'client').length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-blue-500 rounded" />
                        <span className="font-medium text-gray-900">Repartidores</span>
                      </div>
                      <span className="font-bold text-gray-900">
                        {users.filter(u => u.role === 'delivery').length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-orange-500 rounded" />
                        <span className="font-medium text-gray-900">Negocios</span>
                      </div>
                      <span className="font-bold text-gray-900">
                        {users.filter(u => u.role === 'business').length}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Estadísticas Generales</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-4 bg-gray-50 rounded-xl">
                    <p className="text-3xl font-bold text-primary">{stats.totalBusinesses}</p>
                    <p className="text-sm text-gray-400 mt-1">Negocios Activos</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-xl">
                    <p className="text-3xl font-bold text-emerald-600">{stats.totalUsers}</p>
                    <p className="text-sm text-gray-400 mt-1">Usuarios Totales</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-xl">
                    <p className="text-3xl font-bold text-orange-600">{stats.totalOrders}</p>
                    <p className="text-sm text-gray-400 mt-1">Pedidos Completados</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default AdminView;
