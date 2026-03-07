import SimpleFirebaseService from './SimpleFirebaseService';
import DataService from './DataService';
import { User, Business, Order, DeliveryPerson } from '../types';

class SmartDataService {
  private static instance: SmartDataService;
  private listeners: Set<() => void> = new Set();
  private useFirebase: boolean = false;

  private constructor() {
    // Detectar si Firebase está disponible y si estamos en producción
    this.useFirebase = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
  }

  static getInstance(): SmartDataService {
    if (!SmartDataService.instance) {
      SmartDataService.instance = new SmartDataService();
    }
    return SmartDataService.instance;
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
    if (this.useFirebase) {
      try {
        return await SimpleFirebaseService.getUsers();
      } catch (error) {
        console.log('Firebase no disponible, usando localStorage');
        return DataService.getUsers();
      }
    }
    return DataService.getUsers();
  }

  async addUser(userData: Omit<User, 'id'>): Promise<User> {
    if (this.useFirebase) {
      try {
        const result = await SimpleFirebaseService.addUser(userData);
        this.notify();
        return result;
      } catch (error) {
        console.log('Firebase no disponible, usando localStorage');
        const result = DataService.addUser(userData);
        this.notify();
        return result;
      }
    }
    const result = DataService.addUser(userData);
    this.notify();
    return result;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<void> {
    if (this.useFirebase) {
      try {
        await SimpleFirebaseService.updateUser(id, updates);
        this.notify();
        return;
      } catch (error) {
        console.log('Firebase no disponible, usando localStorage');
        DataService.updateUser(id, updates);
        this.notify();
        return;
      }
    }
    DataService.updateUser(id, updates);
    this.notify();
  }

  // ==================== NEGOCIOS ====================
  async getBusinesses(): Promise<Business[]> {
    if (this.useFirebase) {
      try {
        return await SimpleFirebaseService.getBusinesses();
      } catch (error) {
        console.log('Firebase no disponible, usando localStorage');
        return DataService.getBusinesses();
      }
    }
    return DataService.getBusinesses();
  }

  async addBusiness(businessData: Omit<Business, 'id' | 'createdAt' | 'totalOrders' | 'totalRevenue' | 'status'>): Promise<Business> {
    if (this.useFirebase) {
      try {
        const result = await SimpleFirebaseService.addBusiness(businessData);
        this.notify();
        return result;
      } catch (error) {
        console.log('Firebase no disponible, usando localStorage');
        const result = DataService.addBusiness(businessData);
        this.notify();
        return result;
      }
    }
    const result = DataService.addBusiness(businessData);
    this.notify();
    return result;
  }

  async updateBusiness(id: string, updates: Partial<Business>): Promise<void> {
    if (this.useFirebase) {
      try {
        await SimpleFirebaseService.updateBusiness(id, updates);
        this.notify();
        return;
      } catch (error) {
        console.log('Firebase no disponible, usando localStorage');
        DataService.updateBusiness(id, updates);
        this.notify();
        return;
      }
    }
    DataService.updateBusiness(id, updates);
    this.notify();
  }

  // ==================== PEDIDOS ====================
  async getOrders(): Promise<Order[]> {
    if (this.useFirebase) {
      try {
        return await SimpleFirebaseService.getOrders();
      } catch (error) {
        console.log('Firebase no disponible, usando localStorage');
        return DataService.getOrders();
      }
    }
    return DataService.getOrders();
  }

  async addOrder(orderData: Omit<Order, 'id' | 'createdAt'>): Promise<Order> {
    if (this.useFirebase) {
      try {
        const result = await SimpleFirebaseService.addOrder(orderData);
        this.notify();
        return result;
      } catch (error) {
        console.log('Firebase no disponible, usando localStorage');
        const result = DataService.addOrder(orderData);
        this.notify();
        return result;
      }
    }
    const result = DataService.addOrder(orderData);
    this.notify();
    return result;
  }

  async updateOrder(id: string, updates: Partial<Order>): Promise<void> {
    if (this.useFirebase) {
      try {
        await SimpleFirebaseService.updateOrder(id, updates);
        this.notify();
        return;
      } catch (error) {
        console.log('Firebase no disponible, usando localStorage');
        DataService.updateOrder(id, updates);
        this.notify();
        return;
      }
    }
    DataService.updateOrder(id, updates);
    this.notify();
  }

  // ==================== DELIVERY PERSONS ====================
  async getDeliveryPersons(): Promise<DeliveryPerson[]> {
    if (this.useFirebase) {
      try {
        return await SimpleFirebaseService.getDeliveryPersons();
      } catch (error) {
        console.log('Firebase no disponible, usando localStorage');
        return DataService.getDeliveryPersons();
      }
    }
    return DataService.getDeliveryPersons();
  }

  async addDeliveryPerson(deliveryData: Omit<DeliveryPerson, 'id'>): Promise<DeliveryPerson> {
    if (this.useFirebase) {
      try {
        const result = await SimpleFirebaseService.addDeliveryPerson(deliveryData);
        this.notify();
        return result;
      } catch (error) {
        console.log('Firebase no disponible, usando localStorage');
        const result = DataService.addDeliveryPerson(deliveryData);
        this.notify();
        return result;
      }
    }
    const result = DataService.addDeliveryPerson(deliveryData);
    this.notify();
    return result;
  }

  // ==================== IMÁGENES ====================
  async uploadImage(file: File, path: string): Promise<string> {
    if (this.useFirebase) {
      try {
        return await SimpleFirebaseService.uploadImage(file, path);
      } catch (error) {
        console.log('Firebase no disponible, usando base64');
        // Para localStorage, convertimos a base64
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      }
    }
    // Para localStorage, convertimos a base64
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
  }

  // ==================== ESTADÍSTICAS ====================
  async getStats() {
    if (this.useFirebase) {
      try {
        return await SimpleFirebaseService.getStats();
      } catch (error) {
        console.log('Firebase no disponible, usando localStorage');
        return DataService.getStats();
      }
    }
    return DataService.getStats();
  }

  // ==================== INICIALIZACIÓN ====================
  initializeSampleData() {
    if (!this.useFirebase) {
      DataService.initializeSampleData();
    }
  }

  // ==================== CONTROL ====================
  setUseFirebase(use: boolean) {
    this.useFirebase = use;
  }

  isUsingFirebase(): boolean {
    return this.useFirebase;
  }

  // ==================== MIGRACIÓN ====================
  async migrateToFirebase() {
    if (this.useFirebase) {
      try {
        console.log('🔄 Migrando datos a Firebase...');
        
        // Migrar usuarios
        const localUsers = DataService.getUsers();
        for (const user of localUsers) {
          await SimpleFirebaseService.addUser(user);
        }
        console.log(`✅ ${localUsers.length} usuarios migrados`);

        // Migrar negocios
        const localBusinesses = DataService.getBusinesses();
        for (const business of localBusinesses) {
          await SimpleFirebaseService.addBusiness(business);
        }
        console.log(`✅ ${localBusinesses.length} negocios migrados`);

        // Migrar pedidos
        const localOrders = DataService.getOrders();
        for (const order of localOrders) {
          await SimpleFirebaseService.addOrder(order);
        }
        console.log(`✅ ${localOrders.length} pedidos migrados`);

        console.log('🎉 Migración completada a Firebase');
      } catch (error) {
        console.error('❌ Error en migración:', error);
      }
    }
  }
}

export default SmartDataService.getInstance();
