import React from 'react';
import { motion } from 'motion/react';
import { UtensilsCrossed, Package, Zap, ShoppingCart } from 'lucide-react';

const categories = [
  { 
    id: 'restaurants', 
    title: 'RESTAURANTES', 
    subtitle: '(Menús)', 
    icon: UtensilsCrossed, 
    color: 'bg-orange-50', 
    iconColor: 'text-orange-500',
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=400&fit=crop'
  },
  { 
    id: 'shipping', 
    title: 'ENVÍOS', 
    subtitle: '(Paquetes)', 
    icon: Package, 
    color: 'bg-blue-50', 
    iconColor: 'text-blue-500',
    image: 'https://images.unsplash.com/photo-1586769852836-bc069f19e1b6?w=400&h=400&fit=crop'
  },
  { 
    id: 'errands', 
    title: 'MANDADOS', 
    subtitle: '(Hacer un favor)', 
    icon: Zap, 
    color: 'bg-yellow-50', 
    iconColor: 'text-yellow-500',
    image: 'https://images.unsplash.com/photo-1580913209323-64c255b86cae?w=400&h=400&fit=crop'
  },
  { 
    id: 'supermarket', 
    title: 'SÚPER & FARMACIA', 
    subtitle: '', 
    icon: ShoppingCart, 
    color: 'bg-emerald-50', 
    iconColor: 'text-emerald-500',
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&h=400&fit=crop'
  },
];

const CategoryCards = () => {
  return (
    <div>
      {/* Mobile: 2×2 grid */}
      <div className="grid grid-cols-2 gap-3 lg:hidden">
        {categories.map((cat) => (
          <motion.button
            key={cat.id}
            whileTap={{ scale: 0.97 }}
            className={`${cat.color} flex items-center gap-3 p-4 rounded-2xl border border-white/60 shadow-sm text-left`}
          >
            <div className="bg-white/70 p-2.5 rounded-xl flex-shrink-0">
              <cat.icon className={`w-6 h-6 ${cat.iconColor}`} />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-black text-gray-900 leading-tight">{cat.title}</span>
              {cat.subtitle && <span className="text-[11px] font-medium text-gray-500 truncate">{cat.subtitle}</span>}
            </div>
          </motion.button>
        ))}
      </div>

      {/* Desktop: 4-col row */}
      <div className="hidden lg:grid grid-cols-4 gap-4">
        {categories.map((cat) => (
          <motion.button
            key={cat.id}
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.98 }}
            className={`${cat.color} flex items-center gap-4 p-5 rounded-2xl border border-white/60 shadow-sm text-left transition-shadow hover:shadow-md`}
          >
            <div className="bg-white/70 p-3 rounded-xl flex-shrink-0">
              <cat.icon className={`w-7 h-7 ${cat.iconColor}`} />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-black text-gray-900 leading-tight">{cat.title}</span>
              {cat.subtitle && <span className="text-[11px] font-medium text-gray-500">{cat.subtitle}</span>}
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default CategoryCards;
