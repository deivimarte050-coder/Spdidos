import React from 'react';
import { motion } from 'motion/react';
import { Bell, ShoppingBag, MonitorSmartphone } from 'lucide-react';
import BottomNav from './BottomNav';
import { useAuth } from '../contexts/AuthContext';
import { LOGO_URL } from '../constants';

interface LayoutProps {
  children: React.ReactNode;
  activeView: string;
  onViewChange: (view: any) => void;
  cartCount: number;
  onCartClick: () => void;
  orderCount?: number;
}

const desktopNavItems = [
  { id: 'home',      label: 'Inicio' },
  { id: 'orders',    label: 'Pedidos' },
  { id: 'favorites', label: 'Favoritos' },
  { id: 'profile',   label: 'Perfil' },
];

const Layout: React.FC<LayoutProps> = ({
  children,
  activeView,
  onViewChange,
  cartCount,
  onCartClick,
  orderCount = 0,
}) => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Desktop Header ────────────────────────────────────────── */}
      <header className="hidden lg:flex items-center justify-between px-8 py-4 bg-white border-b border-gray-100 sticky top-0 z-40">
        {/* Logo */}
        <button onClick={() => onViewChange('home')} className="flex items-center gap-2 flex-shrink-0">
          <img src={LOGO_URL} alt="Spdidos" className="h-9 w-auto object-contain" referrerPolicy="no-referrer" />
          <div className="flex flex-col leading-none">
            <span className="text-xl font-black tracking-tighter italic text-primary">Spdidos</span>
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Delivery & Mandados</span>
          </div>
        </button>

        {/* Nav links */}
        <nav className="flex items-center gap-8">
          {desktopNavItems.map(item => (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`relative text-sm font-bold pb-1 transition-colors ${
                activeView === item.id ? 'text-primary' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {item.label}
              {activeView === item.id && (
                <motion.div
                  layoutId="nav-underline"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full"
                />
              )}
            </button>
          ))}
        </nav>

        {/* Right icons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onCartClick}
            className="relative p-2.5 bg-gray-50 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"
          >
            <ShoppingBag className="w-5 h-5" />
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-white">
                {cartCount}
              </span>
            )}
          </button>
          <button className="relative p-2.5 bg-gray-50 hover:bg-gray-100 rounded-full text-gray-500 transition-colors">
            <MonitorSmartphone className="w-5 h-5" />
          </button>
          <button className="relative p-2.5 bg-gray-50 hover:bg-gray-100 rounded-full text-gray-500 transition-colors">
            <Bell className="w-5 h-5" />
            {orderCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-white">
                {orderCount}
              </span>
            )}
          </button>
          <button
            onClick={() => onViewChange('profile')}
            className="w-9 h-9 rounded-full overflow-hidden border-2 border-gray-200 hover:border-primary transition-colors flex-shrink-0"
          >
            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name}`} alt="avatar" className="w-full h-full" />
          </button>
        </div>
      </header>

      {/* ── Mobile Header ─────────────────────────────────────────── */}
      <header className="lg:hidden bg-white px-4 py-3 flex items-center justify-between sticky top-0 z-40 border-b border-gray-100">
        <button onClick={() => onViewChange('home')} className="flex items-center gap-2">
          <img src={LOGO_URL} alt="Spdidos" className="h-7 w-auto object-contain" referrerPolicy="no-referrer" />
          <div className="flex flex-col leading-none">
            <span className="text-base font-black tracking-tighter italic text-primary">Spdidos</span>
            <span className="text-[7px] font-bold text-gray-400 uppercase tracking-widest">Delivery & Mandados</span>
          </div>
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={onCartClick}
            className="relative p-2 bg-gray-50 rounded-full text-gray-500"
          >
            <ShoppingBag className="w-5 h-5" />
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-white">
                {cartCount}
              </span>
            )}
          </button>
          <button className="relative p-2 bg-gray-50 rounded-full text-gray-500">
            <Bell className="w-5 h-5" />
            {orderCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-white">
                {orderCount}
              </span>
            )}
          </button>
          <button
            onClick={() => onViewChange('profile')}
            className="w-8 h-8 rounded-full overflow-hidden border-2 border-gray-200"
          >
            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name}`} alt="avatar" className="w-full h-full" />
          </button>
        </div>
      </header>

      {/* ── Main Content ──────────────────────────────────────────── */}
      <main className="pb-20 lg:pb-8">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>

      {/* ── Mobile Bottom Nav ─────────────────────────────────────── */}
      <BottomNav activeView={activeView} onViewChange={onViewChange} orderCount={orderCount} />
    </div>
  );
};

export default Layout;
