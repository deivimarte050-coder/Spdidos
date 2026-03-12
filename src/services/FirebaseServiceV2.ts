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
  setDoc,
  writeBatch
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadString } from 'firebase/storage';
import { db, storage } from '../firebase/config';
import { User, Order, AppNotification } from '../types';

export interface HomeAnnouncement {
  topText: string;
  highlightText: string;
  ctaText: string;
  imageUrl: string;
  updatedAt?: string;
}

export interface PopupAnnouncement {
  id: string;
  title: string;
  message: string;
  publishedAt: string;
  updatedAt?: string;
  createdBy?: string;
}

// Colecciones de Firestore
const COLLECTIONS = {
  USERS: 'users',
  BUSINESSES: 'businesses',
  ORDERS: 'orders',
  DELIVERY_PERSONS: 'deliveryPersons',
  DELIVERY_EARNINGS: 'delivery_earnings',
  ADMIN_NOTIFICATIONS: 'admin_notifications',
  USER_NOTIFICATIONS: 'user_notifications',
  DELIVERY_LOCATIONS: 'delivery_locations',
  CLIENT_LOCATIONS: 'client_locations',
  FCM_TOKENS: 'fcm_tokens',
  SETTINGS: 'settings',
  USER_ANNOUNCEMENT_ACKS: 'user_announcement_acks',
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

  async uploadTransferReceiptDataUrl(dataUrl: string, clientId: string): Promise<string> {
    try {
      const safeClientId = String(clientId || 'anonymous').replace(/[^a-zA-Z0-9_-]/g, '_');
      const filePath = `orders/transfer-receipts/${safeClientId}/${Date.now()}.jpg`;
      const storageRef = ref(storage, filePath);
      await uploadString(storageRef, dataUrl, 'data_url');
      return await getDownloadURL(storageRef);
    } catch (error: any) {
      console.error('❌ [FirebaseV2] Error subiendo comprobante de transferencia:', error);
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
      where('status', 'in', ['accepted', 'preparing', 'ready', 'on_the_way', 'arrived'])
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

  async publishPopupAnnouncement(data: {
    title: string;
    message: string;
    createdBy?: string;
  }): Promise<void> {
    try {
      const title = String(data.title || '').trim();
      const message = String(data.message || '').trim();
      if (!title || !message) {
        throw new Error('El título y el mensaje son obligatorios.');
      }

      const nowIso = new Date().toISOString();
      await setDoc(doc(db, COLLECTIONS.SETTINGS, 'popup_announcement'), {
        id: String(Date.now()),
        title,
        message,
        createdBy: data.createdBy || null,
        publishedAt: nowIso,
        updatedAt: nowIso,
      }, { merge: true });
    } catch (error) {
      console.error('❌ [FirebaseV2] Error publicando anuncio emergente:', error);
      throw error;
    }
  }

  subscribeToPopupAnnouncement(callback: (announcement: PopupAnnouncement | null) => void): () => void {
    const popupRef = doc(db, COLLECTIONS.SETTINGS, 'popup_announcement');
    return onSnapshot(popupRef, (snap) => {
      if (!snap.exists()) {
        callback(null);
        return;
      }
      const data = snap.data() as any;
      const publishedAt = data.publishedAt instanceof Timestamp
        ? data.publishedAt.toDate().toISOString()
        : String(data.publishedAt || new Date().toISOString());
      const updatedAt = data.updatedAt instanceof Timestamp
        ? data.updatedAt.toDate().toISOString()
        : (data.updatedAt ? String(data.updatedAt) : undefined);

      const popupAnnouncement: PopupAnnouncement = {
        id: String(data.id || ''),
        title: String(data.title || ''),
        message: String(data.message || ''),
        createdBy: data.createdBy ? String(data.createdBy) : undefined,
        publishedAt,
        updatedAt,
      };

      if (!popupAnnouncement.id || !popupAnnouncement.title || !popupAnnouncement.message) {
        callback(null);
        return;
      }

      callback(popupAnnouncement);
    }, (error) => {
      console.error('❌ [FirebaseV2] Error suscribiendo anuncio emergente:', error);
      callback(null);
    });
  }

  async acknowledgePopupAnnouncement(userId: string, announcementId: string): Promise<void> {
    try {
      const safeUserId = String(userId || '').trim();
      const safeAnnouncementId = String(announcementId || '').trim();
      if (!safeUserId || !safeAnnouncementId) return;

      const nowIso = new Date().toISOString();
      await setDoc(doc(db, COLLECTIONS.USER_ANNOUNCEMENT_ACKS, `${safeUserId}_${safeAnnouncementId}`), {
        userId: safeUserId,
        announcementId: safeAnnouncementId,
        acceptedAt: nowIso,
        updatedAt: nowIso,
      }, { merge: true });
    } catch (error) {
      console.error('❌ [FirebaseV2] Error confirmando anuncio emergente:', error);
      throw error;
    }
  }

  async hasAcknowledgedPopupAnnouncement(userId: string, announcementId: string): Promise<boolean> {
    try {
      const safeUserId = String(userId || '').trim();
      const safeAnnouncementId = String(announcementId || '').trim();
      if (!safeUserId || !safeAnnouncementId) return false;

      const ackRef = doc(db, COLLECTIONS.USER_ANNOUNCEMENT_ACKS, `${safeUserId}_${safeAnnouncementId}`);
      const ackSnap = await getDoc(ackRef);
      return ackSnap.exists();
    } catch (error) {
      console.error('❌ [FirebaseV2] Error validando confirmación de anuncio emergente:', error);
      return false;
    }
  }

  async saveFCMToken(userId: string, token: string, role: string, businessId?: string) {
    try {
      const safeUserId = String(userId || '').trim();
      const safeToken = String(token || '').trim();
      if (!safeUserId || !safeToken) return;

      const tokenKey = safeToken.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);
      const documentId = `${safeUserId}_${tokenKey}`;
      const now = new Date().toISOString();

      await setDoc(doc(db, COLLECTIONS.FCM_TOKENS, documentId), {
        token,
        role,
        userId: safeUserId,
        businessId: businessId || null,
        updatedAt: now,
        createdAt: now,
      }, { merge: true });
    } catch (err) {
      console.error('[FCM] Error saving token:', err);
    }
  }

  async queueAdminNotification(data: {
    title: string;
    body: string;
    target: 'clients' | 'businesses' | 'delivery' | 'both' | 'all';
    createdBy?: string;
  }): Promise<void> {
    try {
      await addDoc(collection(db, COLLECTIONS.ADMIN_NOTIFICATIONS), {
        title: data.title,
        body: data.body,
        target: data.target,
        createdBy: data.createdBy || null,
        status: 'pending',
        createdAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('❌ [FirebaseV2] Error encolando notificación admin:', error);
      throw error;
    }
  }

  async createInAppNotificationsForTarget(data: {
    title: string;
    body: string;
    target: 'clients' | 'businesses' | 'delivery' | 'both' | 'all';
    createdBy?: string;
  }): Promise<void> {
    try {
      const targetRoles: Array<'client' | 'business' | 'delivery'> =
        data.target === 'clients'
          ? ['client']
          : data.target === 'businesses'
          ? ['business']
          : data.target === 'delivery'
          ? ['delivery']
          : data.target === 'both'
          ? ['client', 'business']
          : ['client', 'business', 'delivery'];

      const userIds = new Set<string>();
      for (const role of targetRoles) {
        const usersSnapshot = await getDocs(query(collection(db, COLLECTIONS.USERS), where('role', '==', role)));
        usersSnapshot.docs.forEach((userDoc) => userIds.add(userDoc.id));
      }

      if (userIds.size === 0) return;

      const batch = writeBatch(db);
      const now = Timestamp.now();
      userIds.forEach((userId) => {
        const notificationRef = doc(collection(db, COLLECTIONS.USER_NOTIFICATIONS));
        batch.set(notificationRef, {
          userId,
          title: data.title,
          message: data.body,
          status: 'unread',
          source: 'admin',
          targetRole: data.target === 'all' ? 'all' : undefined,
          createdBy: data.createdBy || null,
          createdAt: now,
          updatedAt: now,
        });
      });

      await batch.commit();
    } catch (error) {
      console.error('❌ [FirebaseV2] Error creando notificaciones in-app:', error);
      throw error;
    }
  }

  subscribeToUserNotifications(userId: string, callback: (notifications: AppNotification[]) => void): () => void {
    const q = query(
      collection(db, COLLECTIONS.USER_NOTIFICATIONS),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (snap) => {
      const notifications = snap.docs.map((d) => {
        const data = d.data() as any;
        const createdAt = data.createdAt instanceof Timestamp
          ? data.createdAt.toDate().toISOString()
          : String(data.createdAt || new Date().toISOString());
        const readAt = data.readAt instanceof Timestamp
          ? data.readAt.toDate().toISOString()
          : (data.readAt ? String(data.readAt) : undefined);

        return {
          id: d.id,
          userId: String(data.userId || ''),
          title: String(data.title || ''),
          message: String(data.message || ''),
          status: data.status === 'read' ? 'read' : 'unread',
          createdAt,
          readAt,
          targetRole: data.targetRole,
          source: data.source,
        } as AppNotification;
      });

      callback(notifications);
    }, (err) => console.error('❌ [FirebaseV2] subscribeToUserNotifications error:', err));
  }

  async markNotificationAsRead(notificationId: string): Promise<void> {
    try {
      const ref = doc(db, COLLECTIONS.USER_NOTIFICATIONS, notificationId);
      await updateDoc(ref, {
        status: 'read',
        readAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('❌ [FirebaseV2] Error marcando notificación como leída:', error);
      throw error;
    }
  }

  async markAllUserNotificationsAsRead(userId: string): Promise<void> {
    try {
      const q = query(
        collection(db, COLLECTIONS.USER_NOTIFICATIONS),
        where('userId', '==', userId),
        where('status', '==', 'unread')
      );
      const snapshot = await getDocs(q);
      if (snapshot.empty) return;

      const batch = writeBatch(db);
      const now = Timestamp.now();
      snapshot.docs.forEach((item) => {
        batch.update(item.ref, {
          status: 'read',
          readAt: now,
          updatedAt: now,
        });
      });
      await batch.commit();
    } catch (error) {
      console.error('❌ [FirebaseV2] Error marcando todas como leídas:', error);
      throw error;
    }
  }
}

export default new FirebaseServiceV2();
