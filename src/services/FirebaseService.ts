import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  onSnapshot,
  Timestamp,
  DocumentData
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { User, Order } from '../types';

// Colecciones de Firestore
const COLLECTIONS = {
  USERS: 'users',
  BUSINESSES: 'businesses',
  ORDERS: 'orders',
  DELIVERY_PERSONS: 'deliveryPersons'
};

// Helper para convertir Timestamp a string
const convertTimestamp = (data: any): any => {
  if (!data) return data;
  
  const converted = { ...data };
  
  // Convertir createdAt si es Timestamp
  if (data.createdAt instanceof Timestamp) {
    converted.createdAt = data.createdAt.toDate().toISOString();
  } else if (data.createdAt && typeof data.createdAt === 'object' && data.createdAt.toDate) {
    converted.createdAt = data.createdAt.toDate().toISOString();
  }
  
  return converted;
};

class FirebaseService {
  private listeners: Set<() => void> = new Set();
  private isConnected: boolean = false;

  // ============ USUARIOS ============
  
  async getUsers(): Promise<any[]> {
    try {
      console.log('🔍 Obteniendo usuarios de Firebase...');
      const querySnapshot = await getDocs(collection(db, COLLECTIONS.USERS));
      const users = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...convertTimestamp(doc.data())
      }));
      console.log(`✅ ${users.length} usuarios encontrados`);
      return users;
    } catch (error) {
      console.error('❌ Error obteniendo usuarios:', error);
      throw error;
    }
  }

  async addUser(userData: Omit<User, 'id'>): Promise<any> {
    try {
      console.log('➕ Agregando usuario a Firebase:', userData.email);
      const docRef = await addDoc(collection(db, COLLECTIONS.USERS), {
        ...userData,
        createdAt: Timestamp.now()
      });
      console.log('✅ Usuario agregado con ID:', docRef.id);
      return { id: docRef.id, ...userData };
    } catch (error) {
      console.error('❌ Error agregando usuario:', error);
      throw error;
    }
  }

  // ============ NEGOCIOS ============
  
  async getBusinesses(): Promise<any[]> {
    try {
      console.log('🔍 Obteniendo negocios de Firebase...');
      const q = query(collection(db, COLLECTIONS.BUSINESSES), orderBy('name'));
      const querySnapshot = await getDocs(q);
      const businesses = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...convertTimestamp(doc.data())
      }));
      console.log(`✅ ${businesses.length} negocios encontrados`);
      return businesses;
    } catch (error) {
      console.error('❌ Error obteniendo negocios:', error);
      throw error;
    }
  }

  async addBusiness(businessData: any): Promise<any> {
    try {
      console.log('➕ Agregando negocio a Firebase:', businessData.name);
      const docRef = await addDoc(collection(db, COLLECTIONS.BUSINESSES), {
        ...businessData,
        createdAt: Timestamp.now(),
        totalOrders: 0,
        totalRevenue: 0
      });
      console.log('✅ Negocio agregado con ID:', docRef.id);
      return { id: docRef.id, ...businessData };
    } catch (error) {
      console.error('❌ Error agregando negocio:', error);
      throw error;
    }
  }

  async updateBusiness(businessId: string, data: any): Promise<void> {
    try {
      console.log('🔄 Actualizando negocio:', businessId);
      const docRef = doc(db, COLLECTIONS.BUSINESSES, businessId);
      await updateDoc(docRef, data);
      console.log('✅ Negocio actualizado');
    } catch (error) {
      console.error('❌ Error actualizando negocio:', error);
      throw error;
    }
  }

  // ============ PEDIDOS ============
  
  async getOrders(): Promise<any[]> {
    try {
      console.log('🔍 Obteniendo pedidos de Firebase...');
      const q = query(collection(db, COLLECTIONS.ORDERS), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const orders = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...convertTimestamp(doc.data())
      }));
      console.log(`✅ ${orders.length} pedidos encontrados`);
      return orders;
    } catch (error) {
      console.error('❌ Error obteniendo pedidos:', error);
      throw error;
    }
  }

  async addOrder(orderData: Omit<Order, 'id' | 'createdAt'>): Promise<any> {
    try {
      console.log('➕ Agregando pedido a Firebase...');
      const docRef = await addDoc(collection(db, COLLECTIONS.ORDERS), {
        ...orderData,
        createdAt: Timestamp.now()
      });
      console.log('✅ Pedido agregado con ID:', docRef.id);
      return { id: docRef.id, ...orderData };
    } catch (error) {
      console.error('❌ Error agregando pedido:', error);
      throw error;
    }
  }

  async updateOrder(orderId: string, data: any): Promise<void> {
    try {
      console.log('🔄 Actualizando pedido:', orderId);
      const docRef = doc(db, COLLECTIONS.ORDERS, orderId);
      await updateDoc(docRef, data);
      console.log('✅ Pedido actualizado');
    } catch (error) {
      console.error('❌ Error actualizando pedido:', error);
      throw error;
    }
  }

  // ============ REPARTIDORES ============
  
  async getDeliveryPersons(): Promise<any[]> {
    try {
      console.log('🔍 Obteniendo repartidores de Firebase...');
      const querySnapshot = await getDocs(collection(db, COLLECTIONS.DELIVERY_PERSONS));
      const deliveryPersons = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...convertTimestamp(doc.data())
      }));
      console.log(`✅ ${deliveryPersons.length} repartidores encontrados`);
      return deliveryPersons;
    } catch (error) {
      console.error('❌ Error obteniendo repartidores:', error);
      throw error;
    }
  }

  // ============ SUSCRIPCIONES EN TIEMPO REAL ============
  
  subscribeToOrders(callback: (orders: any[]) => void): () => void {
    console.log('👂 Suscribiendo a cambios en pedidos...');
    const q = query(collection(db, COLLECTIONS.ORDERS), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const orders = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...convertTimestamp(doc.data())
      }));
      console.log(`📊 ${orders.length} pedidos actualizados en tiempo real`);
      callback(orders);
    }, (error) => {
      console.error('❌ Error en suscripción de pedidos:', error);
    });

    return unsubscribe;
  }

  subscribeToBusinesses(callback: (businesses: any[]) => void): () => void {
    console.log('👂 Suscribiendo a cambios en negocios...');
    const q = query(collection(db, COLLECTIONS.BUSINESSES), orderBy('name'));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const businesses = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...convertTimestamp(doc.data())
      }));
      console.log(`📊 ${businesses.length} negocios actualizados en tiempo real`);
      callback(businesses);
    }, (error) => {
      console.error('❌ Error en suscripción de negocios:', error);
    });

    return unsubscribe;
  }

  // ============ MÉTODOS DE UTILIDAD ============
  
  async testConnection(): Promise<boolean> {
    try {
      console.log('🧪 Probando conexión a Firebase...');
      await getDocs(collection(db, COLLECTIONS.USERS));
      console.log('✅ Conexión a Firebase exitosa');
      this.isConnected = true;
      return true;
    } catch (error) {
      console.error('❌ Error de conexión a Firebase:', error);
      this.isConnected = false;
      return false;
    }
  }

  isFirebaseConnected(): boolean {
    return this.isConnected;
  }

  // ============ DATOS DE EJEMPLO ============
  
  async initializeSampleData(): Promise<void> {
    try {
      console.log('🔄 Verificando datos de ejemplo...');
      
      // Verificar si ya hay negocios
      const businesses = await this.getBusinesses();
      if (businesses.length > 0) {
        console.log('✅ Ya existen datos, no es necesario inicializar');
        return;
      }

      console.log('📝 Creando datos de ejemplo...');

      // Crear negocios de ejemplo
      const sampleBusinesses = [
        {
          name: 'Burger Palace',
          email: 'burger@palace.com',
          phone: '809-555-0101',
          whatsapp: '809-555-0101',
          category: 'Comida Rápida',
          rating: 4.5,
          status: 'active',
          address: 'Calle Principal #123',
          image: 'https://picsum.photos/seed/burger/300/200',
          menu: [
            { id: '1-1', name: 'Whopper', description: 'La clásica hamburguesa', price: 350, available: true },
            { id: '1-2', name: 'Papas Fritas', description: 'Papas crujientes', price: 150, available: true }
          ]
        },
        {
          name: 'Pizza Roma',
          email: 'pizza@roma.com',
          phone: '809-555-0102',
          whatsapp: '809-555-0102',
          category: 'Pizza',
          rating: 4.3,
          status: 'active',
          address: 'Avenida Central #456',
          image: 'https://picsum.photos/seed/pizza/300/200',
          menu: [
            { id: '2-1', name: 'Pizza Margarita', description: 'Salsa de tomate y queso mozzarella', price: 450, available: true },
            { id: '2-2', name: 'Pizza Pepperoni', description: 'Con pepperoni y queso', price: 550, available: true }
          ]
        }
      ];

      for (const business of sampleBusinesses) {
        await this.addBusiness(business);
      }

      console.log('✅ Datos de ejemplo creados');
    } catch (error) {
      console.error('❌ Error inicializando datos:', error);
    }
  }
}

export default new FirebaseService();
