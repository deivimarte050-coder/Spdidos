import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import HybridDataService from '../services/HybridDataService';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: Omit<User, 'id'>) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('🔧 AuthProvider inicializando...');
    
    try {
      const savedUser = localStorage.getItem('delivery_user_session');
      if (savedUser) {
        console.log('✅ Usuario guardado encontrado');
        setUser(JSON.parse(savedUser));
      }
      
      // Inicializar datos de ejemplo
      console.log('🔄 Inicializando datos de ejemplo...');
      HybridDataService.initializeSampleData();
      console.log('✅ Datos inicializados');
    } catch (err) {
      console.error('❌ Error en inicialización:', err);
    }
  }, []);

  const clearError = () => setError(null);

  const login = async (email: string, password: string) => {
    console.log('🔐 Intentando login:', email);
    setIsLoading(true);
    setError(null);
    
    try {
      // Hardcoded Admin Login
      if (email === 'admin@macorisdelivery.com' && password === '0000000000') {
        console.log('✅ Login como admin');
        const adminUser: User = {
          id: 'admin_root',
          name: 'Administrador Principal',
          email: 'admin@macorisdelivery.com',
          role: 'admin',
          whatsapp: '809-000-0000'
        };
        setUser(adminUser);
        localStorage.setItem('delivery_user_session', JSON.stringify(adminUser));
        setIsLoading(false);
        return;
      }

      // Buscar usuario en HybridDataService con timeout
      console.log('🔍 Buscando usuario en HybridDataService...');
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Tiempo de espera agotado')), 5000);
      });
      
      const usersPromise = HybridDataService.getUsers();
      
      const users = await Promise.race([usersPromise, timeoutPromise]) as any[];
      
      console.log(`📊 ${users.length} usuarios encontrados`);
      
      const foundUser = users.find(u => u.email === email && u.password === password);
      
      if (!foundUser) {
        console.log('❌ Usuario no encontrado o credenciales incorrectas');
        throw new Error('Credenciales incorrectas');
      }

      console.log('✅ Usuario encontrado:', foundUser.email);
      const { password: _, ...userWithoutPassword } = foundUser;
      setUser(userWithoutPassword as User);
      localStorage.setItem('delivery_user_session', JSON.stringify(userWithoutPassword));
      
    } catch (err) {
      console.error('❌ Error en login:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido al iniciar sesión');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: Omit<User, 'id'>) => {
    console.log('📝 Intentando registro:', userData.email);
    setIsLoading(true);
    setError(null);
    
    try {
      // Verificar si el email ya existe con timeout
      console.log('🔍 Verificando si el email existe...');
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Tiempo de espera agotado')), 5000);
      });
      
      const usersPromise = HybridDataService.getUsers();
      const users = await Promise.race([usersPromise, timeoutPromise]) as any[];
      
      if (users.some(u => u.email === userData.email)) {
        console.log('❌ Email ya registrado');
        throw new Error('El correo ya está registrado');
      }

      console.log('➕ Agregando nuevo usuario...');
      
      const addUserPromise = HybridDataService.addUser(userData);
      const newUser = await Promise.race([addUserPromise, timeoutPromise]);

      console.log('✅ Usuario registrado:', (newUser as any).email);
      const { password: _, ...userWithoutPassword } = newUser as any;
      setUser(userWithoutPassword as User);
      localStorage.setItem('delivery_user_session', JSON.stringify(userWithoutPassword));
      
    } catch (err) {
      console.error('❌ Error en registro:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido al registrarse');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    console.log('👋 Cerrando sesión...');
    setUser(null);
    localStorage.removeItem('delivery_user_session');
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      register, 
      logout,
      isLoading,
      error,
      clearError
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
