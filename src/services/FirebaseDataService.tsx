import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase/config';
import { User, Business, Order, DeliveryPerson } from '../types';

class FirebaseDataService {
  private static instance: FirebaseDataService;
  private listeners: Set<() => void> = new Set();

  private constructor() {}

  static getInstance(): FirebaseDataService {
    if (!FirebaseDataService.instance) {
      FirebaseDataService.instance = new FirebaseDataService();
    }
    return FirebaseDataService.instance;
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

  // Convertir Timestamp a string
  private timestampToString(timestamp: any): string {
    if (timestamp instanceof Timestamp) {
      return timestamp.toDate().toISOString();
    }
    return timestamp || new Date().toISOString();
  }

  // Convertir string a Timestamp
  private stringToTimestamp(date: string | Date) {
    return Timestamp.fromDate(new Date(date));
  }

  // ==================== USUARIOS ====================
  async getUsers(): Promise<User[]> {
    const usersSnapshot = await getDocs(collection(db, 'users'));
    return usersSnapshot.docs.map(doc => {
      const data = doc.data();
      const user: User = {
        id: doc.id,
        name: data.name,
        email: data.email,
        role: data.role,
        whatsapp: data.whatsapp,
        phone: data.phone,
        password: data.password,
        status: data.status,
        createdAt: this.timestampToString(data.createdAt)
      };
      return user;
    });
  }

  async addUser(userData: Omit<User, 'id'>): Promise<User> {
    const userWithTimestamp = {
      ...userData,
      createdAt: serverTimestamp()
    };
    const docRef = await addDoc(collection(db, 'users'), userWithTimestamp);
    const newUser = { 
      id: docRef.id, 
      ...userData,
      createdAt: new Date().toISOString()
    };
    this.notify();
    return newUser;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<void> {
    await updateDoc(doc(db, 'users', id), updates);
    this.notify();
  }

  // ==================== NEGOCIOS ====================
  async getBusinesses(): Promise<Business[]> {
    const businessesSnapshot = await getDocs(collection(db, 'businesses'));
    return businessesSnapshot.docs.map(doc => {
      const data = doc.data();
      const business: Business = {
        id: doc.id,
        name: data.name,
        email: data.email,
        phone: data.phone,
        whatsapp: data.whatsapp,
        category: data.category,
        rating: data.rating,
        address: data.address,
        image: data.image,
        status: data.status,
        menu: data.menu?.map((item: any) => ({
          ...item,
          available: item.available !== false
        })) || [],
        createdAt: this.timestampToString(data.createdAt),
        totalOrders: data.totalOrders,
        totalRevenue: data.totalRevenue
      };
      return business;
    });
  }

  async addBusiness(businessData: Omit<Business, 'id' | 'createdAt' | 'totalOrders' | 'totalRevenue' | 'status'>): Promise<Business> {
    const businessWithTimestamp = {
      ...businessData,
      createdAt: serverTimestamp(),
      status: 'pending',
      totalOrders: 0,
      totalRevenue: 0,
      menu: businessData.menu?.map(item => ({
        ...item,
        available: item.available !== false
      })) || []
    };
    const docRef = await addDoc(collection(db, 'businesses'), businessWithTimestamp);
    const newBusiness = { 
      id: docRef.id, 
      ...businessData,
      createdAt: new Date().toISOString(),
      status: 'pending' as const,
      totalOrders: 0,
      totalRevenue: 0
    };
    this.notify();
    return newBusiness;
  }

  async updateBusiness(id: string, updates: Partial<Business>): Promise<void> {
    const updateData = { ...updates };
    if (updateData.createdAt) {
      updateData.createdAt = this.stringToTimestamp(updateData.createdAt);
    }
    await updateDoc(doc(db, 'businesses', id), updateData);
    this.notify();
  }

  // ==================== PEDIDOS ====================
  async getOrders(): Promise<Order[]> {
    const ordersSnapshot = await getDocs(collection(db, 'orders'));
    return ordersSnapshot.docs.map(doc => {
      const data = doc.data();
      const order: Order = {
        id: doc.id,
        clientId: data.clientId,
        clientName: data.clientName,
        clientEmail: data.clientEmail,
        clientPhone: data.clientPhone,
        clientWhatsapp: data.clientWhatsapp,
        businessId: data.businessId,
        businessName: data.businessName,
        businessEmail: data.businessEmail,
        businessPhone: data.businessPhone,
        deliveryId: data.deliveryId,
        items: data.items,
        subtotal: data.subtotal,
        deliveryFee: data.deliveryFee,
        total: data.total,
        status: data.status,
        paymentMethod: data.paymentMethod,
        deliveryAddress: data.deliveryAddress,
        deliveryInstructions: data.deliveryInstructions,
        createdAt: this.timestampToString(data.createdAt),
        tracking: data.tracking
      };
      return order;
    });
  }

  async addOrder(orderData: Omit<Order, 'id' | 'createdAt'>): Promise<Order> {
    const orderWithTimestamp = {
      ...orderData,
      createdAt: serverTimestamp()
    };
    const docRef = await addDoc(collection(db, 'orders'), orderWithTimestamp);
    const newOrder = { 
      id: docRef.id, 
      ...orderData, 
      createdAt: new Date().toISOString()
    };
    this.notify();
    return newOrder;
  }

  async updateOrder(id: string, updates: Partial<Order>): Promise<void> {
    const updateData = { ...updates };
    if (updateData.createdAt) {
      updateData.createdAt = this.stringToTimestamp(updateData.createdAt);
    }
    await updateDoc(doc(db, 'orders', id), updateData);
    this.notify();
  }

  // ==================== DELIVERY PERSONS ====================
  async getDeliveryPersons(): Promise<DeliveryPerson[]> {
    const deliverySnapshot = await getDocs(collection(db, 'deliveryPersons'));
    return deliverySnapshot.docs.map(doc => {
      const data = doc.data();
      const deliveryPerson: DeliveryPerson = {
        id: doc.id,
        name: data.name,
        email: data.email,
        phone: data.phone,
        whatsapp: data.whatsapp,
        status: data.status,
        currentOrderId: data.currentOrderId,
        rating: data.rating,
        completedOrders: data.completedOrders,
        createdAt: this.timestampToString(data.createdAt),
        plateNumber: data.plateNumber
      };
      return deliveryPerson;
    });
  }

  async addDeliveryPerson(deliveryData: Omit<DeliveryPerson, 'id'>): Promise<DeliveryPerson> {
    const deliveryWithTimestamp = {
      ...deliveryData,
      createdAt: serverTimestamp()
    };
    const docRef = await addDoc(collection(db, 'deliveryPersons'), deliveryWithTimestamp);
    const newDelivery = { 
      id: docRef.id, 
      ...deliveryData,
      createdAt: new Date().toISOString()
    };
    this.notify();
    return newDelivery;
  }

  // ==================== IMÁGENES ====================
  async uploadImage(file: File, path: string): Promise<string> {
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  }

  // ==================== ESTADÍSTICAS ====================
  async getStats() {
    const [usersSnapshot, businessesSnapshot, ordersSnapshot, deliverySnapshot] = await Promise.all([
      getDocs(collection(db, 'users')),
      getDocs(collection(db, 'businesses')),
      getDocs(collection(db, 'orders')),
      getDocs(collection(db, 'deliveryPersons'))
    ]);

    const users = usersSnapshot.docs.map(doc => doc.data() as User);
    const businesses = businessesSnapshot.docs.map(doc => doc.data() as Business);
    const orders = ordersSnapshot.docs.map(doc => doc.data() as Order);
    const deliveryPersons = deliverySnapshot.docs.map(doc => doc.data() as DeliveryPerson);

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

  // ==================== INICIALIZACIÓN ====================
  initializeSampleData() {
    // Firebase no necesita inicialización de datos de ejemplo
    // Los datos se crean cuando se agregan
  }
}

export default FirebaseDataService.getInstance();
