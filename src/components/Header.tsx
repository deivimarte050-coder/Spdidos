import React, { useState } from 'react';
import { ShoppingBag, MapPin, Search, User, ChevronDown, Bell, Heart, ClipboardList, HelpCircle, Home, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { LOGO_URL } from '../constants';

interface HeaderProps {
  cartCount: number;
  onCartClick: () => void;
  onViewChange?: (view: any) => void;
}

const Header: React.FC<HeaderProps> = ({ cartCount, onCartClick, onViewChange }) => {
  const { user, logout } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const handleMenuClick = (view: any) => {
    if (onViewChange) {
      onViewChange(view);
    }
    setIsProfileOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-100 px-4 py-2">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Logo and Location */}
        <div className="flex items-center gap-8">
          <button 
            onClick={() => handleMenuClick('home')}
            className="flex items-center gap-2"
          >
            <div className="flex items-center gap-2">
              <img src={LOGO_URL} alt="Spdidos Logo" className="h-10 w-auto object-contain" referrerPolicy="no-referrer" />
              <span className="text-2xl font-black tracking-tighter italic text-primary">Spdidos</span>
            </div>
          </button>
          
          <div className="hidden md:flex flex-col">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Enviar a</span>
            <button className="flex items-center gap-1 text-sm font-bold text-gray-800 hover:text-primary transition-colors">
              <span>San Pedro de Macorís</span>
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex-1 max-w-xl relative hidden sm:block">
          <div className="relative group">
            <input 
              type="text" 
              placeholder="Buscar locales"
              className="w-full bg-gray-100 border-none rounded-full py-2.5 pl-4 pr-12 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
            />
            <button className="absolute right-1 top-1/2 -translate-y-1/2 bg-primary p-1.5 rounded-full text-white hover:bg-primary/90 transition-colors">
              <Search className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* User Actions */}
        <div className="flex items-center gap-4">
          <button 
            onClick={onCartClick}
            className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ShoppingBag className="w-6 h-6" />
            {cartCount > 0 && (
              <span className="absolute top-0 right-0 bg-secondary text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
                {cartCount}
              </span>
            )}
          </button>

          <div className="relative">
            <button 
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-2 p-1 pr-3 hover:bg-gray-100 rounded-full transition-all border border-transparent hover:border-gray-200"
            >
              <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white font-bold text-xs overflow-hidden">
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name}`} alt="avatar" />
              </div>
              <span className="text-sm font-bold text-gray-700 hidden lg:block">{user?.name.split(' ')[0]}</span>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
            </button>

            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 z-[60] overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-50 mb-2">
                  <p className="text-sm font-bold text-gray-900">{user?.name}</p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                  <p className="text-[10px] font-bold text-emerald-600 mt-1">WA: {user?.whatsapp}</p>
                </div>
                
                <MenuItem icon={Home} label="Inicio" onClick={() => handleMenuClick('home')} />
                <MenuItem icon={MapPin} label="Mis direcciones" onClick={() => handleMenuClick('addresses')} />
                <MenuItem icon={Heart} label="Mis favoritos" onClick={() => handleMenuClick('favorites')} />
                <MenuItem icon={ClipboardList} label="Mis pedidos" onClick={() => handleMenuClick('orders')} />
                <MenuItem icon={User} label="Mi perfil" onClick={() => handleMenuClick('profile')} />
                <MenuItem icon={HelpCircle} label="Ayuda" />
                
                <div className="mt-2 pt-2 border-t border-gray-50">
                  <button 
                    onClick={logout}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Cerrar sesión</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

const MenuItem = ({ icon: Icon, label, onClick }: { icon: any, label: string, onClick?: () => void }) => (
  <button 
    onClick={onClick}
    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
  >
    <Icon className="w-4 h-4 text-gray-400" />
    <span className="font-medium">{label}</span>
  </button>
);

export default Header;
