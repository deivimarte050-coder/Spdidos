import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, MapPin, ChevronDown, Bell, ShoppingBag } from 'lucide-react';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import { useAuth } from '../contexts/AuthContext';
import { LOGO_URL } from '../constants';

interface LayoutProps {
  children: React.ReactNode;
  activeView: string;
  onViewChange: (view: any) => void;
  cartCount: number;
  onCartClick: () => void;
}

const Layout: React.FC<LayoutProps> = ({ 
  children, 
  activeView, 
  onViewChange, 
  cartCount, 
  onCartClick 
}) => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Desktop Sidebar */}
      <Sidebar activeView={activeView} onViewChange={onViewChange} />

      <div className="flex-1 flex flex-col min-h-screen">
        {/* Mobile Header */}
        <header className="lg:hidden bg-white px-4 py-3 flex items-center justify-between sticky top-0 z-40 border-b border-gray-100">
          <button 
            onClick={() => onViewChange('home')}
            className="flex items-center gap-2"
          >
            <img src={LOGO_URL} alt="Spdidos Logo" className="h-8 w-auto object-contain" referrerPolicy="no-referrer" />
            <div className="flex flex-col">
              <span className="text-lg font-black tracking-tighter italic text-primary leading-none">Spdidos</span>
              <span className="text-[6px] font-bold text-gray-400 uppercase tracking-widest">Delivery & Mandados</span>
            </div>
          </button>
          <div className="flex items-center gap-3">
            <button className="p-2 bg-gray-50 rounded-full text-primary">
              <MapPin className="w-5 h-5" />
            </button>
            <button 
              onClick={onCartClick}
              className="relative p-2 bg-gray-50 rounded-full text-gray-600"
            >
              <ShoppingBag className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-secondary text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Desktop Top Bar */}
        <header className="hidden lg:flex items-center justify-between px-8 py-4 bg-white border-b border-gray-100 sticky top-0 z-40">
          <div className="flex-1 max-w-2xl relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input 
              type="text" 
              placeholder="¿Qué necesitas hoy? (Pizza, paquetes, mandados...)"
              className="w-full bg-gray-50 border-none rounded-2xl py-3 pl-12 pr-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all font-medium"
            />
          </div>

          <div className="flex items-center gap-6 ml-8">
            <button className="p-2 text-gray-400 hover:text-primary transition-colors relative">
              <Bell className="w-6 h-6" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-secondary rounded-full border-2 border-white"></span>
            </button>
            <button 
              onClick={onCartClick}
              className="relative p-2 text-gray-400 hover:text-primary transition-colors"
            >
              <ShoppingBag className="w-6 h-6" />
              {cartCount > 0 && (
                <span className="absolute top-0 right-0 bg-secondary text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
                  {cartCount}
                </span>
              )}
            </button>
            <div className="h-8 w-px bg-gray-100"></div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary overflow-hidden border-2 border-white shadow-sm">
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name}`} alt="avatar" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-gray-900 leading-none">{user?.name.split(' ')[0]}</span>
                <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Cliente Gold</span>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[1600px] mx-auto flex flex-col lg:flex-row min-h-full">
            {/* Left/Main Content */}
            <div className="flex-1 lg:p-8">
              {children}
            </div>

            {/* Right Sidebar (Desktop Only) */}
            <aside className="hidden xl:flex flex-col w-80 border-l border-gray-100 bg-white p-6 sticky top-20 h-[calc(100vh-80px)] overflow-y-auto">
              <div className="space-y-8">
                {/* Map Preview */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-black text-gray-900 tracking-tight">Tracking</h3>
                    <button className="text-[10px] font-bold text-primary uppercase tracking-widest hover:underline">Ver Mapa</button>
                  </div>
                  <div className="h-40 bg-gray-100 rounded-3xl overflow-hidden relative group cursor-pointer">
                    <img 
                      src="https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?w=400&h=300&fit=crop" 
                      alt="Map" 
                      className="w-full h-full object-cover opacity-80 group-hover:scale-110 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="bg-white/90 backdrop-blur-sm p-3 rounded-2xl shadow-xl flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white">
                          <MapPin className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-gray-400 uppercase leading-none">Tu pedido</span>
                          <span className="text-xs font-bold text-gray-900">En camino (12 min)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Imperdible Offers */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-black text-gray-900 tracking-tight">Ofertas Imperdibles</h3>
                    <button className="text-[10px] font-bold text-gray-400 uppercase tracking-widest hover:text-primary transition-colors">Ver todo</button>
                  </div>
                  <div className="space-y-3">
                    {[1, 2].map((i) => (
                      <div key={i} className="flex gap-3 p-3 rounded-2xl hover:bg-gray-50 transition-colors cursor-pointer group">
                        <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
                          <img 
                            src={`https://images.unsplash.com/photo-${i === 1 ? '1568901346375-23c9450c58cd' : '1513104890138-7c749659a591'}?w=100&h=100&fit=crop`} 
                            alt="Offer" 
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                          />
                        </div>
                        <div className="flex flex-col justify-center">
                          <span className="text-xs font-bold text-gray-900 leading-tight">{i === 1 ? 'Burger King - 2x1' : 'Pizza Hut - Familiar'}</span>
                          <span className="text-[10px] text-gray-400 font-medium">Válido hasta hoy</span>
                          <span className="text-xs font-black text-primary mt-1">RD$ {i === 1 ? '450' : '850'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </main>

        {/* Mobile Bottom Nav */}
        <BottomNav activeView={activeView} onViewChange={onViewChange} />
      </div>
    </div>
  );
};

export default Layout;
