import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import HybridDataServiceV2 from '../services/HybridDataServiceV2';
import FirebaseServiceV2 from '../services/FirebaseServiceV2';
import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { auth } from '../firebase/config';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: Omit<User, 'id'>) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => void;
  updateUser: (data: Partial<User>) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALLOWED_EMAIL_DOMAINS = ['gmail.com', 'hotmail.com'];
const googleProvider = new GoogleAuthProvider();
const isAllowedRegistrationEmail = (email: string) => {
  const domain = String(email || '').split('@')[1] || '';
  return ALLOWED_EMAIL_DOMAINS.includes(domain);
};

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
      HybridDataServiceV2.initializeSampleData();
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

      // Buscar usuario en HybridDataServiceV2 con timeout
      console.log('🔍 Buscando usuario en HybridDataServiceV2...');
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Tiempo de espera agotado')), 5000);
      });
      
      const usersPromise = HybridDataServiceV2.getUsers();
      
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
      const normalizedEmail = String(userData.email || '').trim().toLowerCase();
      if (!EMAIL_REGEX.test(normalizedEmail)) {
        throw new Error('Correo electrónico inválido');
      }
      if (!isAllowedRegistrationEmail(normalizedEmail)) {
        throw new Error('Solo se permiten correos @gmail.com y @hotmail.com para registrarse.');
      }

      // Verificar si el email ya existe con timeout
      console.log('🔍 Verificando si el email existe...');
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Tiempo de espera agotado')), 5000);
      });
      
      const usersPromise = HybridDataServiceV2.getUsers();
      const users = await Promise.race([usersPromise, timeoutPromise]) as any[];
      
      if (users.some(u => String(u.email || '').trim().toLowerCase() === normalizedEmail)) {
        console.log('❌ Email ya registrado');
        throw new Error('Este correo ya está registrado, intenta iniciar sesión.');
      }

      console.log('➕ Agregando nuevo usuario...');

      const addUserPromise = HybridDataServiceV2.addUser({
        ...userData,
        email: normalizedEmail,
      });
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

  const loginWithGoogle = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const googleEmail = String(result.user.email || '').trim().toLowerCase();
      if (!googleEmail) {
        throw new Error('No se pudo obtener el correo de Google.');
      }
      if (!isAllowedRegistrationEmail(googleEmail)) {
        throw new Error('Solo se permiten correos @gmail.com y @hotmail.com para registrarse.');
      }

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Tiempo de espera agotado')), 5000);
      });

      const usersPromise = HybridDataServiceV2.getUsers();
      const users = await Promise.race([usersPromise, timeoutPromise]) as any[];
      const existingUser = users.find((u) => String(u.email || '').trim().toLowerCase() === googleEmail);

      if (existingUser) {
        const { password: _, ...userWithoutPassword } = existingUser;
        setUser(userWithoutPassword as User);
        localStorage.setItem('delivery_user_session', JSON.stringify(userWithoutPassword));
        return;
      }

      const newUserData = {
        name: String(result.user.displayName || 'Cliente'),
        email: googleEmail,
        whatsapp: String(result.user.phoneNumber || ''),
        phone: String(result.user.phoneNumber || ''),
        role: 'client' as UserRole,
        status: 'active' as const,
        uid: result.user.uid,
        photoURL: String(result.user.photoURL || ''),
      };

      const addUserPromise = HybridDataServiceV2.addUser(newUserData);
      const newUser = await Promise.race([addUserPromise, timeoutPromise]) as any;
      const { password: _, ...userWithoutPassword } = newUser;
      setUser(userWithoutPassword as User);
      localStorage.setItem('delivery_user_session', JSON.stringify(userWithoutPassword));
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user') {
        setError('Se canceló el inicio de sesión con Google.');
        throw new Error('Se canceló el inicio de sesión con Google.');
      }
      setError(err instanceof Error ? err.message : 'Error al iniciar con Google');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    console.log('👋 Cerrando sesión...');
    setUser(null);
    localStorage.removeItem('delivery_user_session');
    signOut(auth).catch(() => {});
  };

  const updateUser = async (data: Partial<User>) => {
    if (!user) return;
    try {
      await FirebaseServiceV2.updateUserProfile(user.id, data as any);
      const updated = { ...user, ...data };
      setUser(updated);
      localStorage.setItem('delivery_user_session', JSON.stringify(updated));
    } catch (err) {
      console.error('❌ Error actualizando perfil:', err);
      throw err;
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      register, 
      loginWithGoogle,
      logout,
      updateUser,
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
