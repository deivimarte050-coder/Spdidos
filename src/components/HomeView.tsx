import React from 'react';
import { motion } from 'motion/react';
import { Search, MapPin, ChevronRight, Star, Clock } from 'lucide-react';
import CategoryCards from './CategoryCards';
import PromoBanners from './PromoBanners';

interface HomeViewProps {
  children?: React.ReactNode;
}

const HomeView: React.FC<HomeViewProps> = ({ children }) => {
  return (
    <div className="space-y-8 pb-12 px-4 lg:px-0">
      {/* Mobile Search & Location */}
      <div className="lg:hidden space-y-4">
        <div className="flex items-center gap-2 text-primary">
          <MapPin className="w-5 h-5" />
          <span className="text-sm font-black uppercase tracking-widest">San Pedro de Macorís</span>
        </div>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input 
            type="text" 
            placeholder="¿Qué necesitas hoy? (Pizza, paquetes, mandados...)"
            className="w-full bg-white border-none rounded-2xl py-4 pl-12 pr-4 text-sm shadow-sm focus:ring-2 focus:ring-primary/20 transition-all font-medium"
          />
        </div>
      </div>

      {/* Desktop Hero Banner */}
      <div className="hidden lg:block relative h-64 rounded-[2.5rem] overflow-hidden group">
        <img 
          src="https://images.unsplash.com/photo-1513104890138-7c749659a591?w=1200&h=400&fit=crop" 
          alt="Hero" 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/90 to-transparent flex flex-col justify-center p-12 text-white">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h1 className="text-5xl font-black tracking-tight mb-2 uppercase">¡BIENVENIDO A SP!</h1>
            <p className="text-xl font-medium opacity-90">Todo lo que necesitas en tu ciudad.</p>
            <div className="flex gap-2 mt-6">
              {[1, 2, 3].map(i => (
                <div key={i} className={`w-2 h-2 rounded-full ${i === 1 ? 'bg-white' : 'bg-white/30'}`}></div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Categories */}
      <CategoryCards />

      {/* Promo Banners */}
      <PromoBanners />

      {/* Business List (passed as children) */}
      {children}
    </div>
  );
};

export default HomeView;
