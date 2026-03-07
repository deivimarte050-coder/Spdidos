import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  serverTimestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase/config';
import { User, Business, Order, DeliveryPerson } from '../types';

class SimpleFirebaseService {
  private static instance: SimpleFirebaseService;
  private listeners: Set<() => void> = new Set();

  private constructor() {}

  static getInstance(): SimpleFirebaseService {
    if (!SimpleFirebaseService.instance) {
      SimpleFirebaseService.instance = new SimpleFirebaseService();
    }
    return SimpleFirebaseService.instance;
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

  // ==================== USUARIOS ====================
  async getUsers(): Promise<User[]> {
    const usersSnapshot = await getDocs(collection(db, 'users'));
    return usersSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        createdAt: data.createdAt?.toDate?.()?.toISOString?.() || new Date().toISOString()
      } as User;
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
      return {
        ...data,
        id: doc.id,
        createdAt: data.createdAt?.toDate?.()?.toISOString?.() || new Date().toISOString()
      } as Business;
    });
  }

  async addBusiness(businessData: Omit<Business, 'id' | 'createdAt' | 'totalOrders' | 'totalRevenue' | 'status'>): Promise<Business> {
    const businessWithTimestamp = {
      ...businessData,
      createdAt: serverTimestamp(),
      status: 'pending',
      totalOrders: 0,
      totalRevenue: 0
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
    await updateDoc(doc(db, 'businesses', id), updates);
    this.notify();
  }

  // ==================== PEDIDOS ====================
  async getOrders(): Promise<Order[]> {
    const ordersSnapshot = await getDocs(collection(db, 'orders'));
    return ordersSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        createdAt: data.createdAt?.toDate?.()?.toISOString?.() || new Date().toISOString()
      } as Order;
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
    await updateDoc(doc(db, 'orders', id), updates);
    this.notify();
  }

  // ==================== DELIVERY PERSONS ====================
  async getDeliveryPersons(): Promise<DeliveryPerson[]> {
    const deliverySnapshot = await getDocs(collection(db, 'deliveryPersons'));
    return deliverySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        createdAt: data.createdAt?.toDate?.()?.toISOString?.() || new Date().toISOString()
      } as DeliveryPerson;
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

export default SimpleFirebaseService.getInstance();
