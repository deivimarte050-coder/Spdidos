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

export interface HomeAnnouncement {
  topText: string;
  highlightText: string;
  ctaText: string;
  imageUrl: string;
  updatedAt?: string;
}

// Colecciones de Firestore
const COLLECTIONS = {
  USERS: 'users',
  BUSINESSES: 'businesses',
  ORDERS: 'orders',
  DELIVERY_PERSONS: 'deliveryPersons',
  DELIVERY_EARNINGS: 'delivery_earnings',
  DELIVERY_LOCATIONS: 'delivery_locations',
  CLIENT_LOCATIONS: 'client_locations',
  FCM_TOKENS: 'fcm_tokens',
  SETTINGS: 'settings'
};

const DEFAULT_HOME_ANNOUNCEMENT: HomeAnnouncement = {
  topText: '¡Hace hasta un',
  highlightText: '50% DCTO!',
  ctaText: 'PEDIR YA',
  imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&h=320&fit=crop&crop=center',
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

  async updateBusiness(id: string, businessData: any): Promise<any> {
    try {
      console.log('[FirebaseV2] 📝 Actualizando negocio:', id);
      const businessRef = doc(db, COLLECTIONS.BUSINESSES, id);
      await setDoc(businessRef, {
        ...businessData,
        updatedAt: Timestamp.now()
      }, { merge: true });
      console.log('✅ [FirebaseV2] Negocio actualizado:', id);
      return { id, ...businessData };
    } catch (error: any) {
      console.error('❌ [FirebaseV2] Error actualizando negocio:', error);
      throw error;
    }
  }

  async deleteBusiness(id: string): Promise<void> {
    try {
      console.log('[FirebaseV2] 🗑️ Eliminando negocio:', id);
      const businessRef = doc(db, COLLECTIONS.BUSINESSES, id);
      await deleteDoc(businessRef);
      console.log('✅ [FirebaseV2] Negocio eliminado:', id);
    } catch (error: any) {
      console.error('❌ [FirebaseV2] Error eliminando negocio:', error);
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

  async updateOrder(id: string, data: any): Promise<void> {
    try {
      const orderRef = doc(db, COLLECTIONS.ORDERS, id);
      await updateDoc(orderRef, { ...data, updatedAt: Timestamp.now() });
    } catch (error: any) {
      console.error('❌ [FirebaseV2] Error actualizando pedido:', error);
      throw error;
    }
  }

  subscribeToOrders(callback: (orders: any[]) => void): () => void {
    const q = query(collection(db, COLLECTIONS.ORDERS), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      const orders = snap.docs.map(d => ({ id: d.id, ...convertTimestamp(d.data()) }));
      callback(orders);
    }, (err) => console.error('❌ [FirebaseV2] subscribeToOrders error:', err));
  }

  subscribeToBusinessOrders(businessId: string, callback: (orders: any[]) => void): () => void {
    const q = query(
      collection(db, COLLECTIONS.ORDERS),
      where('businessId', '==', businessId)
    );
    return onSnapshot(q, (snap) => {
      const orders = snap.docs
        .map(d => ({ id: d.id, ...convertTimestamp(d.data()) }))
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callback(orders);
    }, (err) => console.error('❌ [FirebaseV2] subscribeToBusinessOrders error:', err));
  }

  subscribeToClientOrders(clientId: string, callback: (orders: any[]) => void): () => void {
    const q = query(
      collection(db, COLLECTIONS.ORDERS),
      where('clientId', '==', clientId)
    );
    return onSnapshot(q, (snap) => {
      const orders = snap.docs
        .map(d => ({ id: d.id, ...convertTimestamp(d.data()) }))
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callback(orders);
    }, (err) => console.error('❌ [FirebaseV2] subscribeToClientOrders error:', err));
  }

  subscribeToDeliveryOrders(callback: (orders: any[]) => void): () => void {
    const q = query(
      collection(db, COLLECTIONS.ORDERS),
      where('status', 'in', ['ready', 'on_the_way', 'arrived'])
    );
    return onSnapshot(q, (snap) => {
      const orders = snap.docs
        .map(d => ({ id: d.id, ...convertTimestamp(d.data()) }))
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callback(orders);
    }, (err) => console.error('❌ [FirebaseV2] subscribeToDeliveryOrders error:', err));
  }

  async updateDeliveryLocation(orderId: string, lat: number, lng: number): Promise<void> {
    try {
      const locRef = doc(db, COLLECTIONS.DELIVERY_LOCATIONS, orderId);
      await setDoc(locRef, { lat, lng, updatedAt: Timestamp.now() }, { merge: true });
    } catch (error: any) {
      console.error('❌ [FirebaseV2] Error actualizando ubicación:', error);
    }
  }

  subscribeToDeliveryLocation(orderId: string, callback: (loc: { lat: number; lng: number } | null) => void): () => void {
    const locRef = doc(db, COLLECTIONS.DELIVERY_LOCATIONS, orderId);
    return onSnapshot(locRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        callback({ lat: data.lat, lng: data.lng });
      } else {
        callback(null);
      }
    }, (err) => console.error('❌ [FirebaseV2] subscribeToDeliveryLocation error:', err));
  }

  async updateClientLocation(orderId: string, lat: number, lng: number, address?: string): Promise<void> {
    try {
      const locRef = doc(db, COLLECTIONS.CLIENT_LOCATIONS, orderId);
      await setDoc(locRef, { lat, lng, address: address || '', updatedAt: Timestamp.now() }, { merge: true });
      // Also update on the order document for easier access
      const orderRef = doc(db, COLLECTIONS.ORDERS, orderId);
      await updateDoc(orderRef, { clientLocation: { lat, lng }, clientAddress: address || '' });
    } catch (error: any) {
      console.error('❌ [FirebaseV2] Error actualizando ubicación cliente:', error);
    }
  }

  subscribeToClientLocation(orderId: string, callback: (loc: { lat: number; lng: number; address?: string } | null) => void): () => void {
    const locRef = doc(db, COLLECTIONS.CLIENT_LOCATIONS, orderId);
    return onSnapshot(locRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        callback({ lat: data.lat, lng: data.lng, address: data.address });
      } else {
        callback(null);
      }
    }, (err) => console.error('❌ [FirebaseV2] subscribeToClientLocation error:', err));
  }

  async upsertDeliveryEarningEntry(deliveryId: string, orderId: string, amount: number, deliveredAt: string): Promise<void> {
    try {
      const deliveredDate = new Date(deliveredAt);
      const safeDate = Number.isFinite(deliveredDate.getTime()) ? deliveredDate : new Date();
      const dateKey = safeDate.toISOString().slice(0, 10);
      const earningRef = doc(db, COLLECTIONS.DELIVERY_EARNINGS, `${deliveryId}_${orderId}`);
      await setDoc(earningRef, {
        deliveryId,
        orderId,
        amount: Number.isFinite(amount) ? Math.max(0, amount) : 0,
        deliveredAt: safeDate.toISOString(),
        dateKey,
        updatedAt: Timestamp.now(),
      }, { merge: true });
    } catch (error: any) {
      console.error('❌ [FirebaseV2] Error guardando ganancia de delivery:', error);
      throw error;
    }
  }

  subscribeToDeliveryEarnings(deliveryId: string, callback: (entries: any[]) => void): () => void {
    const q = query(
      collection(db, COLLECTIONS.DELIVERY_EARNINGS),
      where('deliveryId', '==', deliveryId)
    );
    return onSnapshot(q, (snap) => {
      const entries = snap.docs
        .map((d) => ({ id: d.id, ...convertTimestamp(d.data()) }))
        .sort((a: any, b: any) => {
          const aTime = new Date(a.deliveredAt || 0).getTime();
          const bTime = new Date(b.deliveredAt || 0).getTime();
          return bTime - aTime;
        });
      callback(entries);
    }, (err) => console.error('❌ [FirebaseV2] subscribeToDeliveryEarnings error:', err));
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

  async updateUserProfile(userId: string, data: Partial<{ name: string; phone: string; whatsapp: string }>): Promise<void> {
    try {
      await updateDoc(doc(db, COLLECTIONS.USERS, userId), data);
    } catch (error) {
      console.error('❌ [FirebaseV2] Error actualizando perfil:', error);
      throw error;
    }
  }

  async getHomeAnnouncement(): Promise<HomeAnnouncement> {
    try {
      const snap = await getDoc(doc(db, COLLECTIONS.SETTINGS, 'home_announcement'));
      if (!snap.exists()) return DEFAULT_HOME_ANNOUNCEMENT;
      return { ...DEFAULT_HOME_ANNOUNCEMENT, ...(snap.data() as HomeAnnouncement) };
    } catch (error) {
      console.error('❌ [FirebaseV2] Error obteniendo anuncio:', error);
      return DEFAULT_HOME_ANNOUNCEMENT;
    }
  }

  async saveHomeAnnouncement(data: HomeAnnouncement): Promise<void> {
    try {
      await setDoc(doc(db, COLLECTIONS.SETTINGS, 'home_announcement'), {
        ...data,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    } catch (error) {
      console.error('❌ [FirebaseV2] Error guardando anuncio:', error);
      throw error;
    }
  }

  subscribeToHomeAnnouncement(callback: (announcement: HomeAnnouncement) => void): () => void {
    const ref = doc(db, COLLECTIONS.SETTINGS, 'home_announcement');
    return onSnapshot(ref, (snap) => {
      const data = snap.exists() ? (snap.data() as HomeAnnouncement) : DEFAULT_HOME_ANNOUNCEMENT;
      callback({ ...DEFAULT_HOME_ANNOUNCEMENT, ...data });
    }, () => {
      callback(DEFAULT_HOME_ANNOUNCEMENT);
    });
  }

  async saveFCMToken(userId: string, token: string, role: string, businessId?: string) {
    try {
      await setDoc(doc(db, COLLECTIONS.FCM_TOKENS, userId), {
        token,
        role,
        userId,
        businessId: businessId || null,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error('[FCM] Error saving token:', err);
    }
  }
}

export default new FirebaseServiceV2();
