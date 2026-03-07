import React from 'react';
import { motion } from 'motion/react';
import { 
  LayoutDashboard, 
  ClipboardList, 
  History, 
  Settings, 
  Store, 
  LogOut,
  User
} from 'lucide-react';
import { LOGO_URL } from '../constants';
import { useAuth } from '../contexts/AuthContext';

interface SidebarProps {
  activeView: string;
  onViewChange: (view: any) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, onViewChange }) => {
  const { user, logout } = useAuth();

  const menuItems = [
    { id: 'home', label: 'Panel de Control', icon: LayoutDashboard },
    { id: 'orders', label: 'Pedidos en Vivo', icon: ClipboardList },
    { id: 'history', label: 'Historial', icon: History },
    { id: 'settings', label: 'Ajustes', icon: Settings },
    { id: 'business', label: 'Mi Negocio', icon: Store },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-gray-100 h-screen sticky top-0">
      <div className="p-6">
        <button 
          onClick={() => onViewChange('home')}
          className="flex items-center gap-3 mb-8 hover:opacity-80 transition-opacity"
        >
          <img src={LOGO_URL} alt="Spdidos Logo" className="h-12 w-auto object-contain" referrerPolicy="no-referrer" />
          <div className="flex flex-col">
            <span className="text-xl font-black tracking-tighter italic text-primary leading-none">Spdidos</span>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Delivery & Mandados</span>
          </div>
        </button>

        <div className="mb-8 p-4 bg-gray-50 rounded-2xl">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary overflow-hidden">
              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name}`} alt="avatar" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Bienvenido,</span>
              <span className="text-sm font-bold text-gray-900 truncate w-32">{user?.name}</span>
            </div>
          </div>
        </div>

        <nav className="space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm ${
                activeView === item.id 
                  ? 'bg-primary/10 text-primary shadow-sm' 
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <item.icon className={`w-5 h-5 ${activeView === item.id ? 'text-primary' : 'text-gray-400'}`} />
              <span>{item.label}</span>
              {activeView === item.id && (
                <motion.div 
                  layoutId="active-pill"
                  className="ml-auto w-1.5 h-1.5 rounded-full bg-primary"
                />
              )}
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-auto p-6 border-t border-gray-50">
        <button 
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-500 hover:bg-red-50 hover:text-red-600 transition-all font-bold text-sm"
        >
          <LogOut className="w-5 h-5" />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
