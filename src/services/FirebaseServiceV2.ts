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
  DocumentData,
  setDoc
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

class FirebaseServiceV2 {
  private listeners: Set<() => void> = new Set();
  private isConnected: boolean = false;

  // ============ USUARIOS ============
  
  async getUsers(): Promise<any[]> {
    try {
      console.log('🔍 [FirebaseV2] Obteniendo usuarios...');
      const querySnapshot = await getDocs(collection(db, COLLECTIONS.USERS));
      const users = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...convertTimestamp(doc.data())
      }));
      console.log(`✅ [FirebaseV2] ${users.length} usuarios encontrados`);
      return users;
    } catch (error: any) {
      console.error('❌ [FirebaseV2] Error obteniendo usuarios:', error);
      console.error('Código de error:', error.code);
      throw error;
    }
  }

  async addUser(userData: any): Promise<any> {
    try {
      console.log('[FirebaseV2] ➕ Agregando usuario:', userData.email);
      console.log('[FirebaseV2] Datos completos:', JSON.stringify(userData, null, 2));
      
      // Usar addDoc para crear documento con ID automático
      const docRef = await addDoc(collection(db, COLLECTIONS.USERS), {
        ...userData,
        createdAt: Timestamp.now(),
        source: 'app_v2'
      });
      
      console.log('✅ [FirebaseV2] Usuario agregado con ID:', docRef.id);
      
      return { id: docRef.id, ...userData };
    } catch (error: any) {
      console.error('❌ [FirebaseV2] Error agregando usuario:', error);
      console.error('Código de error:', error.code);
      console.error('Mensaje:', error.message);
      throw error;
    }
  }

  // ============ NEGOCIOS ============
  
  async getBusinesses(): Promise<any[]> {
    try {
      console.log('🔍 [FirebaseV2] Obteniendo negocios...');
      const q = query(collection(db, COLLECTIONS.BUSINESSES), orderBy('name'));
      const querySnapshot = await getDocs(q);
      const businesses = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...convertTimestamp(doc.data())
      }));
      console.log(`✅ [FirebaseV2] ${businesses.length} negocios encontrados`);
      return businesses;
    } catch (error: any) {
      console.error('❌ [FirebaseV2] Error obteniendo negocios:', error);
      throw error;
    }
  }

  async addBusiness(businessData: any): Promise<any> {
    try {
      console.log('[FirebaseV2] ➕ Agregando negocio:', businessData.name);
      const docRef = await addDoc(collection(db, COLLECTIONS.BUSINESSES), {
        ...businessData,
        createdAt: Timestamp.now(),
        totalOrders: 0,
        totalRevenue: 0,
        source: 'app_v2'
      });
      console.log('✅ [FirebaseV2] Negocio agregado con ID:', docRef.id);
      return { id: docRef.id, ...businessData };
    } catch (error: any) {
      console.error('❌ [FirebaseV2] Error agregando negocio:', error);
      throw error;
    }
  }

  // ============ PEDIDOS ============
  
  async getOrders(): Promise<any[]> {
    try {
      console.log('🔍 [FirebaseV2] Obteniendo pedidos...');
      const q = query(collection(db, COLLECTIONS.ORDERS), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const orders = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...convertTimestamp(doc.data())
      }));
      console.log(`✅ [FirebaseV2] ${orders.length} pedidos encontrados`);
      return orders;
    } catch (error: any) {
      console.error('❌ [FirebaseV2] Error obteniendo pedidos:', error);
      throw error;
    }
  }

  async addOrder(orderData: any): Promise<any> {
    try {
      console.log('[FirebaseV2] ➕ Agregando pedido...');
      const docRef = await addDoc(collection(db, COLLECTIONS.ORDERS), {
        ...orderData,
        createdAt: Timestamp.now(),
        source: 'app_v2'
      });
      console.log('✅ [FirebaseV2] Pedido agregado con ID:', docRef.id);
      return { id: docRef.id, ...orderData };
    } catch (error: any) {
      console.error('❌ [FirebaseV2] Error agregando pedido:', error);
      throw error;
    }
  }

  // ============ REPARTIDORES ============
  
  async getDeliveryPersons(): Promise<any[]> {
    try {
      console.log('🔍 [FirebaseV2] Obteniendo repartidores...');
      const querySnapshot = await getDocs(collection(db, COLLECTIONS.DELIVERY_PERSONS));
      const deliveryPersons = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...convertTimestamp(doc.data())
      }));
      console.log(`✅ [FirebaseV2] ${deliveryPersons.length} repartidores encontrados`);
      return deliveryPersons;
    } catch (error: any) {
      console.error('❌ [FirebaseV2] Error obteniendo repartidores:', error);
      throw error;
    }
  }

  // ============ TEST DE CONEXIÓN ============
  
  async testConnection(): Promise<boolean> {
    try {
      console.log('🧪 [FirebaseV2] Probando conexión...');
      await getDocs(collection(db, COLLECTIONS.USERS));
      console.log('✅ [FirebaseV2] Conexión exitosa');
      this.isConnected = true;
      return true;
    } catch (error: any) {
      console.error('❌ [FirebaseV2] Error de conexión:', error);
      console.error('Código:', error.code);
      this.isConnected = false;
      return false;
    }
  }

  // ============ DATOS DE EJEMPLO ============
  
  async initializeSampleData(): Promise<void> {
    try {
      console.log('🔄 [FirebaseV2] Verificando datos de ejemplo...');
      
      // Verificar si ya hay negocios
      const businesses = await this.getBusinesses();
      if (businesses.length > 0) {
        console.log('✅ [FirebaseV2] Ya existen datos');
        return;
      }

      console.log('📝 [FirebaseV2] Creando datos de ejemplo...');

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

      console.log('✅ [FirebaseV2] Datos de ejemplo creados');
    } catch (error) {
      console.error('❌ [FirebaseV2] Error inicializando datos:', error);
    }
  }
}

export default new FirebaseServiceV2();
