import React from 'react';
import { motion } from 'motion/react';
import { 
  Home, 
  ClipboardList, 
  Heart, 
  User,
  LogOut
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface BottomNavProps {
  activeView: string;
  onViewChange: (view: any) => void;
  orderCount?: number;
}

const BottomNav: React.FC<BottomNavProps> = ({ activeView, onViewChange, orderCount = 0 }) => {
  const { logout } = useAuth();
  const navItems = [
    { id: 'home',      label: 'Inicio',     icon: Home,          badge: 0 },
    { id: 'orders',    label: 'Pedidos',    icon: ClipboardList, badge: orderCount },
    { id: 'favorites', label: 'Favoritos', icon: Heart,         badge: 0 },
    { id: 'profile',   label: 'Perfil',    icon: User,          badge: 0 },
    { id: 'logout',    label: 'Salir',     icon: LogOut,        badge: 0, isAction: true },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3 flex items-center justify-between z-50 lg:hidden shadow-2xl shadow-black/20">
      {navItems.map((item) => {
        const isActive = activeView === item.id;
        return (
          <button
            key={item.id}
            onClick={() => {
              if (item.isAction) {
                logout();
              } else {
                onViewChange(item.id);
              }
            }}
            className={`flex flex-col items-center gap-1 transition-all ${
              isActive ? 'text-primary' : 'text-gray-400'
            }`}
          >
            <div className="relative">
              <item.icon className={`w-6 h-6 ${isActive ? 'fill-primary/10' : ''} ${item.id === 'logout' ? 'text-red-400' : ''}`} />
              {isActive && (
                <motion.div
                  layoutId="active-dot"
                  className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-primary border-2 border-white"
                />
              )}
              {item.badge > 0 && !isActive && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-white">
                  {item.badge > 9 ? '9+' : item.badge}
                </span>
              )}
            </div>
            <span className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'text-primary' : (item.id === 'logout' ? 'text-red-400' : 'text-gray-400')}`}>
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};

export default BottomNav;
