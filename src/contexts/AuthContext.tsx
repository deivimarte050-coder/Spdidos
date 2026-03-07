import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import SmartDataService from '../services/SmartDataService';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: Omit<User, 'id'>) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('delivery_user_session');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    
    // Inicializar datos de ejemplo si es necesario
    SmartDataService.initializeSampleData();
  }, []);

  const login = async (email: string, password: string) => {
    // Hardcoded Admin Login
    if (email === 'admin@macorisdelivery.com' && password === '0000000000') {
      const adminUser: User = {
        id: 'admin_root',
        name: 'Administrador Principal',
        email: 'admin@macorisdelivery.com',
        role: 'admin',
        whatsapp: '809-000-0000'
      };
      setUser(adminUser);
      localStorage.setItem('delivery_user_session', JSON.stringify(adminUser));
      return;
    }

    // Buscar usuario en el SmartDataService
    const users = await SmartDataService.getUsers();
    const foundUser = users.find(u => u.email === email && u.password === password);
    
    if (!foundUser) {
      throw new Error('Credenciales incorrectas');
    }

    const { password: _, ...userWithoutPassword } = foundUser;
    setUser(userWithoutPassword as User);
    localStorage.setItem('delivery_user_session', JSON.stringify(userWithoutPassword));
  };

  const register = async (userData: Omit<User, 'id'>) => {
    // Verificar si el email ya existe
    const users = await SmartDataService.getUsers();
    if (users.some(u => u.email === userData.email)) {
      throw new Error('El correo ya está registrado');
    }

    // Agregar usuario usando SmartDataService
    const newUser = await SmartDataService.addUser(userData);

    const { password: _, ...userWithoutPassword } = newUser;
    setUser(userWithoutPassword as User);
    localStorage.setItem('delivery_user_session', JSON.stringify(userWithoutPassword));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('delivery_user_session');
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
