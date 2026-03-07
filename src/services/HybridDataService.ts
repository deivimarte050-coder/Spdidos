import FirebaseService from './FirebaseService';
import DataService from './DataService';
import { User, Order } from '../types';

class HybridDataService {
  private useFirebase: boolean = false;
  private isInitialized: boolean = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    console.log('🔧 Inicializando HybridDataService...');
    
    try {
      // Probar conexión a Firebase
      const isConnected = await FirebaseService.testConnection();
      
      if (isConnected) {
        console.log('✅ Usando Firebase');
        this.useFirebase = true;
        
        // Inicializar datos de ejemplo en Firebase
        await FirebaseService.initializeSampleData();
      } else {
        console.log('⚠️ Firebase no disponible, usando localStorage');
        this.useFirebase = false;
        
        // Inicializar datos en localStorage
        DataService.initializeSampleData();
      }
      
      this.isInitialized = true;
    } catch (error) {
      console.error('❌ Error inicializando:', error);
      console.log('⚠️ Usando localStorage como fallback');
      this.useFirebase = false;
      DataService.initializeSampleData();
      this.isInitialized = true;
    }
  }

  // ============ USUARIOS ============
  
  async getUsers(): Promise<any[]> {
    await this.ensureInitialized();
    
    if (this.useFirebase) {
      return FirebaseService.getUsers();
    } else {
      return DataService.getUsers();
    }
  }

  async addUser(userData: Omit<User, 'id'>): Promise<any> {
    await this.ensureInitialized();
    
    if (this.useFirebase) {
      return FirebaseService.addUser(userData);
    } else {
      return DataService.addUser(userData);
    }
  }

  // ============ NEGOCIOS ============
  
  async getBusinesses(): Promise<any[]> {
    await this.ensureInitialized();
    
    if (this.useFirebase) {
      return FirebaseService.getBusinesses();
    } else {
      return DataService.getBusinesses();
    }
  }

  async addBusiness(businessData: any): Promise<any> {
    await this.ensureInitialized();
    
    if (this.useFirebase) {
      return FirebaseService.addBusiness(businessData);
    } else {
      return DataService.addBusiness(businessData);
    }
  }

  async updateBusiness(businessId: string, data: any): Promise<void> {
    await this.ensureInitialized();
    
    if (this.useFirebase) {
      return FirebaseService.updateBusiness(businessId, data);
    } else {
      return DataService.updateBusiness(businessId, data);
    }
  }

  // ============ PEDIDOS ============
  
  async getOrders(): Promise<any[]> {
    await this.ensureInitialized();
    
    if (this.useFirebase) {
      return FirebaseService.getOrders();
    } else {
      return DataService.getOrders();
    }
  }

  async addOrder(orderData: any): Promise<any> {
    await this.ensureInitialized();
    
    if (this.useFirebase) {
      return FirebaseService.addOrder(orderData);
    } else {
      return DataService.addOrder(orderData);
    }
  }

  async updateOrder(orderId: string, data: any): Promise<void> {
    await this.ensureInitialized();
    
    if (this.useFirebase) {
      return FirebaseService.updateOrder(orderId, data);
    } else {
      return DataService.updateOrder(orderId, data);
    }
  }

  // ============ REPARTIDORES ============
  
  async getDeliveryPersons(): Promise<any[]> {
    await this.ensureInitialized();
    
    if (this.useFirebase) {
      return FirebaseService.getDeliveryPersons();
    } else {
      return DataService.getDeliveryPersons();
    }
  }

  // ============ SUSCRIPCIONES ============
  
  subscribeToOrders(callback: (orders: any[]) => void): () => void {
    if (this.useFirebase) {
      return FirebaseService.subscribeToOrders(callback);
    } else {
      return DataService.subscribe(callback);
    }
  }

  subscribeToBusinesses(callback: (businesses: any[]) => void): () => void {
    if (this.useFirebase) {
      return FirebaseService.subscribeToBusinesses(callback);
    } else {
      return DataService.subscribe(callback);
    }
  }

  subscribe(callback: () => void): () => void {
    return DataService.subscribe(callback);
  }

  // ============ UTILIDADES ============
  
  isUsingFirebase(): boolean {
    return this.useFirebase;
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  // ============ COMPATIBILIDAD ============
  
  // Métodos para compatibilidad con código existente
  initializeSampleData(): void {
    if (!this.useFirebase) {
      DataService.initializeSampleData();
    }
  }
}

// Crear instancia singleton
const hybridService = new HybridDataService();

// Inicializar automáticamente
hybridService.initialize().catch(console.error);

export default hybridService;
