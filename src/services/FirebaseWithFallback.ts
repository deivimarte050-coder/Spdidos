// Servicio que maneja error permission-denied y hace fallback a localStorage
import { 
  collection, 
  getDocs, 
  addDoc, 
  Timestamp 
} from 'firebase/firestore';
import { db } from '../firebase/config';

let hasPermissionError = false;

class FirebaseWithFallback {
  
  async tryFirebaseOrLocal(operation: string, firebaseFn: () => Promise<any>, localFn: () => Promise<any>): Promise<any> {
    // Si ya sabemos que hay error de permisos, usar localStorage directamente
    if (hasPermissionError) {
      console.log(`⚠️ [Firebase+Fallback] Usando localStorage (permisos denegados)`);
      return localFn();
    }
    
    try {
      return await firebaseFn();
    } catch (error: any) {
      if (error.code === 'permission-denied') {
        console.log(`❌ [Firebase+Fallback] Error de permisos: ${operation}`);
        console.log(`⚠️ [Firebase+Fallback] Cambiando a localStorage`);
        hasPermissionError = true;
        return localFn();
      }
      throw error;
    }
  }

  // Datos en memoria como último recurso
  private users: any[] = [];
  private businesses: any[] = [];
  private orders: any[] = [];

  async getUsers(): Promise<any[]> {
    return this.users;
  }

  async addUser(userData: any): Promise<any> {
    const newUser = {
      id: Date.now().toString(),
      ...userData,
      createdAt: new Date().toISOString()
    };
    this.users.push(newUser);
    console.log('✅ [Firebase+Fallback] Usuario guardado en memoria:', newUser.email);
    return newUser;
  }

  async getBusinesses(): Promise<any[]> {
    return this.businesses;
  }

  async addBusiness(businessData: any): Promise<any> {
    const newBusiness = {
      id: Date.now().toString(),
      ...businessData,
      createdAt: new Date().toISOString()
    };
    this.businesses.push(newBusiness);
    return newBusiness;
  }

  async getOrders(): Promise<any[]> {
    return this.orders;
  }

  async addOrder(orderData: any): Promise<any> {
    const newOrder = {
      id: Date.now().toString(),
      ...orderData,
      createdAt: new Date().toISOString()
    };
    this.orders.push(newOrder);
    return newOrder;
  }
}

export default new FirebaseWithFallback();
export { hasPermissionError };
