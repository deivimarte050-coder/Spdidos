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
  AlertCircle,
  X,
  Truck,
  Bike,
  ChefHat,
  UserCheck,
  Megaphone,
  ImagePlus,
  Save,
  MessageSquare,
  Send,
  CheckCircle2,
  Activity,
  Volume2,
  VolumeX,
  Eye
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { LOGO_URL } from '../constants';
import DataService, { Business, Order } from '../services/DataService';
import FirebaseServiceV2 from '../services/FirebaseServiceV2';
import EventService from '../services/EventService'; // Importar EventService
import OrderNotificationService from '../services/OrderNotificationService';
import { User as AppUser } from '../types';
import BusinessLocationPicker from '../components/BusinessLocationPicker';

const DEFAULT_ANNOUNCEMENT_IMAGE_URL = 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&h=320&fit=crop&crop=center';

const normalizeBusinessLocation = (business: any): [number, number] | null => {
  if (Array.isArray(business?.location) && business.location.length === 2) {
    const lat = Number(business.location[0]);
    const lng = Number(business.location[1]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return [lat, lng];
  }

  const lat = Number(business?.latitude);
  const lng = Number(business?.longitude);
  if (Number.isFinite(lat) && Number.isFinite(lng)) return [lat, lng];

  return null;
};

const ACTIVE_ORDER_STATUSES = ['pending', 'accepted', 'preparing', 'ready'];
const FINALIZED_ORDER_STATUSES = ['delivered', 'cancelled'];

const AdminView: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'businesses' | 'create-business' | 'create-delivery' | 'orders' | 'realtime-orders' | 'users' | 'reports' | 'announcements' | 'notifications' | 'support'>('dashboard');
  const [deliveryUsers, setDeliveryUsers] = useState<AppUser[]>([]);
  const [orderFilter, setOrderFilter] = useState<string>('active');
  const [newDelivery, setNewDelivery] = useState({ name: '', email: '', phone: '', whatsapp: '', password: '', vehicleType: '', cedula: '' });
  const [showDeliveryPassword, setShowDeliveryPassword] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estados para los datos
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [deliveryFeeDrafts, setDeliveryFeeDrafts] = useState<Record<string, string>>({});
  const [announcementForm, setAnnouncementForm] = useState({
    topText: '¡Hace hasta un',
    highlightText: '50% DCTO!',
    ctaText: 'PEDIR YA',
    imageUrl: DEFAULT_ANNOUNCEMENT_IMAGE_URL,
  });
  const [savingAnnouncement, setSavingAnnouncement] = useState(false);
  const [notificationForm, setNotificationForm] = useState<{
    title: string;
    body: string;
    target: 'clients' | 'businesses' | 'delivery' | 'both' | 'all';
  }>({
    title: '',
    body: '',
    target: 'both',
  });
  const [sendingNotification, setSendingNotification] = useState(false);
  const [popupAnnouncementForm, setPopupAnnouncementForm] = useState({
    title: '',
    message: '',
  });
  const [publishingPopupAnnouncement, setPublishingPopupAnnouncement] = useState(false);
  const [lastPublishedPopupAnnouncement, setLastPublishedPopupAnnouncement] = useState<{
    title: string;
    message: string;
    publishedAt: string;
  } | null>(null);

  // Real-time orders states
  const [realtimeSoundEnabled, setRealtimeSoundEnabled] = useState(true);
  const [newOrderAlert, setNewOrderAlert] = useState<any | null>(null);
  const knownOrderIdsRef = React.useRef<Set<string>>(new Set());
  const isFirstLoadRef = React.useRef(true);
  const realtimeAudioRef = React.useRef<HTMLAudioElement | null>(null);
  const realtimeSoundEnabledRef = React.useRef(true);

  // Support chat states
  const [supportChats, setSupportChats] = useState<any[]>([]);
  const [activeSupportChatId, setActiveSupportChatId] = useState<string | null>(null);
  const [supportMessages, setSupportMessages] = useState<any[]>([]);
  const [supportInput, setSupportInput] = useState('');
  const [sendingSupportMsg, setSendingSupportMsg] = useState(false);
  const supportBottomRef = React.useRef<HTMLDivElement>(null);

  const [newBusiness, setNewBusiness] = useState({
    name: '',
    email: '',
    phone: '',
    whatsapp: '',
    category: '',
    address: '',
    location: null as [number, number] | null,
    image: '',
    deliveryFee: 50,
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  
  // Estado para editar negocio
  const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    whatsapp: '',
    category: '',
    address: '',
    location: null as [number, number] | null,
    image: '',
    deliveryFee: 50,
    password: ''
  });

  // Suscribirse a cambios en Firebase en tiempo real
  useEffect(() => {
    const loadStaticData = async () => {
      try {
        const [businessesData, usersData, homeAnnouncement] = await Promise.all([
          FirebaseServiceV2.getBusinesses(),
          FirebaseServiceV2.getUsers(),
          FirebaseServiceV2.getHomeAnnouncement(),
        ]);
        setBusinesses(businessesData);
        setUsers(usersData);
        setDeliveryUsers(usersData.filter((u: AppUser) => u.role === 'delivery'));
        setAnnouncementForm({
          topText: homeAnnouncement.topText,
          highlightText: homeAnnouncement.highlightText,
          ctaText: homeAnnouncement.ctaText,
          imageUrl: homeAnnouncement.imageUrl,
        });
      } catch (error) {
        console.error('Error cargando datos:', error);
        setBusinesses(DataService.getBusinesses());
        setUsers(DataService.getUsers());
      }
    };
    loadStaticData();
    const intervalId = setInterval(loadStaticData, 60000);

    // Real-time orders subscription with new order detection
    const unsubOrders = FirebaseServiceV2.subscribeToOrders((ordersData) => {
      const typedOrders = ordersData as Order[];
      setOrders(typedOrders);

      // Detect new orders
      const currentIds = new Set(typedOrders.map(o => o.id));
      if (isFirstLoadRef.current) {
        knownOrderIdsRef.current = currentIds;
        isFirstLoadRef.current = false;
        return;
      }

      const newOrders = typedOrders.filter(o => !knownOrderIdsRef.current.has(o.id));
      if (newOrders.length > 0) {
        const latest = newOrders[0];
        setNewOrderAlert(latest);
        setTimeout(() => setNewOrderAlert(null), 8000);

        // Play sound
        try {
          if (realtimeSoundEnabledRef.current && realtimeAudioRef.current) {
            realtimeAudioRef.current.currentTime = 0;
            realtimeAudioRef.current.play().catch(() => {});
          }
        } catch (_) {}

        // Browser notification (admin only)
        if ('Notification' in window && Notification.permission === 'granted' && user?.role === 'admin') {
          new Notification(`Nuevo Pedido - ${latest.businessName}`, {
            body: `Cliente: ${(latest as any).clientName || 'N/A'}\nTotal: RD$ ${latest.total?.toFixed(0)}\n#${latest.id?.slice(-8).toUpperCase()}`,
            icon: '/favicon.ico',
          });
        }
      }
      knownOrderIdsRef.current = currentIds;
    });

    const unsubLocal = DataService.subscribe(() => {});
    
    return () => {
      clearInterval(intervalId);
      unsubOrders();
      unsubLocal();
    };
  }, []);

  // Support chats subscription
  useEffect(() => {
    const unsub = FirebaseServiceV2.subscribeSupportChats((chats) => {
      setSupportChats(chats);
    });
    return unsub;
  }, []);

  // Support messages subscription
  useEffect(() => {
    if (!activeSupportChatId) { setSupportMessages([]); return; }
    FirebaseServiceV2.markSupportChatRead(activeSupportChatId, 'admin');
    const unsub = FirebaseServiceV2.subscribeSupportMessages(activeSupportChatId, (msgs) => {
      setSupportMessages(msgs);
      FirebaseServiceV2.markSupportChatRead(activeSupportChatId, 'admin');
      setTimeout(() => supportBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });
    return unsub;
  }, [activeSupportChatId]);

  useEffect(() => {
    const unsubPopupAnnouncement = FirebaseServiceV2.subscribeToPopupAnnouncement((announcement) => {
      if (!announcement) {
        setLastPublishedPopupAnnouncement(null);
        return;
      }
      setLastPublishedPopupAnnouncement({
        title: announcement.title,
        message: announcement.message,
        publishedAt: announcement.publishedAt,
      });
    });

    return () => unsubPopupAnnouncement();
  }, []);

  useEffect(() => {
    setDeliveryFeeDrafts((prev) => {
      const next = { ...prev };
      businesses.forEach((business) => {
        if (next[business.id] === undefined) {
          const currentFee = Number((business as any).deliveryFee ?? 50);
          next[business.id] = String(Number.isFinite(currentFee) && currentFee >= 0 ? currentFee : 50);
        }
      });
      return next;
    });
  }, [businesses]);

  const handleSaveBusinessDeliveryFee = async (businessId: string) => {
    const rawValue = deliveryFeeDrafts[businessId] ?? '';
    const parsedFee = Number(rawValue);

    if (!Number.isFinite(parsedFee) || parsedFee < 0) {
      alert('Ingresa un costo de delivery válido (0 o mayor).');
      return;
    }

    try {
      await FirebaseServiceV2.updateBusiness(businessId, { deliveryFee: parsedFee });
      setBusinesses((prev) => prev.map((b) => (b.id === businessId ? { ...b, deliveryFee: parsedFee } : b)));
      alert('✅ Costo de delivery actualizado');
    } catch (error: any) {
      console.error('❌ Error actualizando costo de delivery:', error);
      alert(`❌ No se pudo guardar el costo de delivery: ${error.message || 'Error desconocido'}`);
    }
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = notificationForm.title.trim();
    const body = notificationForm.body.trim();

    if (!title || !body) {
      alert('Completa el título y el mensaje para enviar la notificación.');
      return;
    }

    setSendingNotification(true);
    try {
      // Convert target to roles for push notifications
      const targetRoles: Array<'admin' | 'business' | 'delivery' | 'client'> = 
        notificationForm.target === 'clients' ? ['client'] :
        notificationForm.target === 'businesses' ? ['business'] :
        notificationForm.target === 'delivery' ? ['delivery'] :
        notificationForm.target === 'both' ? ['client', 'business'] :
        ['client', 'business', 'delivery']; // 'all'
      
      // Send role-based push notifications
      // await FirebaseServiceV2.sendPushNotificationToRoles({
      //   title,
      //   body,
      //   roles: targetRoles,
      //   tag: 'admin_broadcast',
      // });
      
      // Also create in-app notifications
      await FirebaseServiceV2.createInAppNotificationsForTarget({
        title,
        body,
        target: notificationForm.target,
        createdBy: user?.id,
      });
      
      alert('✅ Notificación enviada.');
      setNotificationForm((prev) => ({ ...prev, title: '', body: '' }));
    } catch (error: any) {
      alert(`❌ Error enviando notificación: ${error?.message || 'Error desconocido'}`);
    } finally {
      setSendingNotification(false);
    }
  };

  const handlePublishPopupAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = popupAnnouncementForm.title.trim();
    const message = popupAnnouncementForm.message.trim();

    if (!title || !message) {
      alert('Completa el título y el mensaje del anuncio emergente.');
      return;
    }

    setPublishingPopupAnnouncement(true);
    try {
      await FirebaseServiceV2.publishPopupAnnouncement({
        title,
        message,
        createdBy: user?.id,
      });
      alert('✅ Anuncio emergente publicado.');
      setPopupAnnouncementForm({ title: '', message: '' });
    } catch (error: any) {
      alert(`❌ Error publicando anuncio emergente: ${error?.message || 'Error desconocido'}`);
    } finally {
      setPublishingPopupAnnouncement(false);
    }
  };

  const handleAnnouncementImageUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = typeof reader.result === 'string' ? reader.result : '';
      if (base64) {
        setAnnouncementForm(prev => ({ ...prev, imageUrl: base64 }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAnnouncement(true);
    try {
      await FirebaseServiceV2.saveHomeAnnouncement(announcementForm);
      alert('✅ Anuncio guardado correctamente.');
    } catch (error: any) {
      alert(`❌ Error guardando anuncio: ${error?.message || 'Error desconocido'}`);
    } finally {
      setSavingAnnouncement(false);
    }
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'create-business', label: 'Crear Negocio', icon: Plus },
    { id: 'create-delivery', label: 'Crear Repartidor', icon: Truck },
    { id: 'businesses', label: 'Lista de Negocios', icon: Store },
    { id: 'orders', label: 'Ver Pedidos', icon: ShoppingCart },
    { id: 'realtime-orders', label: 'Pedidos en Tiempo Real', icon: Activity },
    { id: 'users', label: 'Usuarios', icon: Users },
    { id: 'notifications', label: 'Notificaciones', icon: Bell },
    { id: 'reports', label: 'Reportes', icon: FileText },
    { id: 'announcements', label: 'Anuncios', icon: Megaphone },
    { id: 'support', label: 'Soporte', icon: MessageSquare }
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

  const handleCreateDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    const generatedPassword = newDelivery.password || `DEL${Date.now().toString().slice(-6)}`;
    try {
      await FirebaseServiceV2.addUser({
        name: newDelivery.name,
        email: newDelivery.email,
        password: generatedPassword,
        phone: newDelivery.phone,
        whatsapp: newDelivery.whatsapp,
        role: 'delivery',
        status: 'active',
        vehicleType: newDelivery.vehicleType,
        cedula: newDelivery.cedula
      });
      const updatedUsers = await FirebaseServiceV2.getUsers();
      setUsers(updatedUsers);
      setDeliveryUsers(updatedUsers.filter((u: AppUser) => u.role === 'delivery'));
      alert(`✅ Repartidor creado exitosamente\n\n📧 Email: ${newDelivery.email}\n🔑 Contraseña: ${generatedPassword}\n\n⚠️ Guarda estas credenciales para que pueda iniciar sesión.`);
      setNewDelivery({ name: '', email: '', phone: '', whatsapp: '', password: '', vehicleType: '', cedula: '' });
      setActiveTab('users');
    } catch (error: any) {
      console.error('❌ Error creando repartidor:', error);
      alert(`❌ Error al crear repartidor:\n${error.message || 'Error desconocido'}`);
    }
  };

  const handleCreateBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('🚀 Iniciando creación de negocio...');
    
    // Generar contraseña automática si no se proporciona
    const generatedPassword = newBusiness.password || `SP${Date.now().toString().slice(-6)}`;
    
    // Crear negocio con la contraseña
    const businessWithPassword = {
      ...newBusiness,
      password: generatedPassword,
      location: newBusiness.location,
      latitude: newBusiness.location ? newBusiness.location[0] : null,
      longitude: newBusiness.location ? newBusiness.location[1] : null,
      status: 'active',
      rating: 4.0,
      totalOrders: 0,
      totalRevenue: 0,
      createdAt: new Date().toISOString()
    };
    
    console.log('📋 Datos del negocio:', businessWithPassword);
    
    try {
      // 1. Guardar NEGOCIO en Firebase
      console.log('💾 Guardando NEGOCIO...');
      const businessResult = await FirebaseServiceV2.addBusiness(businessWithPassword);
      console.log('✅ Negocio guardado:', businessResult);
      
      // 2. Crear USUARIO del negocio para login
      console.log('� Creando USUARIO para login...');
      await FirebaseServiceV2.addUser({
        name: newBusiness.name,
        email: newBusiness.email,
        password: generatedPassword,
        phone: newBusiness.phone,
        whatsapp: newBusiness.whatsapp,
        role: 'business',
        status: 'active',
        businessId: businessResult.id
      });
      console.log('✅ Usuario creado para login');
      
      // Actualizar lista local
      const updatedBusinesses = await FirebaseServiceV2.getBusinesses();
      setBusinesses(updatedBusinesses);
      
      alert(`✅ Negocio y usuario creados exitosamente\n\n📧 Email: ${newBusiness.email}\n🔑 Contraseña: ${generatedPassword}\n\n⚠️ IMPORTANTE: Ahora puedes iniciar sesión con estas credenciales.`);
      
      setNewBusiness({ name: '', email: '', phone: '', whatsapp: '', category: '', address: '', location: null, image: '', deliveryFee: 50, password: '' });
      setActiveTab('businesses');
    } catch (error: any) {
      console.error('❌ Error completo:', error);
      console.error('Código de error:', error.code);
      console.error('Mensaje:', error.message);
      alert(`❌ Error al crear el negocio:\n\nCódigo: ${error.code || 'N/A'}\nMensaje: ${error.message || 'Error desconocido'}`);
    }
  };

  const handleDeleteBusiness = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar este negocio?')) {
      try {
        await FirebaseServiceV2.deleteBusiness(id);
        // Actualizar lista
        const updatedBusinesses = await FirebaseServiceV2.getBusinesses();
        setBusinesses(updatedBusinesses);
        alert('✅ Negocio eliminado exitosamente');
      } catch (error) {
        console.error('Error eliminando negocio:', error);
        alert('❌ Error al eliminar el negocio');
      }
    }
  };

  const handleToggleBusinessStatus = async (id: string) => {
    const business = businesses.find(b => b.id === id);
    if (business) {
      try {
        const newStatus = business.status === 'active' ? 'inactive' : 'active';
        await FirebaseServiceV2.updateBusiness(id, { status: newStatus });
        // Actualizar lista
        const updatedBusinesses = await FirebaseServiceV2.getBusinesses();
        setBusinesses(updatedBusinesses);
      } catch (error) {
        console.error('Error actualizando estado:', error);
        alert('❌ Error al cambiar el estado');
      }
    }
  };

  // Funciones para editar negocio
  const handleOpenEditModal = (business: Business) => {
    setEditingBusiness(business);
    setEditForm({
      name: business.name || '',
      email: business.email || '',
      phone: business.phone || '',
      whatsapp: business.whatsapp || '',
      category: business.category || '',
      address: business.address || '',
      location: normalizeBusinessLocation(business),
      image: business.image || '',
      deliveryFee: Number(business.deliveryFee ?? 50),
      password: '' // Dejar en blanco, solo cambiar si se ingresa nueva
    });
  };

  const handleCloseEditModal = () => {
    setEditingBusiness(null);
    setEditForm({
      name: '',
      email: '',
      phone: '',
      whatsapp: '',
      category: '',
      address: '',
      location: null,
      image: '',
      deliveryFee: 50,
      password: ''
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBusiness) return;

    try {
      console.log('💾 Guardando cambios del negocio...');
      
      // Preparar datos a actualizar
      const updateData: any = {
        name: editForm.name,
        email: editForm.email,
        phone: editForm.phone,
        whatsapp: editForm.whatsapp,
        category: editForm.category,
        address: editForm.address,
        location: editForm.location,
        latitude: editForm.location ? editForm.location[0] : null,
        longitude: editForm.location ? editForm.location[1] : null,
        image: editForm.image,
        deliveryFee: Number(editForm.deliveryFee) || 0
      };

      // Solo actualizar contraseña si se proporcionó una nueva
      if (editForm.password && editForm.password.trim() !== '') {
        updateData.password = editForm.password;
      }

      // Actualizar en Firebase
      await FirebaseServiceV2.updateBusiness(editingBusiness.id, updateData);
      
      // Actualizar lista local
      const updatedBusinesses = await FirebaseServiceV2.getBusinesses();
      setBusinesses(updatedBusinesses);
      
      alert('✅ Negocio actualizado exitosamente');
      handleCloseEditModal();
    } catch (error: any) {
      console.error('❌ Error actualizando negocio:', error);
      alert(`❌ Error al actualizar: ${error.message || 'Error desconocido'}`);
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

  const formatDateInputValue = (value?: string) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().slice(0, 10);
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

  const hasCustomAnnouncementImage = !!announcementForm.imageUrl && announcementForm.imageUrl !== DEFAULT_ANNOUNCEMENT_IMAGE_URL;

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
              {activeTab === 'create-delivery' && 'Registra un nuevo repartidor con acceso al panel'}
              {activeTab === 'businesses' && 'Gestiona todos los negocios activos'}
              {activeTab === 'orders' && 'Monitorea todos los pedidos en tiempo real'}
              {activeTab === 'realtime-orders' && 'Recibe alertas en vivo de todos los negocios'}
              {activeTab === 'users' && 'Administra todos los usuarios registrados'}
              {activeTab === 'notifications' && 'Envía notificaciones push a clientes, negocios, repartidores o a todos'}
              {activeTab === 'reports' && 'Analiza el rendimiento de la plataforma'}
              {activeTab === 'announcements' && 'Edita el banner principal mostrado en el home de clientes'}
              {activeTab === 'support' && 'Gestiona las conversaciones de soporte con clientes'}
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
                          <option value="Hamburguesas">Hamburguesas</option>
                          <option value="Sándwich">Sándwich</option>
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
                      <label className="block text-sm font-bold text-gray-700 mb-2">Ubicaci�n del negocio</label>
                      <BusinessLocationPicker
                        value={newBusiness.location}
                        onChange={(coords) => setNewBusiness({ ...newBusiness, location: coords })}
                        editable
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Costo de Delivery (RD$)</label>
                      <input
                        type="number"
                        min={0}
                        step={1}
                        required
                        value={newBusiness.deliveryFee}
                        onChange={(e) => setNewBusiness({ ...newBusiness, deliveryFee: Number(e.target.value) || 0 })}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        placeholder="50"
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

          {/* Create Delivery */}
          {activeTab === 'create-delivery' && (
            <motion.div key="create-delivery" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <div className="max-w-2xl">
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="bg-emerald-100 p-3 rounded-2xl">
                      <Truck className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black font-display tracking-tight">Crear Nuevo Repartidor</h3>
                      <p className="text-sm text-gray-500">El repartidor podrá iniciar sesión con estas credenciales</p>
                    </div>
                  </div>

                  <form onSubmit={handleCreateDelivery} className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Nombre Completo *</label>
                        <input type="text" required value={newDelivery.name}
                          onChange={(e) => setNewDelivery({...newDelivery, name: e.target.value})}
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary"
                          placeholder="Ej. Juan Pérez" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Cédula de Identidad</label>
                        <input type="text" value={newDelivery.cedula}
                          onChange={(e) => setNewDelivery({...newDelivery, cedula: e.target.value})}
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary"
                          placeholder="000-0000000-0" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Email *</label>
                        <input type="email" required value={newDelivery.email}
                          onChange={(e) => setNewDelivery({...newDelivery, email: e.target.value})}
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary"
                          placeholder="repartidor@email.com" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Teléfono *</label>
                        <input type="tel" required value={newDelivery.phone}
                          onChange={(e) => setNewDelivery({...newDelivery, phone: e.target.value})}
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary"
                          placeholder="809-123-4567" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">WhatsApp *</label>
                        <input type="tel" required value={newDelivery.whatsapp}
                          onChange={(e) => setNewDelivery({...newDelivery, whatsapp: e.target.value})}
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary"
                          placeholder="809-123-4567" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Tipo de Vehículo</label>
                        <select value={newDelivery.vehicleType}
                          onChange={(e) => setNewDelivery({...newDelivery, vehicleType: e.target.value})}
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary">
                          <option value="">Seleccionar...</option>
                          <option value="moto">🏍️ Motocicleta</option>
                          <option value="bicicleta">🚲 Bicicleta</option>
                          <option value="carro">🚗 Carro</option>
                          <option value="a_pie">🚶 A pie</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        Contraseña de Acceso
                        <span className="text-xs text-gray-400 ml-2">(Opcional — se genera automáticamente)</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showDeliveryPassword ? 'text' : 'password'}
                          value={newDelivery.password}
                          onChange={(e) => setNewDelivery({...newDelivery, password: e.target.value})}
                          className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary"
                          placeholder="Dejar en blanco para generar automáticamente" />
                        <button type="button" onClick={() => setShowDeliveryPassword(p => !p)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                          {showDeliveryPassword ? '👁️' : '👁️\u200d🗨️'}
                        </button>
                      </div>
                      <p className="text-xs text-gray-400 mt-1.5">💡 Si no ingresas una contraseña, se generará una automáticamente al crear el repartidor.</p>
                    </div>

                    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex gap-3">
                      <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-blue-700">
                        <p className="font-bold mb-1">¿Cómo funciona?</p>
                        <p>El repartidor inicia sesión con su email y contraseña. Verá los pedidos listos asignados a él y podrá aceptarlos, ver la ruta en el mapa y marcarlos como entregados.</p>
                      </div>
                    </div>

                    <button type="submit"
                      className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold hover:bg-emerald-700 transition-all flex items-center justify-center gap-2">
                      <Truck className="w-5 h-5" /> Crear Repartidor
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
              className="space-y-4"
            >
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Bike className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-base md:text-lg font-black text-gray-900">Precio de viajes delivery</h3>
                </div>
                <p className="text-xs md:text-sm text-gray-500 mb-4">
                  Cambia el precio por negocio y presiona <span className="font-bold">Guardar</span>.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {filteredBusinesses.map((business) => (
                    <div key={`delivery-fee-card-${business.id}`} className="border border-gray-100 rounded-xl p-3 bg-gray-50">
                      <p className="text-sm font-bold text-gray-900 truncate">{business.name}</p>
                      <p className="text-xs text-gray-500 mb-2">{business.category}</p>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 text-emerald-700 font-bold text-xs bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100">
                          <Bike className="w-3.5 h-3.5" />
                          RD$
                        </div>
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={deliveryFeeDrafts[business.id] ?? String(Number((business as any).deliveryFee ?? 50))}
                          onChange={(e) => setDeliveryFeeDrafts((prev) => ({ ...prev, [business.id]: e.target.value }))}
                          className="w-20 px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm font-bold text-gray-800 focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                        <button
                          onClick={() => handleSaveBusinessDeliveryFee(business.id)}
                          className="px-2.5 py-1.5 bg-primary text-white rounded-lg text-xs font-bold hover:bg-primary/90 transition-all"
                        >
                          Guardar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

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
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Costo Delivery</th>
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
                            <div className="flex items-center gap-2 min-w-[220px]">
                              <div className="flex items-center gap-1 text-emerald-700 font-bold text-xs bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100">
                                <Bike className="w-3.5 h-3.5" />
                                RD$
                              </div>
                              <input
                                type="number"
                                min={0}
                                step={1}
                                value={deliveryFeeDrafts[business.id] ?? String(Number((business as any).deliveryFee ?? 50))}
                                onChange={(e) => setDeliveryFeeDrafts((prev) => ({ ...prev, [business.id]: e.target.value }))}
                                className="w-20 px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm font-bold text-gray-800 focus:ring-2 focus:ring-primary/20 focus:border-primary"
                              />
                              <button
                                onClick={() => handleSaveBusinessDeliveryFee(business.id)}
                                className="px-2.5 py-1.5 bg-primary text-white rounded-lg text-xs font-bold hover:bg-primary/90 transition-all"
                              >
                                Guardar
                              </button>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => handleOpenEditModal(business)}
                                className="p-2 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                              >
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
            <motion.div key="orders" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              {/* Filtros */}
              <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
                {[
                  { key: 'active', label: 'Activos' },
                  { key: 'pending', label: 'Pendientes' },
                  { key: 'ready', label: 'Listos — Asignar' },
                  { key: 'on_the_way', label: 'En Camino' },
                  { key: 'done', label: 'Finalizados' },
                  { key: 'all', label: 'Todos' },
                ].map(f => {
                  const count = f.key === 'active' ? orders.filter(o => ACTIVE_ORDER_STATUSES.includes(o.status)).length
                    : f.key === 'pending' ? orders.filter(o => o.status === 'pending').length
                    : f.key === 'ready' ? orders.filter(o => o.status === 'ready').length
                    : f.key === 'on_the_way' ? orders.filter(o => o.status === 'on_the_way').length
                    : f.key === 'done' ? orders.filter(o => FINALIZED_ORDER_STATUSES.includes(o.status)).length
                    : orders.length;
                  return (
                    <button key={f.key} onClick={() => setOrderFilter(f.key)}
                      className={`flex-shrink-0 px-4 py-2 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${orderFilter === f.key ? 'bg-primary text-white shadow' : 'bg-white text-gray-600 border border-gray-200'}`}>
                      {f.label}
                      {count > 0 && <span className={`text-xs rounded-full px-1.5 py-0.5 ${orderFilter === f.key ? 'bg-white/30 text-white' : 'bg-gray-100 text-gray-600'}`}>{count}</span>}
                    </button>
                  );
                })}
              </div>

              <div className="space-y-3">
                {orders.filter(o => {
                  if (orderFilter === 'active') return ACTIVE_ORDER_STATUSES.includes(o.status);
                  if (orderFilter === 'pending') return o.status === 'pending';
                  if (orderFilter === 'ready') return o.status === 'ready';
                  if (orderFilter === 'on_the_way') return o.status === 'on_the_way' || o.status === 'picked_up';
                  if (orderFilter === 'done') return FINALIZED_ORDER_STATUSES.includes(o.status);
                  return true;
                }).map(order => {
                  const STATUS_LABELS: Record<string, string> = { pending: 'Pendiente', accepted: 'Aceptado', preparing: 'Preparando', ready: 'Listo', on_the_way: 'En Camino', picked_up: 'Recogido', delivered: 'Entregado', cancelled: 'Cancelado' };
                  const STATUS_COLORS: Record<string, string> = { pending: 'bg-yellow-100 text-yellow-700', accepted: 'bg-blue-100 text-blue-700', preparing: 'bg-orange-100 text-orange-700', ready: 'bg-purple-100 text-purple-700', on_the_way: 'bg-indigo-100 text-indigo-700', picked_up: 'bg-indigo-100 text-indigo-700', delivered: 'bg-emerald-100 text-emerald-700', cancelled: 'bg-red-100 text-red-700' };
                  return (
                    <div key={order.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div>
                          <p className="font-bold text-gray-900">#{order.id?.slice(-8).toUpperCase()}</p>
                          <p className="text-xs text-gray-500">{order.businessName} · {new Date(order.createdAt).toLocaleString('es-DO')}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-700'}`}>
                          {STATUS_LABELS[order.status] || order.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="bg-gray-50 rounded-xl p-3">
                          <p className="text-xs text-gray-400 font-bold uppercase mb-1">Cliente</p>
                          <p className="font-medium text-gray-900">{(order as any).clientName || (order as any).customerName || 'N/A'}</p>
                          <p className="text-gray-500 text-xs">{(order as any).clientEmail || (order as any).customerEmail || ''}</p>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-3">
                          <p className="text-xs text-gray-400 font-bold uppercase mb-1">Total</p>
                          <p className="font-black text-lg text-emerald-600">RD$ {order.total?.toFixed(0)}</p>
                          <p className="text-xs text-gray-500">{order.items?.length || 0} items</p>
                        </div>
                      </div>

                      {/* Assign delivery for ready orders */}
                      {order.status === 'ready' && (
                        <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
                          <p className="text-sm font-bold text-purple-800 mb-3 flex items-center gap-2">
                            <UserCheck className="w-4 h-4" /> Asignar Repartidor
                          </p>
                          <div className="flex gap-2">
                            <select
                              className="flex-1 text-sm border border-purple-200 rounded-xl px-3 py-2 bg-white font-medium"
                              defaultValue=""
                              onChange={async (e) => {
                                const deliveryId = e.target.value;
                                if (!deliveryId) return;
                                const deliveryUser = deliveryUsers.find(u => u.id === deliveryId);
                                try {
                                  await FirebaseServiceV2.updateOrder(order.id, {
                                    status: 'on_the_way',
                                    deliveryId,
                                    deliveryName: deliveryUser?.name || 'Repartidor'
                                  });
                                } catch (err) { console.error('Error asignando repartidor:', err); }
                              }}
                            >
                              <option value="">Seleccionar repartidor...</option>
                              {deliveryUsers.map(u => (
                                <option key={u.id} value={u.id}>{u.name} — {u.phone || u.whatsapp}</option>
                              ))}
                            </select>
                          </div>
                          {deliveryUsers.length === 0 && (
                            <p className="text-xs text-purple-600 mt-2">No hay repartidores registrados. Crea un usuario con rol "delivery".</p>
                          )}
                        </div>
                      )}

                      {order.status === 'on_the_way' && (
                        <div className="flex items-center gap-2 bg-indigo-50 rounded-xl p-3 border border-indigo-100">
                          <Truck className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                          <span className="text-sm font-bold text-indigo-700">Repartidor: {(order as any).deliveryName || 'En camino'}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
                {orders.filter(o => {
                  if (orderFilter === 'active') return ACTIVE_ORDER_STATUSES.includes(o.status);
                  if (orderFilter === 'pending') return o.status === 'pending';
                  if (orderFilter === 'ready') return o.status === 'ready';
                  if (orderFilter === 'on_the_way') return o.status === 'on_the_way' || o.status === 'picked_up';
                  if (orderFilter === 'done') return FINALIZED_ORDER_STATUSES.includes(o.status);
                  return true;
                }).length === 0 && (
                  <div className="bg-white p-12 rounded-2xl border border-dashed border-gray-200 text-center">
                    <Package className="w-14 h-14 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-400 font-bold">No hay pedidos en esta categoría</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Realtime Orders */}
          {activeTab === 'realtime-orders' && (
            <motion.div key="realtime-orders" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4">
              {/* Audio element for notification sound */}
              <audio ref={realtimeAudioRef} src="https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3" preload="auto" />

              {/* New order alert banner */}
              <AnimatePresence>
                {newOrderAlert && (
                  <motion.div
                    initial={{ opacity: 0, y: -20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.95 }}
                    className="bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-2xl p-5 shadow-lg border border-emerald-400 flex items-center gap-4"
                  >
                    <div className="bg-white/20 rounded-full p-3 animate-pulse">
                      <ShoppingCart className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <p className="font-black text-lg">Nuevo Pedido Recibido</p>
                      <p className="text-white/90 text-sm">
                        {newOrderAlert.businessName} &middot; #{newOrderAlert.id?.slice(-8).toUpperCase()} &middot; Cliente: {(newOrderAlert as any).clientName || 'N/A'} &middot; <span className="font-bold">RD$ {newOrderAlert.total?.toFixed(0)}</span>
                      </p>
                    </div>
                    <button
                      onClick={() => { setActiveTab('orders'); setNewOrderAlert(null); }}
                      className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-all"
                    >
                      <Eye className="w-4 h-4" /> Ver Pedido
                    </button>
                    <button onClick={() => setNewOrderAlert(null)} className="text-white/60 hover:text-white transition-colors">
                      <X className="w-5 h-5" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Controls bar */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-100 p-2.5 rounded-xl">
                    <Activity className="w-5 h-5 text-emerald-600 animate-pulse" />
                  </div>
                  <div>
                    <p className="font-black text-gray-900">Escuchando pedidos en vivo</p>
                    <p className="text-xs text-gray-400">{orders.filter(o => o.status === 'pending').length} pendientes &middot; {orders.filter(o => ACTIVE_ORDER_STATUSES.includes(o.status)).length} activos &middot; {orders.length} totales</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      if ('Notification' in window && Notification.permission !== 'granted') {
                        Notification.requestPermission();
                      }
                    }}
                    className="px-4 py-2 rounded-xl text-sm font-bold bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100 transition-all flex items-center gap-2"
                  >
                    <Bell className="w-4 h-4" />
                    {typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted' ? 'Notificaciones Activas' : 'Activar Notificaciones'}
                  </button>
                  <button
                    onClick={() => { const next = !realtimeSoundEnabled; setRealtimeSoundEnabled(next); realtimeSoundEnabledRef.current = next; }}
                    className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${
                      realtimeSoundEnabled
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100'
                        : 'bg-gray-50 text-gray-400 border border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {realtimeSoundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                    {realtimeSoundEnabled ? 'Sonido ON' : 'Sonido OFF'}
                  </button>
                </div>
              </div>

              {/* Stats cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Pendientes', count: orders.filter(o => o.status === 'pending').length, color: 'bg-yellow-50 text-yellow-700 border-yellow-100', icon: Clock },
                  { label: 'Preparando', count: orders.filter(o => o.status === 'accepted' || o.status === 'preparing').length, color: 'bg-orange-50 text-orange-700 border-orange-100', icon: ChefHat },
                  { label: 'Listos', count: orders.filter(o => o.status === 'ready').length, color: 'bg-purple-50 text-purple-700 border-purple-100', icon: Package },
                  { label: 'En Camino', count: orders.filter(o => o.status === 'on_the_way' || o.status === 'picked_up').length, color: 'bg-indigo-50 text-indigo-700 border-indigo-100', icon: Truck },
                ].map((s) => (
                  <div key={s.label} className={`rounded-2xl border p-4 ${s.color}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <s.icon className="w-4 h-4" />
                      <span className="text-xs font-bold uppercase">{s.label}</span>
                    </div>
                    <p className="text-3xl font-black">{s.count}</p>
                  </div>
                ))}
              </div>

              {/* Live feed - recent orders */}
              <div className="space-y-3">
                <h3 className="font-black text-gray-900 text-lg flex items-center gap-2">
                  <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
                  Feed en vivo — Últimos pedidos
                </h3>
                {orders.length === 0 ? (
                  <div className="bg-white p-12 rounded-2xl border border-dashed border-gray-200 text-center">
                    <Activity className="w-14 h-14 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-400 font-bold">Esperando nuevos pedidos...</p>
                    <p className="text-xs text-gray-300 mt-1">Los pedidos aparecerán aquí automáticamente</p>
                  </div>
                ) : (
                  orders.slice(0, 30).map((order) => {
                    const STATUS_LABELS: Record<string, string> = { pending: 'Pendiente', accepted: 'Aceptado', preparing: 'Preparando', ready: 'Listo', on_the_way: 'En Camino', picked_up: 'Recogido', delivered: 'Entregado', cancelled: 'Cancelado' };
                    const STATUS_COLORS: Record<string, string> = { pending: 'bg-yellow-100 text-yellow-700', accepted: 'bg-blue-100 text-blue-700', preparing: 'bg-orange-100 text-orange-700', ready: 'bg-purple-100 text-purple-700', on_the_way: 'bg-indigo-100 text-indigo-700', picked_up: 'bg-indigo-100 text-indigo-700', delivered: 'bg-emerald-100 text-emerald-700', cancelled: 'bg-red-100 text-red-700' };
                    const isNew = !knownOrderIdsRef.current.has(order.id) || (newOrderAlert && newOrderAlert.id === order.id);
                    return (
                      <motion.div
                        key={order.id}
                        initial={isNew ? { opacity: 0, x: -20, scale: 0.98 } : false}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        className={`bg-white rounded-2xl border shadow-sm p-5 transition-all ${isNew ? 'border-emerald-300 ring-2 ring-emerald-100' : 'border-gray-100'}`}
                      >
                        <div className="flex items-start justify-between flex-wrap gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${(order as any).clientName || order.clientId}`} alt="" className="w-10 h-10" />
                            </div>
                            <div>
                              <p className="font-bold text-gray-900">{(order as any).clientName || 'Cliente'}</p>
                              <p className="text-xs text-gray-400">{order.businessName} &middot; #{order.id?.slice(-8).toUpperCase()}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-700'}`}>
                              {STATUS_LABELS[order.status] || order.status}
                            </span>
                            <span className="font-black text-emerald-600 text-lg">RD$ {order.total?.toFixed(0)}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                          <div className="flex items-center gap-4 text-xs text-gray-400">
                            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{new Date(order.createdAt).toLocaleString('es-DO', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                            <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{new Date(order.createdAt).toLocaleDateString('es-DO')}</span>
                            <span className="flex items-center gap-1"><Package className="w-3.5 h-3.5" />{order.items?.length || 0} items</span>
                          </div>
                          <button
                            onClick={() => { setActiveTab('orders'); }}
                            className="text-xs font-bold text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" /> Ver detalle
                          </button>
                        </div>
                      </motion.div>
                    );
                  })
                )}
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

          {/* Announcements */}
          {activeTab === 'notifications' && (
            <motion.div
              key="notifications"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-5xl space-y-6"
            >
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-xl font-black text-gray-900 mb-1">Enviar notificaciones</h3>
                <p className="text-sm text-gray-400 mb-6">
                  Puedes enviar por separado a clientes, negocios o repartidores, o enviarla a todos al mismo tiempo.
                </p>

                <form onSubmit={handleSendNotification} className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Destinatarios</label>
                    <select
                      value={notificationForm.target}
                      onChange={(e) => setNotificationForm((prev) => ({
                        ...prev,
                        target: e.target.value as 'clients' | 'businesses' | 'delivery' | 'both' | 'all',
                      }))}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                      <option value="clients">Solo clientes</option>
                      <option value="businesses">Solo negocios</option>
                      <option value="delivery">Solo repartidores</option>
                      <option value="both">Clientes y negocios</option>
                      <option value="all">Todos (clientes, negocios y repartidores)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Título</label>
                    <input
                      type="text"
                      value={notificationForm.title}
                      onChange={(e) => setNotificationForm((prev) => ({ ...prev, title: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      placeholder="Ej: Promoción de hoy"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Mensaje</label>
                    <textarea
                      value={notificationForm.body}
                      onChange={(e) => setNotificationForm((prev) => ({ ...prev, body: e.target.value }))}
                      rows={4}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                      placeholder="Escribe el mensaje de la notificación"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={sendingNotification}
                    className="w-full bg-primary text-white py-3 rounded-xl font-bold hover:bg-primary/90 disabled:opacity-70 transition-colors flex items-center justify-center gap-2"
                  >
                    <Bell className="w-4 h-4" /> {sendingNotification ? 'Enviando...' : 'Enviar notificación'}
                  </button>
                </form>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-xl font-black text-gray-900 mb-1">Anuncio emergente para clientes</h3>
                <p className="text-sm text-gray-400 mb-6">
                  Este anuncio aparece automáticamente como popup cuando el cliente abre la app.
                </p>

                <form onSubmit={handlePublishPopupAnnouncement} className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Título</label>
                    <input
                      type="text"
                      value={popupAnnouncementForm.title}
                      onChange={(e) => setPopupAnnouncementForm((prev) => ({ ...prev, title: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      placeholder="Ej: Aviso importante"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Mensaje</label>
                    <textarea
                      value={popupAnnouncementForm.message}
                      onChange={(e) => setPopupAnnouncementForm((prev) => ({ ...prev, message: e.target.value }))}
                      rows={4}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                      placeholder="Escribe el mensaje que verá el cliente al abrir la app"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={publishingPopupAnnouncement}
                    className="w-full bg-primary text-white py-3 rounded-xl font-bold hover:bg-primary/90 disabled:opacity-70 transition-colors flex items-center justify-center gap-2"
                  >
                    <Megaphone className="w-4 h-4" /> {publishingPopupAnnouncement ? 'Publicando...' : 'Publicar anuncio emergente'}
                  </button>
                </form>

                {lastPublishedPopupAnnouncement && (
                  <div className="mt-5 p-4 rounded-xl bg-gray-50 border border-gray-100">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Último anuncio publicado</p>
                    <p className="mt-2 font-black text-gray-900">{lastPublishedPopupAnnouncement.title}</p>
                    <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">{lastPublishedPopupAnnouncement.message}</p>
                    <p className="text-xs text-gray-400 mt-2">
                      Publicado: {new Date(lastPublishedPopupAnnouncement.publishedAt).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Announcements */}
          {activeTab === 'announcements' && (
            <motion.div
              key="announcements"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 xl:grid-cols-2 gap-6"
            >
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-xl font-black text-gray-900 mb-1">Configurar anuncio</h3>
                <p className="text-sm text-gray-400 mb-6">Este contenido se refleja en el home del cliente.</p>

                <form onSubmit={handleSaveAnnouncement} className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Texto superior</label>
                    <input
                      type="text"
                      value={announcementForm.topText}
                      onChange={(e) => setAnnouncementForm(prev => ({ ...prev, topText: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      placeholder="¡Hace hasta un"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Texto destacado</label>
                    <input
                      type="text"
                      value={announcementForm.highlightText}
                      onChange={(e) => setAnnouncementForm(prev => ({ ...prev, highlightText: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      placeholder="50% DCTO!"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Texto botón</label>
                    <input
                      type="text"
                      value={announcementForm.ctaText}
                      onChange={(e) => setAnnouncementForm(prev => ({ ...prev, ctaText: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      placeholder="PEDIR YA"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Imagen del anuncio (URL)</label>
                    <input
                      type="url"
                      value={announcementForm.imageUrl}
                      onChange={(e) => setAnnouncementForm(prev => ({ ...prev, imageUrl: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      placeholder="https://..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">O subir imagen desde tu dispositivo</label>
                    <label className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-dashed border-gray-300 rounded-xl hover:bg-gray-50 cursor-pointer text-sm font-semibold text-gray-600">
                      <ImagePlus className="w-4 h-4" /> Seleccionar imagen
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleAnnouncementImageUpload(file);
                        }}
                      />
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={savingAnnouncement}
                    className="w-full bg-primary text-white py-3 rounded-xl font-bold hover:bg-primary/90 disabled:opacity-70 transition-colors flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4" /> {savingAnnouncement ? 'Guardando...' : 'Guardar anuncio'}
                  </button>
                </form>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-xl font-black text-gray-900 mb-4">Vista previa</h3>

                <motion.div
                  initial={{ opacity: 0.9 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.35 }}
                  className="relative overflow-hidden rounded-2xl h-[170px] sm:h-[190px] lg:h-[240px]"
                  style={hasCustomAnnouncementImage
                    ? { background: '#111827' }
                    : { background: 'linear-gradient(120deg,#ff8c00 0%,#f97316 45%,#ea580c 100%)' }}
                >
                  {hasCustomAnnouncementImage && (
                    <motion.img
                      animate={{ scale: [1, 1.03, 1] }}
                      transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
                      src={announcementForm.imageUrl}
                      alt="Preview anuncio"
                      className="absolute inset-0 h-full w-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = DEFAULT_ANNOUNCEMENT_IMAGE_URL;
                      }}
                    />
                  )}

                  {hasCustomAnnouncementImage && (
                    <div className="absolute inset-0 bg-gradient-to-r from-white/18 via-white/6 to-transparent pointer-events-none" />
                  )}

                  <motion.div
                    animate={{ y: [0, -3, 0] }}
                    transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
                    className="relative z-10 h-full px-5 py-4 max-w-[60%] flex flex-col justify-center"
                  >
                    <div className="inline-block max-w-full rounded-2xl px-3 py-2 bg-white/22 border border-white/40 backdrop-blur-[1px] overflow-hidden">
                      <p className="text-white text-base lg:text-lg font-bold leading-tight [text-shadow:0_2px_8px_rgba(0,0,0,0.35)] whitespace-nowrap overflow-hidden text-ellipsis">{announcementForm.topText || ' '}</p>
                      <p className="text-white font-black text-3xl sm:text-4xl leading-none tracking-tight [text-shadow:0_3px_12px_rgba(0,0,0,0.4)] whitespace-nowrap overflow-hidden text-ellipsis">{announcementForm.highlightText || ' '}</p>
                    </div>
                    <button className="mt-3 w-fit bg-amber-900/80 text-white font-black px-5 py-2 rounded-full text-xs tracking-wide">
                      {announcementForm.ctaText || ' '}
                    </button>
                  </motion.div>

                  {!hasCustomAnnouncementImage && (
                    <>
                      <motion.img
                        animate={{ scale: [1, 1.03, 1] }}
                        transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
                        src={announcementForm.imageUrl}
                        alt="Preview anuncio"
                        className="absolute right-0 top-0 h-full w-[45%] object-cover object-left"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = DEFAULT_ANNOUNCEMENT_IMAGE_URL;
                        }}
                      />

                      <div className="absolute inset-y-0 right-[33%] w-14 pointer-events-none" style={{ background: 'linear-gradient(to right, #f97316, transparent)' }} />
                    </>
                  )}
                </motion.div>
              </div>
            </motion.div>
          )}

          {/* Support */}
          {activeTab === 'support' && (
            <motion.div
              key="support"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex gap-6 h-[calc(100vh-160px)]"
            >
              {/* Chat list */}
              <div className="w-80 flex-shrink-0 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
                <div className="p-4 border-b border-gray-100">
                  <h3 className="font-black text-gray-900">Conversaciones</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{supportChats.length} total</p>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {supportChats.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center p-6">
                      <MessageSquare className="w-10 h-10 text-gray-300 mb-3" />
                      <p className="text-sm text-gray-400">No hay conversaciones aún</p>
                    </div>
                  ) : (
                    supportChats.map((chat) => {
                      const isActive = activeSupportChatId === chat.id;
                      const lastAt = chat.lastMessageAt?.toDate ? chat.lastMessageAt.toDate() : (chat.lastMessageAt ? new Date(chat.lastMessageAt) : null);
                      const timeStr = lastAt ? lastAt.toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' }) : '';
                      return (
                        <button
                          key={chat.id}
                          onClick={() => { setActiveSupportChatId(chat.id); setSupportInput(''); }}
                          className={`w-full flex items-start gap-3 p-4 border-b border-gray-50 text-left transition-colors ${isActive ? 'bg-primary/5' : 'hover:bg-gray-50'}`}
                        >
                          <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border-2 border-gray-100">
                            <img src={chat.clientPhoto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${chat.clientName}`} alt="" className="w-full h-full" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className={`font-bold text-sm truncate ${isActive ? 'text-primary' : 'text-gray-900'}`}>{chat.clientName}</p>
                              <span className="text-[10px] text-gray-400 flex-shrink-0">{timeStr}</span>
                            </div>
                            <p className="text-xs text-gray-400 truncate mt-0.5">{chat.lastMessage || 'Sin mensajes'}</p>
                            <div className="flex items-center gap-2 mt-1">
                              {chat.status === 'closed' && (
                                <span className="text-[9px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-bold">Cerrado</span>
                              )}
                              {(chat.unreadAdmin || 0) > 0 && (
                                <span className="text-[9px] bg-red-500 text-white px-2 py-0.5 rounded-full font-bold">{chat.unreadAdmin} nuevo{chat.unreadAdmin > 1 ? 's' : ''}</span>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Chat panel */}
              <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
                {!activeSupportChatId ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <MessageSquare className="w-16 h-16 text-gray-200 mb-4" />
                    <h4 className="font-bold text-gray-400 text-lg">Selecciona una conversación</h4>
                    <p className="text-sm text-gray-300 mt-1">Elige un cliente del panel izquierdo para ver sus mensajes</p>
                  </div>
                ) : (() => {
                  const activeChat = supportChats.find(c => c.id === activeSupportChatId);
                  const formatMsgTime = (ts: any) => {
                    if (!ts) return '';
                    const d = ts.toDate ? ts.toDate() : new Date(ts);
                    return d.toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' });
                  };
                  const formatMsgDate = (ts: any) => {
                    if (!ts) return '';
                    const d = ts.toDate ? ts.toDate() : new Date(ts);
                    return d.toLocaleDateString('es-DO', { day: 'numeric', month: 'short', year: 'numeric' });
                  };
                  let lastDateStr = '';

                  const handleSendSupportMsg = async () => {
                    if (!supportInput.trim() || !activeSupportChatId || !user || sendingSupportMsg) return;
                    const text = supportInput.trim();
                    setSupportInput('');
                    setSendingSupportMsg(true);
                    try {
                      await FirebaseServiceV2.sendSupportMessage(activeSupportChatId, user.id, user.name || 'Admin', 'admin', text);
                      // Create in-app notification for client
                      if (activeChat?.clientId) {
                        await FirebaseServiceV2.createInAppNotification({
                          userId: activeChat.clientId,
                          title: 'Soporte Spdidos',
                          message: text.slice(0, 100),
                          source: 'system',
                        });
                      }
                    } catch (e) {
                      console.error('Error sending support msg:', e);
                    }
                    setSendingSupportMsg(false);
                  };

                  return (
                    <>
                      {/* Chat header */}
                      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-gray-100">
                            <img src={activeChat?.clientPhoto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${activeChat?.clientName}`} alt="" className="w-full h-full" />
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">{activeChat?.clientName || 'Cliente'}</p>
                            <p className="text-[11px] text-gray-400">{activeChat?.status === 'closed' ? 'Cerrado' : 'Abierto'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {activeChat?.status === 'open' ? (
                            <button
                              onClick={async () => {
                                if (confirm('¿Cerrar esta conversación como resuelta?')) {
                                  await FirebaseServiceV2.closeSupportChat(activeSupportChatId);
                                }
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 text-xs font-bold hover:bg-emerald-100 transition-colors"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Resolver
                            </button>
                          ) : (
                            <button
                              onClick={async () => {
                                await FirebaseServiceV2.reopenSupportChat(activeSupportChatId);
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 text-xs font-bold hover:bg-blue-100 transition-colors"
                            >
                              Reabrir
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Messages */}
                      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-1 bg-gray-50/50">
                        {supportMessages.length === 0 ? (
                          <div className="flex items-center justify-center h-full text-gray-300 text-sm">Sin mensajes</div>
                        ) : (
                          supportMessages.map((msg) => {
                            const isAdmin = msg.senderRole === 'admin';
                            const dateStr = formatMsgDate(msg.createdAt);
                            let showDate = false;
                            if (dateStr !== lastDateStr) { showDate = true; lastDateStr = dateStr; }
                            return (
                              <React.Fragment key={msg.id}>
                                {showDate && (
                                  <div className="flex justify-center my-3">
                                    <span className="text-[10px] bg-gray-200 text-gray-500 px-3 py-1 rounded-full font-bold">{dateStr}</span>
                                  </div>
                                )}
                                <div className={`flex ${isAdmin ? 'justify-end' : 'justify-start'} mb-1`}>
                                  <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl ${
                                    isAdmin
                                      ? 'bg-primary text-white rounded-br-md'
                                      : 'bg-white text-gray-900 border border-gray-100 rounded-bl-md'
                                  }`}>
                                    <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
                                    <p className={`text-[10px] mt-1 ${isAdmin ? 'text-white/60' : 'text-gray-400'} text-right`}>{formatMsgTime(msg.createdAt)}</p>
                                  </div>
                                </div>
                              </React.Fragment>
                            );
                          })
                        )}
                        <div ref={supportBottomRef} />
                      </div>

                      {/* Input */}
                      <div className="px-4 py-3 border-t border-gray-100 bg-white">
                        <div className="flex items-end gap-2">
                          <textarea
                            value={supportInput}
                            onChange={(e) => setSupportInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendSupportMsg(); } }}
                            placeholder={activeChat?.status === 'closed' ? 'Conversación cerrada...' : 'Escribe tu respuesta...'}
                            disabled={activeChat?.status === 'closed'}
                            rows={1}
                            className="flex-1 resize-none border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 max-h-24 disabled:bg-gray-50 disabled:text-gray-400"
                          />
                          <button
                            onClick={handleSendSupportMsg}
                            disabled={!supportInput.trim() || sendingSupportMsg || activeChat?.status === 'closed'}
                            className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center hover:bg-primary/90 transition-all disabled:opacity-40"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal de Edición de Negocio */}
        {editingBusiness && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-black font-display tracking-tight">Editar Negocio</h3>
                  <button
                    onClick={handleCloseEditModal}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSaveEdit} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Nombre del Negocio</label>
                      <input
                        type="text"
                        required
                        value={editForm.name}
                        onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Email</label>
                      <input
                        type="email"
                        required
                        value={editForm.email}
                        onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Teléfono</label>
                      <input
                        type="tel"
                        value={editForm.phone}
                        onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">WhatsApp</label>
                      <input
                        type="tel"
                        value={editForm.whatsapp}
                        onChange={(e) => setEditForm({...editForm, whatsapp: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Categoría</label>
                      <select
                        value={editForm.category}
                        onChange={(e) => setEditForm({...editForm, category: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      >
                        <option value="">Seleccionar categoría</option>
                        <option value="Comida Rápida">Comida Rápida</option>
                        <option value="Hamburguesas">Hamburguesas</option>
                        <option value="Sándwich">Sándwich</option>
                        <option value="Pizzería">Pizzería</option>
                        <option value="Comida Dominicana">Comida Dominicana</option>
                        <option value="Postres">Postres</option>
                        <option value="Bebidas">Bebidas</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Dirección</label>
                      <input
                        type="text"
                        value={editForm.address}
                        onChange={(e) => setEditForm({...editForm, address: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Ubicaci�n del negocio</label>
                    <BusinessLocationPicker
                      value={editForm.location}
                      onChange={(coords) => setEditForm({ ...editForm, location: coords })}
                      editable
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Costo de Delivery (RD$)</label>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={editForm.deliveryFee}
                      onChange={(e) => setEditForm({ ...editForm, deliveryFee: Number(e.target.value) || 0 })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">URL de Imagen</label>
                    <input
                      type="url"
                      value={editForm.image}
                      onChange={(e) => setEditForm({...editForm, image: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      placeholder="https://ejemplo.com/imagen.jpg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Nueva Contraseña
                      <span className="text-xs text-gray-400 ml-2">(Dejar en blanco para mantener actual)</span>
                    </label>
                    <input
                      type="password"
                      value={editForm.password}
                      onChange={(e) => setEditForm({...editForm, password: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      placeholder="Ingresar solo si deseas cambiarla"
                    />
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button
                      type="submit"
                      className="flex-1 bg-primary text-white py-4 rounded-2xl font-bold hover:bg-primary/90 transition-all"
                    >
                      💾 Guardar Cambios
                    </button>
                    <button
                      type="button"
                      onClick={handleCloseEditModal}
                      className="flex-1 bg-gray-100 text-gray-700 py-4 rounded-2xl font-bold hover:bg-gray-200 transition-all"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminView;




