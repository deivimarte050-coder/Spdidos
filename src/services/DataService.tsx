import { User, UserRole, WeeklyBusinessSchedule, TransferBankAccount } from '../types';

// Interfaces para los datos
export interface Business {
  id: string;
  name: string;
  email: string;
  phone: string;
  whatsapp: string;
  category: string;
  rating: number;
  status: 'active' | 'inactive' | 'pending';
  createdAt: string;
  totalOrders: number;
  totalRevenue: number;
  address: string;
  image: string;
  deliveryFee?: number;
  openingTime?: string;
  closingTime?: string;
  weeklySchedule?: Partial<WeeklyBusinessSchedule>;
  transferBankAccounts?: TransferBankAccount[];
  transferBankName?: string;
  transferAccountNumber?: string;
  transferAccountHolder?: string;
  location?: [number, number];
  latitude?: number;
  longitude?: number;
  menu?: MenuItem[];
}

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  description: string;
  category?: string;
  available: boolean;
  image?: string;
}

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  businessId: string;
  businessName: string;
  businessEmail: string;
  businessPhone: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  status: 'pending' | 'preparing' | 'ready' | 'picked_up' | 'delivered' | 'cancelled';
  paymentMethod: 'cash' | 'card' | 'transfer';
  createdAt: string;
  deliveryTime?: string;
  deliveryAddress?: string;
  deliveryInstructions?: string;
  assignedDeliveryId?: string;
  tracking?: {
    preparing?: string;
    ready?: string;
    picked_up?: string;
    delivered?: string;
  };
}

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
}

export interface DeliveryPerson {
  id: string;
  name: string;
  email: string;
  phone: string;
  whatsapp: string;
  status: 'active' | 'inactive' | 'busy';
  currentOrderId?: string;
  totalDeliveries: number;
  rating: number;
  vehicle?: string;
  plateNumber?: string;
}

// Servicio centralizado de datos
class DataService {
  private static instance: DataService;
  private listeners: Set<() => void> = new Set();

  private constructor() {}

  static getInstance(): DataService {
    if (!DataService.instance) {
      DataService.instance = new DataService();
    }
    return DataService.instance;
  }

  // Notificar a todos los listeners
  private notify() {
    this.listeners.forEach(listener => listener());
  }

  // Suscribirse a cambios
  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Métodos para Usuarios
  getUsers(): User[] {
    return JSON.parse(localStorage.getItem('delivery_users_db') || '[]');
  }

  saveUsers(users: User[]) {
    localStorage.setItem('delivery_users_db', JSON.stringify(users));
    this.notify();
  }

