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
  showInstallAppButton?: boolean;
  onInstallAppClick?: () => void;
  showCartHint?: boolean;
  onCartHintDismiss?: () => void;
  orderCount?: number;
  notificationCount?: number;
  hasUnreadNotificationAlert?: boolean;
  onNotificationBellClick?: () => void;
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
  showInstallAppButton = false,
  onInstallAppClick,
  showCartHint = false,
  onCartHintDismiss,
  orderCount = 0,
  notificationCount = 0,
  hasUnreadNotificationAlert = false,
  onNotificationBellClick,
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
            onClick={() => {
              onCartClick();
              onCartHintDismiss?.();
            }}
            className={`relative p-2.5 rounded-full text-gray-500 transition-colors ${showCartHint ? 'bg-primary/10 ring-2 ring-primary/40 animate-pulse' : 'bg-gray-50 hover:bg-gray-100'}`}
          >
            <ShoppingBag className="w-5 h-5" />
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-white">
                {cartCount}
              </span>
            )}
          </button>
          {showCartHint && (
            <motion.button
              type="button"
              onClick={() => {
                onCartClick();
                onCartHintDismiss?.();
              }}
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              className="absolute top-16 right-20 z-50 bg-primary text-white text-xs font-black px-3 py-2 rounded-xl shadow-lg"
            >
              Toca el carrito para confirmar y pagar
            </motion.button>
          )}
          {showInstallAppButton && (
            <button
              onClick={onInstallAppClick}
              className="flex items-center gap-2 px-3 py-2 rounded-full bg-primary text-white text-xs font-black hover:bg-primary/90 transition-colors"
              title="Instalar App"
            >
              <MonitorSmartphone className="w-4 h-4" />
              Instalar App
            </button>
          )}
          <button
            onClick={() => onNotificationBellClick?.()}
            className={`relative p-2.5 rounded-full text-gray-500 transition-colors ${hasUnreadNotificationAlert ? 'bg-amber-50 ring-2 ring-amber-300 animate-pulse' : 'bg-gray-50 hover:bg-gray-100'}`}
            title={hasUnreadNotificationAlert ? 'Atención: tienes una nueva notificación' : 'Notificaciones'}
          >
            <Bell className="w-5 h-5" />
            {notificationCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-white">
                {notificationCount > 9 ? '9+' : notificationCount}
              </span>
            )}
            {hasUnreadNotificationAlert && (
              <span className="absolute -bottom-9 left-1/2 -translate-x-1/2 whitespace-nowrap bg-amber-500 text-white text-[10px] font-black px-2 py-1 rounded-full shadow-md">
                Atencion nueva notificacion
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
            onClick={() => {
              onCartClick();
              onCartHintDismiss?.();
            }}
            className={`relative p-2 rounded-full text-gray-500 transition-all ${showCartHint ? 'bg-primary/10 ring-2 ring-primary/40 animate-pulse' : 'bg-gray-50'}`}
          >
            <ShoppingBag className="w-5 h-5" />
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-white">
                {cartCount}
              </span>
            )}
          </button>
          {showCartHint && (
            <motion.button
              type="button"
              onClick={() => {
                onCartClick();
                onCartHintDismiss?.();
              }}
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              className="absolute top-14 right-16 z-50 max-w-[180px] bg-primary text-white text-[11px] leading-tight font-black px-3 py-2 rounded-xl shadow-lg"
            >
              👆 Dale al carrito para confirmar y pagar
            </motion.button>
          )}
          {showInstallAppButton && (
            <button
              onClick={onInstallAppClick}
              className="flex items-center gap-1.5 px-2.5 py-2 rounded-full bg-primary text-white text-[11px] font-black"
              title="Instalar App"
            >
              <MonitorSmartphone className="w-4 h-4" />
              Instalar App
            </button>
          )}
          <button
            onClick={() => onNotificationBellClick?.()}
            className={`relative p-2 rounded-full text-gray-500 ${hasUnreadNotificationAlert ? 'bg-amber-50 ring-2 ring-amber-300 animate-pulse' : 'bg-gray-50'}`}
            title={hasUnreadNotificationAlert ? 'Atención: tienes una nueva notificación' : 'Notificaciones'}
          >
            <Bell className="w-5 h-5" />
            {notificationCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-white">
                {notificationCount > 9 ? '9+' : notificationCount}
              </span>
            )}
            {hasUnreadNotificationAlert && (
              <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-amber-500 text-white text-[10px] font-black px-2 py-1 rounded-full shadow-md">
                Atencion nueva notificacion
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
