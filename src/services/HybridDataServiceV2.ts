import FirebaseServiceV2 from './FirebaseServiceV2';
import DataService from './DataService';

// VERSIÓN FORZADA A FIREBASE - Siempre intenta usar Firebase primero
class HybridDataServiceV2 {
  private useFirebase: boolean = true; // Forzar a true
  private isInitialized: boolean = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    console.log('🔧 [HybridV2] Inicializando...');
    console.log('🔧 [HybridV2] FORZANDO USO DE FIREBASE');
    
    try {
      // Probar conexión a Firebase
      const isConnected = await FirebaseServiceV2.testConnection();
      
      if (isConnected) {
        console.log('✅ [HybridV2] Firebase conectado');
        this.useFirebase = true;
        
        // Inicializar datos de ejemplo en Firebase
        await FirebaseServiceV2.initializeSampleData();
      } else {
        console.log('⚠️ [HybridV2] Firebase NO conectado, intentando de nuevo...');
        // Reintentar una vez
        await new Promise(resolve => setTimeout(resolve, 1000));
        const retryConnected = await FirebaseServiceV2.testConnection();
        
        if (retryConnected) {
          console.log('✅ [HybridV2] Firebase conectado en reintento');
          this.useFirebase = true;
        } else {
          console.log('❌ [HybridV2] Firebase NO disponible, usando localStorage como fallback');
          this.useFirebase = false;
          DataService.initializeSampleData();
        }
      }
      
      this.isInitialized = true;
    } catch (error) {
      console.error('❌ [HybridV2] Error inicializando:', error);
      console.log('⚠️ [HybridV2] Usando localStorage');
      this.useFirebase = false;
      DataService.initializeSampleData();
      this.isInitialized = true;
    }
  }

  // ============ USUARIOS ============
  
  async getUsers(): Promise<any[]> {
    await this.ensureInitialized();
    
    if (this.useFirebase) {
      console.log('[HybridV2] Obteniendo usuarios de Firebase');
      return FirebaseServiceV2.getUsers();
    } else {
      console.log('[HybridV2] Obteniendo usuarios de localStorage');
      return DataService.getUsers();
    }
  }

  async addUser(userData: any): Promise<any> {
    await this.ensureInitialized();
    
    console.log('[HybridV2] addUser llamado con:', userData.email);
    console.log('[HybridV2] useFirebase:', this.useFirebase);
    
    if (this.useFirebase) {
      console.log('[HybridV2] ➡️ Guardando en Firebase');
      return FirebaseServiceV2.addUser(userData);
    } else {
      console.log('[HybridV2] ➡️ Guardando en localStorage');
      return DataService.addUser(userData);
    }
  }

  // ============ NEGOCIOS ============
  
  async getBusinesses(): Promise<any[]> {
    await this.ensureInitialized();
    
    if (this.useFirebase) {
      return FirebaseServiceV2.getBusinesses();
    } else {
      return DataService.getBusinesses();
    }
  }

  async addBusiness(businessData: any): Promise<any> {
    await this.ensureInitialized();
    
    if (this.useFirebase) {
      return FirebaseServiceV2.addBusiness(businessData);
    } else {
      return DataService.addBusiness(businessData);
    }
  }

  // ============ PEDIDOS ============
  
  async getOrders(): Promise<any[]> {
    await this.ensureInitialized();
    
    if (this.useFirebase) {
      return FirebaseServiceV2.getOrders();
    } else {
      return DataService.getOrders();
    }
  }

  async addOrder(orderData: any): Promise<any> {
    await this.ensureInitialized();
    
    if (this.useFirebase) {
      return FirebaseServiceV2.addOrder(orderData);
    } else {
      return DataService.addOrder(orderData);
    }
  }

  // ============ MÉTODOS DE UTILIDAD ============
  
  isUsingFirebase(): boolean {
    return this.useFirebase;
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  // Para compatibilidad
  initializeSampleData(): void {
    if (!this.useFirebase) {
      DataService.initializeSampleData();
    }
  }
}

// Crear instancia singleton
const hybridServiceV2 = new HybridDataServiceV2();

// Inicializar automáticamente
hybridServiceV2.initialize().catch(console.error);

export default hybridServiceV2;