  addUser(userData: Omit<User, 'id'>) {
    const users = this.getUsers();
    const newUser: User = {
      ...userData,
      id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    users.push(newUser);
    this.saveUsers(users);
    return newUser;
  }

  updateUser(id: string, updates: Partial<User>) {
    const users = this.getUsers();
    const index = users.findIndex(u => u.id === id);
    if (index !== -1) {
      users[index] = { ...users[index], ...updates };
      this.saveUsers(users);
    }
  }

  deleteUser(id: string) {
    const users = this.getUsers();
    const filteredUsers = users.filter(u => u.id !== id);
    this.saveUsers(filteredUsers);
  }

  // Métodos para Negocios
  getBusinesses(): Business[] {
    return JSON.parse(localStorage.getItem('spdidos_businesses') || '[]');
  }

  saveBusinesses(businesses: Business[]) {
    localStorage.setItem('spdidos_businesses', JSON.stringify(businesses));
    this.notify();
  }

  addBusiness(businessData: Omit<Business, 'id' | 'createdAt' | 'totalOrders' | 'totalRevenue' | 'status'>) {
    const businesses = this.getBusinesses();
    const newBusiness: Business = {
      ...businessData,
      id: `business_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      totalOrders: 0,
      totalRevenue: 0,
      status: 'pending',
      deliveryFee: (businessData as any).deliveryFee ?? 50,
      menu: [
        {
          id: `${Date.now()}_1`,
          name: 'Producto del Día',
          price: 250,
          description: 'Delicioso producto preparado con ingredientes frescos',
          category: 'Especialidades',
          available: true
        },
        {
          id: `${Date.now()}_2`,
          name: 'Bebida',
          price: 50,
          description: 'Refresco del día',
          category: 'Bebidas',
          available: true
        }
      ]
    };
    businesses.push(newBusiness);
    this.saveBusinesses(businesses);
    
    // Crear usuario de negocio automáticamente
    const businessPassword = (businessData as any).password || `SP${Date.now().toString().slice(-6)}`;
    this.addUser({
      name: businessData.name,
      email: businessData.email,
      password: businessPassword, // Usar la contraseña del formulario o generar una
      whatsapp: businessData.whatsapp,
      role: 'business'
    });

    return newBusiness;
  }

  updateBusiness(id: string, updates: Partial<Business>) {
    const businesses = this.getBusinesses();
    const index = businesses.findIndex(b => b.id === id);
    if (index !== -1) {
      businesses[index] = { ...businesses[index], ...updates };
      this.saveBusinesses(businesses);
    }
  }

  deleteBusiness(id: string) {
    const businesses = this.getBusinesses();
    const filteredBusinesses = businesses.filter(b => b.id !== id);
    this.saveBusinesses(filteredBusinesses);
  }

  // Métodos para Pedidos
  getOrders(): Order[] {
    return JSON.parse(localStorage.getItem('spdidos_orders') || '[]');
  }

  saveOrders(orders: Order[]) {
    localStorage.setItem('spdidos_orders', JSON.stringify(orders));
    this.notify();
  }

  addOrder(orderData: Omit<Order, 'id' | 'createdAt'>) {
    const orders = this.getOrders();
    const newOrder: Order = {
      ...orderData,
      id: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString()
    };
    orders.push(newOrder);
    this.saveOrders(orders);
    return newOrder;
  }

  updateOrder(id: string, updates: Partial<Order>) {
    const orders = this.getOrders();
    const index = orders.findIndex(o => o.id === id);
    if (index !== -1) {
      orders[index] = { 
        ...orders[index], 
        ...updates,
        tracking: {
          ...orders[index].tracking,
          ...updates.tracking
        }
      };
      this.saveOrders(orders);
    }
  }

  deleteOrder(id: string) {
    const orders = this.getOrders();
    const filteredOrders = orders.filter(o => o.id !== id);
    this.saveOrders(filteredOrders);
  }

  // Métodos para Repartidores
  getDeliveryPersons(): DeliveryPerson[] {
    return JSON.parse(localStorage.getItem('spdidos_delivery_persons') || '[]');
  }

  saveDeliveryPersons(persons: DeliveryPerson[]) {
    localStorage.setItem('spdidos_delivery_persons', JSON.stringify(persons));
    this.notify();
  }

  addDeliveryPerson(personData: Omit<DeliveryPerson, 'id' | 'totalDeliveries' | 'rating'>) {
    const persons = this.getDeliveryPersons();
    const newPerson: DeliveryPerson = {
      ...personData,
      id: `delivery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      totalDeliveries: 0,
      rating: 5.0
    };
    persons.push(newPerson);
    this.saveDeliveryPersons(persons);
    return newPerson;
  }

  updateDeliveryPerson(id: string, updates: Partial<DeliveryPerson>) {
    const persons = this.getDeliveryPersons();
    const index = persons.findIndex(p => p.id === id);
    if (index !== -1) {
      persons[index] = { ...persons[index], ...updates };
      this.saveDeliveryPersons(persons);
    }
  }

  // Métodos de utilidad
  getBusinessById(id: string): Business | undefined {
    return this.getBusinesses().find(b => b.id === id);
  }

  getUserById(id: string): User | undefined {
    return this.getUsers().find(u => u.id === id);
  }

  getOrderById(id: string): Order | undefined {
    return this.getOrders().find(o => o.id === id);
  }

  getOrdersByBusiness(businessId: string): Order[] {
    return this.getOrders().filter(o => o.businessId === businessId);
  }

  getOrdersByCustomer(customerId: string): Order[] {
    return this.getOrders().filter(o => o.customerId === customerId);
  }

  getOrdersByDelivery(deliveryId: string): Order[] {
    return this.getOrders().filter(o => o.assignedDeliveryId === deliveryId);
  }

  // Estadísticas
  getStats() {
    const businesses = this.getBusinesses();
    const users = this.getUsers();
    const orders = this.getOrders();
    const deliveryPersons = this.getDeliveryPersons();

    return {
      totalBusinesses: businesses.length,
      activeBusinesses: businesses.filter(b => b.status === 'active').length,
      totalUsers: users.length,
      activeUsers: users.filter(u => u.role === 'client').length,
      totalOrders: orders.length,
      completedOrders: orders.filter(o => o.status === 'delivered').length,
      totalRevenue: orders.reduce((sum, o) => sum + o.total, 0),
      totalDeliveryPersons: deliveryPersons.length,
      activeDeliveryPersons: deliveryPersons.filter(d => d.status === 'active').length
    };
  }

  // Inicializar datos de ejemplo
  initializeSampleData() {
    if (this.getBusinesses().length === 0) {
      // Negocios de ejemplo
      const sampleBusinesses: Omit<Business, 'id' | 'createdAt' | 'totalOrders' | 'totalRevenue' | 'status'>[] = [
        {
          name: 'Burger Palace',
          email: 'burger@palace.com',
          phone: '809-555-0101',
          whatsapp: '809-555-0101',
          category: 'Comida Rápida',
          rating: 4.5,
          address: 'Calle Principal #123, San Pedro de Macorís',
          image: 'https://picsum.photos/seed/burger/300/200',
          menu: [
            {
              id: '1',
              name: 'Hamburguesa Clásica',
              price: 250,
              description: 'Carne, lechuga, tomate, cebolla',
              category: 'Hamburguesas',
              available: true
            },
            {
              id: '2',
              name: 'Papas Fritas',
              price: 100,
              description: 'Porción grande de papas crujientes',
              category: 'Acompañamientos',
              available: true
            }
          ]
        },
        {
          name: 'Pizza Express',
          email: 'pizza@express.com',
          phone: '809-555-0102',
          whatsapp: '809-555-0102',
          category: 'Pizzería',
          rating: 4.8,
          address: 'Avenida Central #456, San Pedro de Macorís',
          image: 'https://picsum.photos/seed/pizza/300/200',
          menu: [
            {
              id: '3',
              name: 'Pizza Pepperoni',
              price: 450,
              description: 'Pizza con pepperoni y queso mozzarella',
              category: 'Pizzas',
              available: true
            }
          ]
        }
      ];

      sampleBusinesses.forEach(business => this.addBusiness(business));
    }

    if (this.getDeliveryPersons().length === 0) {
      // Repartidores de ejemplo
      const sampleDeliveryPersons: Omit<DeliveryPerson, 'id' | 'totalDeliveries' | 'rating'>[] = [
        {
          name: 'Carlos Rodríguez',
          email: 'carlos@delivery.com',
          phone: '809-123-4567',
          whatsapp: '809-123-4567',
          status: 'active',
          vehicle: 'Motocicleta',
          plateNumber: 'A123456'
        },
        {
          name: 'María García',
          email: 'maria@delivery.com',
          phone: '809-987-6543',
          whatsapp: '809-987-6543',
          status: 'active',
          vehicle: 'Motocicleta',
          plateNumber: 'B789012'
        }
      ];

      sampleDeliveryPersons.forEach(person => this.addDeliveryPerson(person));
    }
  }
}

export default DataService.getInstance();
